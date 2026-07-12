import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Account, AccountDocument } from '../schemas/account.schema';
import { Resident, ResidentDocument } from '../schemas/resident.schema';
import {
  IncidentReport,
  IncidentReportDocument,
  ResidenceRegistration,
  ResidenceRegistrationDocument,
} from '../schemas/incident.schema';
import { CreateIncidentReportDto } from './dto/create-incident-report.dto';
import { CreateResidenceRegistrationDto } from './dto/create-residence-registration.dto';

function nowDisplay(): string {
  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

@Injectable()
export class IncidentsService {
  constructor(
    @InjectModel(Account.name) private accountModel: Model<AccountDocument>,
    @InjectModel(Resident.name) private residentModel: Model<ResidentDocument>,
    @InjectModel(IncidentReport.name) private incidentReportModel: Model<IncidentReportDocument>,
    @InjectModel(ResidenceRegistration.name)
    private residenceRegistrationModel: Model<ResidenceRegistrationDocument>,
  ) {}

  private async resolveFamilyIdAndName(
    tenantId: Types.ObjectId,
    accountId: string,
  ): Promise<{ familyId: string; name: string }> {
    const account = await this.accountModel.findOne({ _id: accountId, tenantId });
    if (!account?.residentId) {
      throw new NotFoundException('Tài khoản này chưa gắn với hộ gia đình nào.');
    }
    const resident = await this.residentModel.findOne({ _id: account.residentId, tenantId });
    if (!resident) {
      throw new NotFoundException('Không tìm thấy nhân khẩu gắn với tài khoản.');
    }
    return { familyId: resident.familyId, name: account.name };
  }

  async createIncidentReport(
    tenantId: Types.ObjectId,
    accountId: string,
    dto: CreateIncidentReportDto,
  ) {
    const { familyId, name } = await this.resolveFamilyIdAndName(tenantId, accountId);
    return this.incidentReportModel.create({
      tenantId,
      familyId,
      reporterName: name,
      content: dto.content,
      locationText: dto.locationText ?? '',
      lat: dto.lat ?? null,
      lng: dto.lng ?? null,
      status: 'Mới',
      time: nowDisplay(),
    });
  }

  async getMyIncidentReports(tenantId: Types.ObjectId, accountId: string) {
    const { familyId } = await this.resolveFamilyIdAndName(tenantId, accountId);
    return this.incidentReportModel.find({ tenantId, familyId }).sort({ _id: -1 }).lean();
  }

  async createResidenceRegistration(
    tenantId: Types.ObjectId,
    accountId: string,
    dto: CreateResidenceRegistrationDto,
  ) {
    const { familyId, name } = await this.resolveFamilyIdAndName(tenantId, accountId);
    return this.residenceRegistrationModel.create({
      tenantId,
      familyId,
      hostName: name,
      guestName: dto.guestName,
      guestCccd: dto.guestCccd ?? '',
      relationship: dto.relationship,
      reason: dto.reason ?? '',
      fromDate: dto.fromDate,
      toDate: dto.toDate,
      status: 'Chờ duyệt',
      submittedBy: name,
      time: nowDisplay(),
    });
  }

  async getMyResidenceRegistrations(tenantId: Types.ObjectId, accountId: string) {
    const { familyId } = await this.resolveFamilyIdAndName(tenantId, accountId);
    return this.residenceRegistrationModel.find({ tenantId, familyId }).sort({ _id: -1 }).lean();
  }
}
