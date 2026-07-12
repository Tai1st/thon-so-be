import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Account, AccountDocument } from '../schemas/account.schema';
import { Resident, ResidentDocument } from '../schemas/resident.schema';
import { IncidentReport, IncidentReportDocument, ResidenceRegistration, ResidenceRegistrationDocument } from '../schemas/incident.schema';
import { AdminAuditService } from '../admin/admin-audit.service';
import { UpdateIncidentStatusDto } from './dto/update-incident-status.dto';
import { DecideResidenceDto } from './dto/decide-residence.dto';

@Injectable()
export class SecurityTeamReportsService {
  constructor(
    @InjectModel(Account.name) private accountModel: Model<AccountDocument>,
    @InjectModel(Resident.name) private residentModel: Model<ResidentDocument>,
    @InjectModel(IncidentReport.name) private incidentReportModel: Model<IncidentReportDocument>,
    @InjectModel(ResidenceRegistration.name)
    private residenceRegistrationModel: Model<ResidenceRegistrationDocument>,
    private auditService: AdminAuditService,
  ) {}

  private async resolveAccountName(tenantId: Types.ObjectId, accountId: string): Promise<string> {
    const account = await this.accountModel.findOne({ _id: accountId, tenantId }).lean();
    return account?.name ?? 'Tổ ANTT';
  }

  // Tin báo hiện Họ tên chủ hộ (không phải reporterName thô) khi tìm được
  // nhân khẩu isHouseholder cùng familyId, khớp renderAnttTinBao() bản mẫu.
  async listIncidentReports(tenantId: Types.ObjectId): Promise<(IncidentReport & { headName: string })[]> {
    const reports = await this.incidentReportModel.find({ tenantId }).sort({ _id: -1 }).lean();
    const familyIds = [...new Set(reports.map((r) => r.familyId))];
    const heads = await this.residentModel.find({ tenantId, familyId: { $in: familyIds } }).lean();
    const headByFamilyId = new Map<string, string>();
    heads.forEach((h) => {
      if (h.isHouseholder || !headByFamilyId.has(h.familyId)) headByFamilyId.set(h.familyId, h.name);
    });
    return reports.map((r) => ({ ...r, headName: headByFamilyId.get(r.familyId) ?? r.reporterName }));
  }

  async updateIncidentStatus(tenantId: Types.ObjectId, id: string, dto: UpdateIncidentStatusDto, accountId: string) {
    const actor = await this.resolveAccountName(tenantId, accountId);
    const report = await this.incidentReportModel.findOneAndUpdate(
      { _id: id, tenantId },
      { $set: { status: dto.status } },
      { new: true },
    );
    if (!report) throw new NotFoundException('Không tìm thấy tin báo này.');
    await this.auditService.log(
      tenantId,
      'Xử lý tin báo ANTT',
      `${actor} cập nhật tin báo "${report.content}" sang trạng thái "${dto.status}".`,
      actor,
    );
    return report;
  }

  async listResidenceRegistrations(tenantId: Types.ObjectId) {
    return this.residenceRegistrationModel.find({ tenantId }).sort({ _id: -1 }).lean();
  }

  async decideResidenceRegistration(tenantId: Types.ObjectId, id: string, dto: DecideResidenceDto, accountId: string) {
    const actor = await this.resolveAccountName(tenantId, accountId);
    const req = await this.residenceRegistrationModel.findOneAndUpdate(
      { _id: id, tenantId, status: 'Chờ duyệt' },
      { $set: { status: dto.status } },
      { new: true },
    );
    if (!req) throw new NotFoundException('Không tìm thấy đăng ký lưu trú đang chờ duyệt này.');
    await this.auditService.log(
      tenantId,
      'Duyệt lưu trú',
      `${actor} ${dto.status === 'Đã duyệt' ? 'phê duyệt' : 'từ chối'} đăng ký lưu trú của ${req.guestName} (hộ ${req.familyId}).`,
      actor,
    );
    return req;
  }
}
