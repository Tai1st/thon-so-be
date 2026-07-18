import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Account, AccountDocument } from '../schemas/account.schema';
import { IncidentMinutes, IncidentMinutesDocument } from '../schemas/incident.schema';
import { AdminAuditService } from '../admin/admin-audit.service';
import { CreateIncidentMinutesDto } from './dto/create-incident-minutes.dto';
import { UpdateIncidentMinutesDto } from './dto/update-incident-minutes.dto';

function nowDisplay(): string {
  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

// Dùng chung cho cả create/update — cùng 1 tập trường, chỉ khác record đã
// tồn tại hay chưa.
function buildMinutesFields(dto: CreateIncidentMinutesDto | UpdateIncidentMinutesDto) {
  return {
    code: dto.code ?? '',
    title: dto.title,
    recordTime: dto.recordTime ?? '',
    recordLocation: dto.recordLocation ?? '',
    anttRepresentatives: (dto.anttRepresentatives ?? []).map((r) => ({ name: r.name, position: r.position ?? '' })),
    reporter: {
      name: dto.reporter?.name ?? '',
      dob: dto.reporter?.dob ?? '',
      cccd: dto.reporter?.cccd ?? '',
      address: dto.reporter?.address ?? '',
      phone: dto.reporter?.phone ?? '',
    },
    involvedPeople: (dto.involvedPeople ?? []).map((p) => ({ name: p.name, address: p.address ?? '', role: p.role ?? '' })),
    incidentTime: dto.incidentTime ?? '',
    incidentLocation: dto.incidentLocation ?? '',
    incidentTypes: dto.incidentTypes ?? [],
    incidentTypeOther: dto.incidentTypeOther ?? '',
    content: dto.content,
    damage: {
      people: dto.damage?.people ?? '',
      property: dto.damage?.property ?? '',
      other: dto.damage?.other ?? '',
    },
    verificationResult: dto.verificationResult ?? '',
    verificationNote: dto.verificationNote ?? '',
    opinions: {
      reporter: dto.opinions?.reporter ?? '',
      involved: dto.opinions?.involved ?? '',
      witness: dto.opinions?.witness ?? '',
    },
    recommendations: dto.recommendations ?? [],
    recommendationOther: dto.recommendationOther ?? '',
    copies: dto.copies ?? 2,
    imageUrls: dto.imageUrls ?? [],
  };
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
      ...buildMinutesFields(dto),
      createdBy,
      time: nowDisplay(),
    });

    await this.auditService.log(tenantId, 'Lập biên bản sự việc', `${createdBy} lập biên bản "${dto.title}".`, createdBy);
    return minutes;
  }

  async update(tenantId: Types.ObjectId, accountId: string, id: string, dto: UpdateIncidentMinutesDto) {
    const account = await this.accountModel.findOne({ _id: accountId, tenantId }).lean();
    const actor = account?.name ?? 'Tổ ANTT';

    const minutes = await this.incidentMinutesModel.findOne({ _id: id, tenantId });
    if (!minutes) throw new NotFoundException('Không tìm thấy biên bản này.');

    minutes.relatedReportId = dto.relatedReportId ? new Types.ObjectId(dto.relatedReportId) : null;
    Object.assign(minutes, buildMinutesFields(dto));
    await minutes.save();

    await this.auditService.log(tenantId, 'Sửa biên bản sự việc', `${actor} sửa biên bản "${dto.title}".`, actor);
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
