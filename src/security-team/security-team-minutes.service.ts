import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Account, AccountDocument } from '../schemas/account.schema';
import { IncidentMinutes, IncidentMinutesDocument } from '../schemas/incident.schema';
import { AdminAuditService } from '../admin/admin-audit.service';
import { CreateIncidentMinutesDto } from './dto/create-incident-minutes.dto';

function nowDisplay(): string {
  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

@Injectable()
export class SecurityTeamMinutesService {
  constructor(
    @InjectModel(Account.name) private accountModel: Model<AccountDocument>,
    @InjectModel(IncidentMinutes.name) private incidentMinutesModel: Model<IncidentMinutesDocument>,
    private auditService: AdminAuditService,
  ) {}

  async list(tenantId: Types.ObjectId) {
    return this.incidentMinutesModel.find({ tenantId }).sort({ _id: -1 }).lean();
  }

  async create(tenantId: Types.ObjectId, accountId: string, dto: CreateIncidentMinutesDto) {
    const account = await this.accountModel.findOne({ _id: accountId, tenantId }).lean();
    const createdBy = account?.name ?? 'Tổ ANTT';

    const minutes = await this.incidentMinutesModel.create({
      tenantId,
      relatedReportId: dto.relatedReportId || null,
      title: dto.title,
      location: dto.location ?? '',
      involvedPeople: dto.involvedPeople ?? '',
      content: dto.content,
      createdBy,
      time: nowDisplay(),
    });

    await this.auditService.log(tenantId, 'Lập biên bản sự việc', `${createdBy} lập biên bản "${dto.title}".`, createdBy);
    return minutes;
  }

  async delete(tenantId: Types.ObjectId, accountId: string, id: string) {
    const account = await this.accountModel.findOne({ _id: accountId, tenantId }).lean();
    const actor = account?.name ?? 'Tổ ANTT';

    const minutes = await this.incidentMinutesModel.findOneAndDelete({ _id: id, tenantId });
    if (!minutes) throw new NotFoundException('Không tìm thấy biên bản này.');

    await this.auditService.log(tenantId, 'Xóa biên bản sự việc', `${actor} xóa biên bản "${minutes.title}".`, actor);
    return { id };
  }
}
