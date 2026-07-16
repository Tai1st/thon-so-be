import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Account, AccountDocument } from '../schemas/account.schema';
import { Resident, ResidentDocument } from '../schemas/resident.schema';
import { AssociationQuota, AssociationQuotaDocument } from '../schemas/association-quota.schema';
import { AdminAuditService } from './admin-audit.service';
import { CreateAssociationDto, RenameAssociationDto } from './dto/association.dto';

@Injectable()
export class AdminAssociationsService {
  constructor(
    @InjectModel(Account.name) private accountModel: Model<AccountDocument>,
    @InjectModel(Resident.name) private residentModel: Model<ResidentDocument>,
    @InjectModel(AssociationQuota.name) private associationQuotaModel: Model<AssociationQuotaDocument>,
    private auditService: AdminAuditService,
  ) {}

  async list(tenantId: Types.ObjectId) {
    const quotas = await this.associationQuotaModel.find({ tenantId }).sort({ name: 1 }).lean();
    const results = await Promise.all(
      quotas.map(async (q) => {
        const [memberCount, leader] = await Promise.all([
          this.residentModel.countDocuments({ tenantId, association: q.name }),
          this.accountModel.findOne({ tenantId, role: 'association-officer', assoc: q.name }).lean(),
        ]);
        return {
          name: q.name,
          balance: q.balance,
          memberCount,
          leaderName: leader?.name || null,
        };
      }),
    );
    return results;
  }

  async create(tenantId: Types.ObjectId, dto: CreateAssociationDto) {
    const exists = await this.associationQuotaModel.exists({ tenantId, name: dto.name });
    if (exists) throw new BadRequestException('Tên chi hội này đã tồn tại trên hệ thống.');

    await this.associationQuotaModel.create({ tenantId, name: dto.name, balance: dto.balance, txs: [], loans: [] });

    await this.auditService.log(
      tenantId,
      'Tạo chi hội mới',
      `Admin thành lập chi hội mới "${dto.name}" với số dư ban đầu ${dto.balance.toLocaleString('vi-VN')} đ.`,
      'Admin',
    );
    return { created: true };
  }

  async rename(tenantId: Types.ObjectId, name: string, dto: RenameAssociationDto) {
    const newName = dto.newName.trim();
    if (newName === name) return { renamed: true };

    const quota = await this.associationQuotaModel.findOne({ tenantId, name });
    if (!quota) throw new NotFoundException('Không tìm thấy chi hội này.');

    const nameTaken = await this.associationQuotaModel.exists({ tenantId, name: newName });
    if (nameTaken) throw new BadRequestException('Tên chi hội mới bị trùng với một hội đang hoạt động.');

    quota.name = newName;
    await quota.save();

    await Promise.all([
      this.residentModel.updateMany({ tenantId, association: name }, { $set: { association: newName } }),
      this.accountModel.updateMany({ tenantId, assoc: name }, { $set: { assoc: newName } }),
    ]);

    await this.auditService.log(
      tenantId,
      'Thay đổi tên chi hội',
      `Admin đổi tên chi hội từ "${name}" sang "${newName}".`,
      'Admin',
    );
    return { renamed: true };
  }

  async dissolve(tenantId: Types.ObjectId, name: string) {
    const quota = await this.associationQuotaModel.findOneAndDelete({ tenantId, name });
    if (!quota) throw new NotFoundException('Không tìm thấy chi hội này.');

    await Promise.all([
      this.residentModel.updateMany({ tenantId, association: name }, { $set: { association: 'None' } }),
      this.accountModel.updateMany({ tenantId, assoc: name }, { $unset: { assoc: '' } }),
    ]);

    await this.auditService.log(
      tenantId,
      'Giải thể chi hội',
      `Admin giải thể và xóa vĩnh viễn chi hội "${name}" khỏi hệ thống.`,
      'Admin',
    );
    return { dissolved: true };
  }
}
