import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Account, AccountDocument } from '../schemas/account.schema';
import { Resident, ResidentDocument } from '../schemas/resident.schema';
import {
  Household,
  HouseholdDocument,
  VillageFund,
  VillageFundDocument,
} from '../schemas/household.schema';

function nowDisplay(): string {
  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()} (QR)`;
}

@Injectable()
export class HouseholdsService {
  constructor(
    @InjectModel(Account.name) private accountModel: Model<AccountDocument>,
    @InjectModel(Resident.name) private residentModel: Model<ResidentDocument>,
    @InjectModel(Household.name) private householdModel: Model<HouseholdDocument>,
    @InjectModel(VillageFund.name) private villageFundModel: Model<VillageFundDocument>,
  ) {}

  // Mọi thao tác "hộ gia đình của tôi" đều xuất phát từ Account.residentId
  // (mục 6.2 tài liệu thiết kế) -> Resident.familyId -> mọi thành viên cùng
  // familyId. Không có residentId nghĩa là tài khoản chưa gắn với nhân khẩu
  // nào (vd tài khoản Admin hệ thống) -> không có hộ gia đình.
  private async resolveFamilyId(tenantId: Types.ObjectId, accountId: string): Promise<string> {
    const account = await this.accountModel.findOne({ _id: accountId, tenantId });
    if (!account?.residentId) {
      throw new NotFoundException('Tài khoản này chưa gắn với hộ gia đình nào.');
    }
    const resident = await this.residentModel.findOne({ _id: account.residentId, tenantId });
    if (!resident) {
      throw new NotFoundException('Không tìm thấy nhân khẩu gắn với tài khoản.');
    }
    return resident.familyId;
  }

  async getMine(tenantId: Types.ObjectId, accountId: string) {
    const familyId = await this.resolveFamilyId(tenantId, accountId);
    const [members, household] = await Promise.all([
      this.residentModel.find({ tenantId, familyId }).sort({ isHouseholder: -1, name: 1 }).lean(),
      this.householdModel.findOne({ tenantId, familyId }).lean(),
    ]);

    return {
      familyId,
      members,
      gpsCoord: household?.gpsCoord ?? null,
      houseNumber: household?.houseNumber ?? '',
      fundObligations: household?.fundObligations ?? [],
    };
  }

  async updateGps(tenantId: Types.ObjectId, accountId: string, lat: number, lng: number) {
    const familyId = await this.resolveFamilyId(tenantId, accountId);
    const household = await this.householdModel.findOneAndUpdate(
      { tenantId, familyId },
      { $set: { gpsCoord: { lat, lng } } },
      { upsert: true, new: true },
    );
    return { familyId, gpsCoord: household.gpsCoord };
  }

  async updateHouseNumber(tenantId: Types.ObjectId, accountId: string, houseNumber: string) {
    const familyId = await this.resolveFamilyId(tenantId, accountId);
    const household = await this.householdModel.findOneAndUpdate(
      { tenantId, familyId },
      { $set: { houseNumber } },
      { upsert: true, new: true },
    );
    return { familyId, houseNumber: household.houseNumber };
  }

  // Công khai Quỹ Thôn toàn xã (Thu/Chi) — độc lập với fundObligations
  // riêng từng hộ, 1 doc/tenant (mục "Quỹ Thôn" tài liệu thiết kế).
  async getVillageFund(tenantId: Types.ObjectId) {
    const fund = await this.villageFundModel.findOne({ tenantId }).lean();
    return {
      thu: fund?.thu ?? [],
      chi: fund?.chi ?? [],
      unpaidHouseholds: fund?.unpaidHouseholds ?? 0,
      totalHouseholds: fund?.totalHouseholds ?? 0,
      bankInfo: fund?.bankInfo ?? { bankName: '', accountNumber: '', accountHolder: '' },
    };
  }

  // Cư dân báo đã chuyển khoản một khoản đóng góp nghĩa vụ của hộ mình ->
  // chuyển sang "Chờ duyệt" cho tới khi Trưởng thôn xác nhận (chưa làm ở
  // giai đoạn này), khớp hành vi confirmSimulatedResidentPayment() bản gốc.
  async payFundObligation(tenantId: Types.ObjectId, accountId: string, obligationId: string) {
    const familyId = await this.resolveFamilyId(tenantId, accountId);
    const household = await this.householdModel.findOne({ tenantId, familyId });
    const obligation = household?.fundObligations.find((f) => f.id === obligationId);
    if (!household || !obligation) {
      throw new NotFoundException('Không tìm thấy khoản đóng góp này.');
    }
    obligation.status = 'Chờ duyệt';
    obligation.date = nowDisplay();
    await household.save();
    return { familyId, fundObligations: household.fundObligations };
  }
}
