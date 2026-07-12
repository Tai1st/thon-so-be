import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Account, AccountDocument } from '../schemas/account.schema';
import { Resident, ResidentDocument } from '../schemas/resident.schema';
import { AdminAuditService } from '../admin/admin-audit.service';
import { AddMemberDto } from './dto/add-member.dto';
import { EditMemberPhoneDto } from './dto/edit-member-phone.dto';

@Injectable()
export class AssociationOfficerMembersService {
  constructor(
    @InjectModel(Account.name) private accountModel: Model<AccountDocument>,
    @InjectModel(Resident.name) private residentModel: Model<ResidentDocument>,
    private auditService: AdminAuditService,
  ) {}

  private async requireAccount(tenantId: Types.ObjectId, accountId: string) {
    const account = await this.accountModel.findOne({ _id: accountId, tenantId });
    if (!account?.assoc) throw new BadRequestException('Tài khoản này chưa được gán phụ trách hội nào.');
    return account;
  }

  async list(tenantId: Types.ObjectId, accountId: string) {
    const account = await this.requireAccount(tenantId, accountId);
    const [members, nonMembers] = await Promise.all([
      this.residentModel.find({ tenantId, association: account.assoc }).sort({ name: 1 }).lean(),
      this.residentModel.find({ tenantId, association: { $ne: account.assoc } }).sort({ name: 1 }).lean(),
    ]);
    return { association: account.assoc, members, nonMembers };
  }

  async addMember(tenantId: Types.ObjectId, accountId: string, dto: AddMemberDto) {
    const account = await this.requireAccount(tenantId, accountId);
    const resident = await this.residentModel.findOne({
      tenantId,
      name: dto.name,
      association: { $ne: account.assoc },
    });
    if (!resident) throw new BadRequestException('Vui lòng chọn một cư dân hợp lệ từ danh sách gợi ý.');

    resident.association = account.assoc!;
    await resident.save();

    await this.auditService.log(
      tenantId,
      'Thêm hội viên',
      `Nhân khẩu ${resident.name} được thêm vào ${account.assoc}.`,
      account.name,
    );
    return resident;
  }

  async removeMember(tenantId: Types.ObjectId, accountId: string, residentId: string) {
    const account = await this.requireAccount(tenantId, accountId);
    const resident = await this.residentModel.findOne({ _id: residentId, tenantId, association: account.assoc });
    if (!resident) throw new NotFoundException('Không tìm thấy hội viên này.');
    if (account.residentId && String(account.residentId) === String(resident._id)) {
      throw new BadRequestException('Bạn không thể tự gỡ chính mình khỏi hội nhóm.');
    }

    resident.association = 'None';
    await resident.save();

    await this.auditService.log(
      tenantId,
      'Xóa hội viên',
      `Nhân khẩu ${resident.name} bị loại khỏi ${account.assoc}.`,
      account.name,
    );
    return resident;
  }

  async editMemberPhone(tenantId: Types.ObjectId, accountId: string, residentId: string, dto: EditMemberPhoneDto) {
    const account = await this.requireAccount(tenantId, accountId);
    const resident = await this.residentModel.findOne({ _id: residentId, tenantId, association: account.assoc });
    if (!resident) throw new NotFoundException('Không tìm thấy hội viên này.');

    resident.phone = dto.phone ?? '';
    await resident.save();

    await this.auditService.log(
      tenantId,
      'Cập nhật số điện thoại',
      `Cán bộ ${account.name} cập nhật số điện thoại của ${resident.name} thành "${resident.phone}".`,
      account.name,
    );
    return resident;
  }
}
