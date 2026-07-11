import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Account, AccountDocument } from '../schemas/account.schema';
import { Resident, ResidentDocument } from '../schemas/resident.schema';
import {
  MemberEditRequest,
  MemberEditRequestDocument,
  NewMemberRequest,
  NewMemberRequestDocument,
} from '../schemas/requests.schema';
import { CreateMemberEditRequestDto } from './dto/create-member-edit-request.dto';
import { CreateNewMemberRequestDto } from './dto/create-new-member-request.dto';

function nowDisplay(): string {
  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

@Injectable()
export class RequestsService {
  constructor(
    @InjectModel(Account.name) private accountModel: Model<AccountDocument>,
    @InjectModel(Resident.name) private residentModel: Model<ResidentDocument>,
    @InjectModel(MemberEditRequest.name)
    private memberEditRequestModel: Model<MemberEditRequestDocument>,
    @InjectModel(NewMemberRequest.name)
    private newMemberRequestModel: Model<NewMemberRequestDocument>,
  ) {}

  private async requireAccount(tenantId: Types.ObjectId, accountId: string) {
    const account = await this.accountModel.findOne({ _id: accountId, tenantId });
    if (!account) throw new NotFoundException('Không tìm thấy tài khoản.');
    return account;
  }

  // Cư dân chỉ được ĐỀ NGHỊ sửa thông tin — request nằm ở trạng thái
  // "pending" cho tới khi Admin duyệt (mục 8 tài liệu thiết kế), không ghi
  // trực tiếp vào Resident.
  async createMemberEditRequest(
    tenantId: Types.ObjectId,
    accountId: string,
    dto: CreateMemberEditRequestDto,
  ) {
    const account = await this.requireAccount(tenantId, accountId);
    const resident = await this.residentModel.findOne({ _id: dto.residentId, tenantId });
    if (!resident) throw new NotFoundException('Không tìm thấy nhân khẩu này.');

    const oldValues = {
      name: resident.name,
      relation: resident.relation || '',
      dob: resident.dob,
      cccd: resident.cccd,
      gender: resident.gender || '',
      phone: resident.phone || '',
      fatherName: resident.fatherName || '',
      motherName: resident.motherName || '',
      group: resident.group || '',
      permanentAddress: resident.permanentAddress || '',
      temporaryAddress: resident.temporaryAddress || '',
    };

    return this.memberEditRequestModel.create({
      tenantId,
      residentId: String(resident._id),
      residentName: resident.name,
      submittedBy: account.name,
      status: 'pending',
      time: nowDisplay(),
      oldValues,
      newValues: dto.newValues,
    });
  }

  async createNewMemberRequest(
    tenantId: Types.ObjectId,
    accountId: string,
    dto: CreateNewMemberRequestDto,
  ) {
    const account = await this.requireAccount(tenantId, accountId);
    if (!account.residentId) {
      throw new NotFoundException('Tài khoản này chưa gắn với hộ gia đình nào.');
    }
    const resident = await this.residentModel.findOne({ _id: account.residentId, tenantId });
    if (!resident) throw new NotFoundException('Không tìm thấy nhân khẩu gắn với tài khoản.');

    return this.newMemberRequestModel.create({
      tenantId,
      familyId: resident.familyId,
      submittedBy: account.name,
      status: 'pending',
      time: nowDisplay(),
      ...dto,
    });
  }

  async getMine(tenantId: Types.ObjectId, accountId: string) {
    const account = await this.requireAccount(tenantId, accountId);
    const [memberEditRequests, newMemberRequests] = await Promise.all([
      this.memberEditRequestModel.find({ tenantId, submittedBy: account.name }).sort({ _id: -1 }).lean(),
      this.newMemberRequestModel.find({ tenantId, submittedBy: account.name }).sort({ _id: -1 }).lean(),
    ]);
    return { memberEditRequests, newMemberRequests };
  }
}
