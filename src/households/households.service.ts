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
import { AssociationQuota, AssociationQuotaDocument } from '../schemas/association-quota.schema';

export interface MemberFundEntry {
  id: string;
  name: string;
  period: string;
  amount: number;
  status: 'Đã đóng' | 'Chưa đóng' | 'Chờ duyệt';
  date: string;
  memo: string;
}

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
    @InjectModel(AssociationQuota.name) private associationQuotaModel: Model<AssociationQuotaDocument>,
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

  private async resolveResident(tenantId: Types.ObjectId, accountId: string) {
    const account = await this.accountModel.findOne({ _id: accountId, tenantId });
    if (!account?.residentId) {
      throw new NotFoundException('Tài khoản này chưa gắn với hộ gia đình nào.');
    }
    const resident = await this.residentModel.findOne({ _id: account.residentId, tenantId });
    if (!resident) {
      throw new NotFoundException('Không tìm thấy nhân khẩu gắn với tài khoản.');
    }
    return resident;
  }

  // "Hội đoàn thể của tôi" — bất kỳ vai trò nào (Cư dân/Trưởng thôn/Tổ
  // ANTT/Cán bộ Hội) cũng có thể tự mình là hội viên của 1 hội (khác với
  // vai trò "Cán bộ Hội" phụ trách quản lý 1 hội — 2 khái niệm độc lập).
  // Chỉ đọc thông tin quỹ hội (thu/chi, ngân hàng) + nghĩa vụ hội phí CỦA
  // CHÍNH NGƯỜI ĐÓ, không có quyền chỉnh sửa (đó thuộc Cán bộ Hội).
  async getMyAssociation(tenantId: Types.ObjectId, accountId: string) {
    const resident = await this.resolveResident(tenantId, accountId);
    if (!resident.association || resident.association === 'None') {
      throw new NotFoundException('Bạn chưa tham gia hội đoàn thể nào.');
    }

    const quota = await this.associationQuotaModel.findOne({ tenantId, name: resident.association });
    const leader = await this.accountModel
      .findOne({ tenantId, role: 'association-officer', assoc: resident.association })
      .lean();

    const residentId = String(resident._id);
    const myFees = ((quota?.memberFunds.get(residentId) as MemberFundEntry[]) || []) as MemberFundEntry[];
    const thuItems = (quota?.txs || []).filter((t) => t.type === 'Thu');
    const chiItems = (quota?.txs || []).filter((t) => t.type === 'Chi');
    const thuTotal = thuItems.reduce((s, t) => s + t.amount, 0);
    const chiTotal = chiItems.reduce((s, t) => s + t.amount, 0);

    return {
      association: resident.association,
      leaderName: leader?.name ?? null,
      thuTotal,
      chiTotal,
      bankInfo: quota?.bankInfo ?? { bankName: '', accountNumber: '', accountHolder: '' },
      myFees,
      thuItems: thuItems.map((t) => ({ member: t.member ?? null, desc: t.desc, amount: t.amount })),
      chiItems: chiItems.map((t) => ({ desc: t.desc, date: t.date, amount: t.amount })),
    };
  }

  // Cư dân báo đã chuyển khoản hội phí -> chuyển "Chờ duyệt" cho tới khi
  // Cán bộ Hội xác nhận (khớp payFundObligation() cho quỹ thôn, và khớp
  // AssociationOfficerFundService.approvePayment() phía duyệt).
  async payMyAssociationFee(tenantId: Types.ObjectId, accountId: string, feeId: string) {
    const resident = await this.resolveResident(tenantId, accountId);
    if (!resident.association || resident.association === 'None') {
      throw new NotFoundException('Bạn chưa tham gia hội đoàn thể nào.');
    }
    const quota = await this.associationQuotaModel.findOne({ tenantId, name: resident.association });
    if (!quota) throw new NotFoundException('Không tìm thấy quỹ hội này.');

    const residentId = String(resident._id);
    const entries = ((quota.memberFunds.get(residentId) as MemberFundEntry[]) || []).slice();
    const entry = entries.find((f) => f.id === feeId && f.status === 'Chưa đóng');
    if (!entry) throw new NotFoundException('Không tìm thấy khoản hội phí này.');

    entry.status = 'Chờ duyệt';
    entry.date = nowDisplay();
    quota.memberFunds.set(residentId, entries);
    quota.markModified('memberFunds');
    await quota.save();

    return { myFees: entries };
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
