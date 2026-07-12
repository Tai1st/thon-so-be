import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { Resident, ResidentDocument } from '../schemas/resident.schema';
import { Account, AccountDocument } from '../schemas/account.schema';
import { Tenant, TenantDocument } from '../schemas/tenant.schema';
import {
  DeleteRequest,
  DeleteRequestDocument,
  MemberEditRequest,
  MemberEditRequestDocument,
  NewMemberRequest,
  NewMemberRequestDocument,
} from '../schemas/requests.schema';
import { AdminAuditService } from './admin-audit.service';

@Injectable()
export class AdminRequestsService {
  constructor(
    @InjectModel(Resident.name) private residentModel: Model<ResidentDocument>,
    @InjectModel(Account.name) private accountModel: Model<AccountDocument>,
    @InjectModel(Tenant.name) private tenantModel: Model<TenantDocument>,
    @InjectModel(DeleteRequest.name) private deleteRequestModel: Model<DeleteRequestDocument>,
    @InjectModel(MemberEditRequest.name) private memberEditRequestModel: Model<MemberEditRequestDocument>,
    @InjectModel(NewMemberRequest.name) private newMemberRequestModel: Model<NewMemberRequestDocument>,
    private auditService: AdminAuditService,
  ) {}

  async listPending(tenantId: Types.ObjectId) {
    const [deleteRequests, memberEditRequests, newMemberRequests] = await Promise.all([
      this.deleteRequestModel.find({ tenantId, status: 'pending' }).sort({ _id: -1 }).lean(),
      this.memberEditRequestModel.find({ tenantId, status: 'pending' }).sort({ _id: -1 }).lean(),
      this.newMemberRequestModel.find({ tenantId, status: 'pending' }).sort({ _id: -1 }).lean(),
    ]);
    return { deleteRequests, memberEditRequests, newMemberRequests };
  }

  // Cấp tài khoản "resident" (username = CCCD) khi hồ sơ được duyệt — chỉ
  // khi đã có CCCD hợp lệ và chưa có tài khoản cùng tên, khớp
  // createResidentAccount() bản mẫu.
  private async createResidentAccount(
    tenantId: Types.ObjectId,
    resident: { name: string; cccd?: string; residentId: Types.ObjectId },
  ): Promise<boolean> {
    if (!resident.cccd) return false;
    const existing = await this.accountModel.findOne({ tenantId, username: resident.cccd });
    if (existing) return false;

    const tenant = await this.tenantModel.findById(tenantId).lean();
    const passwordHash = await bcrypt.hash(tenant?.slug || 'doanket', 10);
    await this.accountModel.create({
      tenantId,
      residentId: resident.residentId,
      username: resident.cccd,
      passwordHash,
      name: resident.name,
      role: 'resident',
      position: '',
      status: 'active',
    });
    return true;
  }

  async approveDeleteRequest(tenantId: Types.ObjectId, id: string) {
    const req = await this.deleteRequestModel.findOne({ _id: id, tenantId, status: 'pending' });
    if (!req) throw new NotFoundException('Không tìm thấy yêu cầu này.');

    req.status = 'approved';
    await req.save();

    const resident = await this.residentModel.findOneAndDelete({ _id: req.residentId, tenantId });
    if (resident) {
      await this.accountModel.deleteOne({ tenantId, residentId: resident._id });
    }

    await this.auditService.log(
      tenantId,
      'Phê duyệt xóa',
      `Admin phê duyệt yêu cầu xóa nhân khẩu ${req.residentName} khỏi hệ thống dữ liệu.`,
      'Admin',
    );
    return req;
  }

  async rejectDeleteRequest(tenantId: Types.ObjectId, id: string) {
    const req = await this.deleteRequestModel.findOneAndUpdate(
      { _id: id, tenantId, status: 'pending' },
      { $set: { status: 'rejected' } },
      { new: true },
    );
    if (!req) throw new NotFoundException('Không tìm thấy yêu cầu này.');
    await this.auditService.log(
      tenantId,
      'Từ chối yêu cầu xóa',
      `Admin từ chối đề xuất xóa cư dân ${req.residentName}.`,
      'Admin',
    );
    return req;
  }

  async approveMemberEditRequest(tenantId: Types.ObjectId, id: string) {
    const req = await this.memberEditRequestModel.findOne({ _id: id, tenantId, status: 'pending' });
    if (!req) throw new NotFoundException('Không tìm thấy yêu cầu này.');

    const resident = await this.residentModel.findOne({ _id: req.residentId, tenantId });
    if (resident) {
      Object.assign(resident, req.newValues);
      await resident.save();
    }

    req.status = 'approved';
    await req.save();

    await this.auditService.log(
      tenantId,
      'Phê duyệt sửa thông tin',
      `Admin phê duyệt thay đổi thông tin của ${req.residentName}.`,
      'Admin',
    );
    return req;
  }

  async rejectMemberEditRequest(tenantId: Types.ObjectId, id: string) {
    const req = await this.memberEditRequestModel.findOneAndUpdate(
      { _id: id, tenantId, status: 'pending' },
      { $set: { status: 'rejected' } },
      { new: true },
    );
    if (!req) throw new NotFoundException('Không tìm thấy yêu cầu này.');
    await this.auditService.log(
      tenantId,
      'Từ chối yêu cầu sửa thông tin',
      `Admin từ chối yêu cầu sửa thông tin của ${req.residentName}.`,
      'Admin',
    );
    return req;
  }

  async approveNewMemberRequest(tenantId: Types.ObjectId, id: string) {
    const req = await this.newMemberRequestModel.findOne({ _id: id, tenantId, status: 'pending' });
    if (!req) throw new NotFoundException('Không tìm thấy yêu cầu này.');

    const resident = await this.residentModel.create({
      tenantId,
      name: req.name,
      dob: req.dob,
      gender: 'unknown',
      cccd: req.cccd || '',
      phone: req.phone || '',
      relation: req.relation,
      isHouseholder: false,
      familyId: req.familyId,
      permanentAddress: req.permanentAddress || '',
      temporaryAddress: req.temporaryAddress || '',
      group: req.group || 'Khác',
      fatherName: req.fatherName || '',
      motherName: req.motherName || '',
    });

    const accountCreated = await this.createResidentAccount(tenantId, {
      name: resident.name,
      cccd: resident.cccd,
      residentId: resident._id as Types.ObjectId,
    });

    req.status = 'approved';
    await req.save();

    await this.auditService.log(
      tenantId,
      'Phê duyệt thêm thành viên',
      `Admin phê duyệt thêm thành viên mới "${req.name}" (${req.relation}) vào hộ ${req.familyId}.${accountCreated ? ' Đã tự động cấp tài khoản đăng nhập.' : ''}`,
      'Admin',
    );
    return req;
  }

  async rejectNewMemberRequest(tenantId: Types.ObjectId, id: string) {
    const req = await this.newMemberRequestModel.findOneAndUpdate(
      { _id: id, tenantId, status: 'pending' },
      { $set: { status: 'rejected' } },
      { new: true },
    );
    if (!req) throw new NotFoundException('Không tìm thấy yêu cầu này.');
    await this.auditService.log(
      tenantId,
      'Từ chối yêu cầu thêm thành viên',
      `Admin từ chối yêu cầu thêm thành viên "${req.name}" vào hộ ${req.familyId}.`,
      'Admin',
    );
    return req;
  }
}
