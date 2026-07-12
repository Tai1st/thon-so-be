import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Resident, ResidentDocument } from '../schemas/resident.schema';
import { Household, HouseholdDocument } from '../schemas/household.schema';
import { VillageFund, VillageFundDocument } from '../schemas/household.schema';
import { FundObligationDto } from './dto/fund-obligation.dto';
import { CreateVillageFundTxDto } from './dto/create-village-fund-tx.dto';
import { UpdateVillageFundTxDto } from './dto/update-village-fund-tx.dto';
import { UpdateBankInfoDto } from './dto/update-bank-info.dto';

function todayDisplay(): string {
  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()}`;
}

function randomId(prefix: string): string {
  return `${prefix}-${Math.floor(100 + Math.random() * 900)}`;
}

@Injectable()
export class VillageHeadFundService {
  constructor(
    @InjectModel(Resident.name) private residentModel: Model<ResidentDocument>,
    @InjectModel(Household.name) private householdModel: Model<HouseholdDocument>,
    @InjectModel(VillageFund.name) private villageFundModel: Model<VillageFundDocument>,
  ) {}

  private async getOrCreateVillageFund(tenantId: Types.ObjectId) {
    let fund = await this.villageFundModel.findOne({ tenantId });
    if (!fund) fund = await this.villageFundModel.create({ tenantId });
    return fund;
  }

  private async headNameByFamilyId(tenantId: Types.ObjectId, familyId: string): Promise<string> {
    const head =
      (await this.residentModel.findOne({ tenantId, familyId, isHouseholder: true }).lean()) ||
      (await this.residentModel.findOne({ tenantId, familyId }).lean());
    return head?.name ?? familyId;
  }

  async getOverview(tenantId: Types.ObjectId) {
    const fund = await this.getOrCreateVillageFund(tenantId);
    const households = await this.householdModel.find({ tenantId }).lean();
    const heads = await this.residentModel.find({ tenantId, isHouseholder: true }).lean();
    const headByFamilyId = new Map(heads.map((h) => [h.familyId, h]));

    const thuTotal = fund.thu.reduce((sum, t) => sum + t.amount, 0);
    const chiTotal = fund.chi.reduce((sum, t) => sum + t.amount, 0);

    const pendingPayments: {
      familyId: string;
      headName: string;
      obligationId: string;
      name: string;
      amount: number;
      date: string;
    }[] = [];
    const unpaidHouseholds: {
      familyId: string;
      representative: string;
      dob: string;
      group: string;
      unpaidAmount: number;
    }[] = [];

    households.forEach((h) => {
      const head = headByFamilyId.get(h.familyId);
      let unpaidAmount = 0;
      (h.fundObligations || []).forEach((f) => {
        if (f.status === 'Chờ duyệt') {
          pendingPayments.push({
            familyId: h.familyId,
            headName: head?.name ?? h.familyId,
            obligationId: f.id,
            name: f.name,
            amount: f.amount,
            date: f.date,
          });
        }
        if (f.status === 'Chưa đóng') unpaidAmount += f.amount;
      });
      if (unpaidAmount > 0) {
        unpaidHouseholds.push({
          familyId: h.familyId,
          representative: head?.name ?? h.familyId,
          dob: head?.dob ?? '',
          group: head?.group ?? '',
          unpaidAmount,
        });
      }
    });

    return {
      thuTotal,
      chiTotal,
      balance: thuTotal - chiTotal,
      thu: fund.thu,
      chi: fund.chi,
      bankInfo: fund.bankInfo,
      obligations: fund.obligationCatalog,
      pendingPayments,
      unpaidHouseholds,
    };
  }

  async createObligation(tenantId: Types.ObjectId, dto: FundObligationDto) {
    const fund = await this.getOrCreateVillageFund(tenantId);
    const id = randomId('OB');
    fund.obligationCatalog.push({ id, name: dto.name, amount: dto.amount, period: dto.period });
    await fund.save();

    const familyIds = await this.residentModel.distinct('familyId', { tenantId });
    await Promise.all(
      familyIds.map((familyId) =>
        this.householdModel.findOneAndUpdate(
          { tenantId, familyId },
          {
            $push: {
              fundObligations: {
                id,
                name: dto.name,
                memo: `DONG_GOP_${familyId}_${id}`,
                period: dto.period,
                amount: dto.amount,
                status: 'Chưa đóng',
                date: '-',
              },
            },
          },
          { upsert: true },
        ),
      ),
    );

    return fund.obligationCatalog;
  }

  async updateObligation(tenantId: Types.ObjectId, id: string, dto: FundObligationDto) {
    const fund = await this.getOrCreateVillageFund(tenantId);
    const entry = fund.obligationCatalog.find((o) => o.id === id);
    if (!entry) throw new NotFoundException('Không tìm thấy khoản thu này.');
    entry.name = dto.name;
    entry.amount = dto.amount;
    entry.period = dto.period;
    await fund.save();

    // Đồng bộ bản sao chưa đóng ở mọi hộ; bản đã "Đã đóng" giữ nguyên làm lịch sử.
    await this.householdModel.updateMany(
      { tenantId, fundObligations: { $elemMatch: { id, status: { $ne: 'Đã đóng' } } } },
      {
        $set: {
          'fundObligations.$[ob].name': dto.name,
          'fundObligations.$[ob].amount': dto.amount,
          'fundObligations.$[ob].period': dto.period,
        },
      },
      { arrayFilters: [{ 'ob.id': id, 'ob.status': { $ne: 'Đã đóng' } }] },
    );

    return entry;
  }

  async deleteObligation(tenantId: Types.ObjectId, id: string) {
    const fund = await this.getOrCreateVillageFund(tenantId);
    fund.obligationCatalog = fund.obligationCatalog.filter((o) => o.id !== id);
    await fund.save();
    await this.householdModel.updateMany({ tenantId }, { $pull: { fundObligations: { id } } });
    return { id };
  }

  async updateBankInfo(tenantId: Types.ObjectId, dto: UpdateBankInfoDto) {
    const fund = await this.getOrCreateVillageFund(tenantId);
    fund.bankInfo = dto;
    await fund.save();
    return fund.bankInfo;
  }

  async createTransaction(tenantId: Types.ObjectId, dto: CreateVillageFundTxDto) {
    const fund = await this.getOrCreateVillageFund(tenantId);

    if (dto.type === 'Thu') {
      if (!dto.household) throw new BadRequestException('Vui lòng chọn một chủ hộ hợp lệ.');
      const isValidHousehold = await this.residentModel.exists({
        tenantId,
        isHouseholder: true,
        name: dto.household,
      });
      if (!isValidHousehold) throw new BadRequestException('Vui lòng chọn một chủ hộ hợp lệ từ danh sách gợi ý.');
      if (!dto.obligationIds?.length) throw new BadRequestException('Vui lòng chọn ít nhất một khoản thu.');

      const chosen = fund.obligationCatalog.filter((o) => dto.obligationIds!.includes(o.id));
      if (!chosen.length) throw new BadRequestException('Khoản thu không hợp lệ.');
      const amount = chosen.reduce((sum, o) => sum + o.amount, 0);

      fund.thu.unshift({ id: randomId('VT'), household: dto.household, amount, date: todayDisplay() });
    } else {
      if (!dto.desc) throw new BadRequestException('Vui lòng nhập nội dung chi.');
      if (!dto.amount || dto.amount <= 0) throw new BadRequestException('Số tiền phải lớn hơn 0.');
      fund.chi.unshift({ id: randomId('VC'), desc: dto.desc, amount: dto.amount, date: todayDisplay() });
    }

    await fund.save();
    return { thu: fund.thu, chi: fund.chi };
  }

  async updateTransaction(tenantId: Types.ObjectId, type: 'thu' | 'chi', id: string, dto: UpdateVillageFundTxDto) {
    const fund = await this.getOrCreateVillageFund(tenantId);
    if (type === 'thu') {
      const tx = fund.thu.find((t) => t.id === id);
      if (!tx) throw new NotFoundException('Không tìm thấy giao dịch này.');
      tx.household = dto.label;
      tx.amount = dto.amount;
    } else {
      const tx = fund.chi.find((t) => t.id === id);
      if (!tx) throw new NotFoundException('Không tìm thấy giao dịch này.');
      tx.desc = dto.label;
      tx.amount = dto.amount;
    }
    await fund.save();
    return { thu: fund.thu, chi: fund.chi };
  }

  async deleteTransaction(tenantId: Types.ObjectId, type: 'thu' | 'chi', id: string) {
    const fund = await this.getOrCreateVillageFund(tenantId);
    if (type === 'thu') fund.thu = fund.thu.filter((t) => t.id !== id);
    else fund.chi = fund.chi.filter((t) => t.id !== id);
    await fund.save();
    return { thu: fund.thu, chi: fund.chi };
  }

  async approvePayment(tenantId: Types.ObjectId, familyId: string, obligationId: string) {
    const household = await this.householdModel.findOne({ tenantId, familyId });
    const obligation = household?.fundObligations.find(
      (f) => f.id === obligationId && f.status === 'Chờ duyệt',
    );
    if (!household || !obligation) {
      throw new NotFoundException('Không tìm thấy khoản chờ duyệt này.');
    }
    obligation.status = 'Đã đóng';
    await household.save();

    const fund = await this.getOrCreateVillageFund(tenantId);
    const headName = await this.headNameByFamilyId(tenantId, familyId);
    fund.thu.unshift({
      id: randomId('VT'),
      household: headName,
      amount: obligation.amount,
      date: obligation.date,
    });
    await fund.save();

    return { familyId, fundObligations: household.fundObligations };
  }

  async rejectPayment(tenantId: Types.ObjectId, familyId: string, obligationId: string) {
    const household = await this.householdModel.findOne({ tenantId, familyId });
    const obligation = household?.fundObligations.find(
      (f) => f.id === obligationId && f.status === 'Chờ duyệt',
    );
    if (!household || !obligation) {
      throw new NotFoundException('Không tìm thấy khoản chờ duyệt này.');
    }
    obligation.status = 'Chưa đóng';
    obligation.date = '-';
    await household.save();
    return { familyId, fundObligations: household.fundObligations };
  }
}
