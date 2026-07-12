import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Account, AccountDocument } from '../schemas/account.schema';
import { Resident, ResidentDocument } from '../schemas/resident.schema';
import { AssociationQuota, AssociationQuotaDocument } from '../schemas/association-quota.schema';
import { AdminAuditService } from '../admin/admin-audit.service';
import { FeeObligationDto } from './dto/fee-obligation.dto';
import { CreateAssocTxDto } from './dto/create-tx.dto';
import { UpdateBankInfoDto } from './dto/update-bank-info.dto';

export interface MemberFundEntry {
  id: string;
  name: string;
  period: string;
  amount: number;
  status: 'Đã đóng' | 'Chưa đóng' | 'Chờ duyệt';
  date: string;
  memo: string;
}

function todayDisplay(): string {
  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()}`;
}
function randomId(prefix: string): string {
  return `${prefix}-${Math.floor(100 + Math.random() * 900)}`;
}

@Injectable()
export class AssociationOfficerFundService {
  constructor(
    @InjectModel(Account.name) private accountModel: Model<AccountDocument>,
    @InjectModel(Resident.name) private residentModel: Model<ResidentDocument>,
    @InjectModel(AssociationQuota.name) private quotaModel: Model<AssociationQuotaDocument>,
    private auditService: AdminAuditService,
  ) {}

  private async requireAccount(tenantId: Types.ObjectId, accountId: string) {
    const account = await this.accountModel.findOne({ _id: accountId, tenantId });
    if (!account?.assoc) throw new BadRequestException('Tài khoản này chưa được gán phụ trách hội nào.');
    return account;
  }

  private async getOrCreateQuota(tenantId: Types.ObjectId, assoc: string) {
    let quota = await this.quotaModel.findOne({ tenantId, name: assoc });
    if (!quota) quota = await this.quotaModel.create({ tenantId, name: assoc });
    return quota;
  }

  async getOverview(tenantId: Types.ObjectId, accountId: string) {
    const account = await this.requireAccount(tenantId, accountId);
    const quota = await this.getOrCreateQuota(tenantId, account.assoc!);
    const members = await this.residentModel.find({ tenantId, association: account.assoc }).lean();
    const memberById = new Map(members.map((m) => [String(m._id), m]));

    const pendingPayments: { residentId: string; memberName: string; obligationId: string; name: string; amount: number; date: string }[] = [];
    quota.memberFunds.forEach((entries, residentId) => {
      ((entries as MemberFundEntry[]) || []).forEach((f) => {
        if (f.status === 'Chờ duyệt') {
          pendingPayments.push({
            residentId,
            memberName: memberById.get(residentId)?.name ?? residentId,
            obligationId: f.id,
            name: f.name,
            amount: f.amount,
            date: f.date,
          });
        }
      });
    });

    return {
      association: account.assoc,
      balance: quota.balance,
      txs: quota.txs,
      loans: quota.loans,
      bankInfo: quota.bankInfo,
      feeObligations: quota.feeObligations,
      pendingPayments,
      members,
    };
  }

  async createFeeObligation(tenantId: Types.ObjectId, accountId: string, dto: FeeObligationDto) {
    const account = await this.requireAccount(tenantId, accountId);
    const quota = await this.getOrCreateQuota(tenantId, account.assoc!);
    const id = randomId('AOB');
    quota.feeObligations.push({ id, name: dto.name, amount: dto.amount, period: dto.period });

    const members = await this.residentModel.find({ tenantId, association: account.assoc }).lean();
    members.forEach((m) => {
      const residentId = String(m._id);
      const entries = ((quota.memberFunds.get(residentId) as MemberFundEntry[]) || []).slice();
      entries.push({
        id,
        name: dto.name,
        period: dto.period,
        amount: dto.amount,
        status: 'Chưa đóng',
        date: '-',
        memo: `HOIPHI_${residentId}_${id}`,
      });
      quota.memberFunds.set(residentId, entries);
    });
    quota.markModified('memberFunds');
    await quota.save();

    await this.auditService.log(
      tenantId,
      'Tạo khoản thu hội phí',
      `Cán bộ ${account.name} tạo khoản thu "${dto.name}" (${dto.amount.toLocaleString('vi-VN')} đ/hội viên) áp dụng cho toàn bộ ${members.length} hội viên của quỹ ${account.assoc}.`,
      account.name,
    );
    return quota.feeObligations;
  }

  async updateFeeObligation(tenantId: Types.ObjectId, accountId: string, id: string, dto: FeeObligationDto) {
    const account = await this.requireAccount(tenantId, accountId);
    const quota = await this.getOrCreateQuota(tenantId, account.assoc!);
    const entry = quota.feeObligations.find((o) => o.id === id);
    if (!entry) throw new NotFoundException('Không tìm thấy khoản thu này.');
    entry.name = dto.name;
    entry.amount = dto.amount;
    entry.period = dto.period;

    quota.memberFunds.forEach((entries, residentId) => {
      const list = (entries as MemberFundEntry[]) || [];
      const target = list.find((f) => f.id === id && f.status !== 'Đã đóng');
      if (target) {
        target.name = dto.name;
        target.amount = dto.amount;
        target.period = dto.period;
        quota.memberFunds.set(residentId, list);
      }
    });
    quota.markModified('memberFunds');
    await quota.save();

    await this.auditService.log(tenantId, 'Sửa khoản thu hội phí', `Cán bộ ${account.name} cập nhật khoản thu "${dto.name}".`, account.name);
    return entry;
  }

  async deleteFeeObligation(tenantId: Types.ObjectId, accountId: string, id: string) {
    const account = await this.requireAccount(tenantId, accountId);
    const quota = await this.getOrCreateQuota(tenantId, account.assoc!);
    const entry = quota.feeObligations.find((o) => o.id === id);
    quota.feeObligations = quota.feeObligations.filter((o) => o.id !== id);

    quota.memberFunds.forEach((entries, residentId) => {
      const list = ((entries as MemberFundEntry[]) || []).filter((f) => f.id !== id);
      quota.memberFunds.set(residentId, list);
    });
    quota.markModified('memberFunds');
    await quota.save();

    await this.auditService.log(
      tenantId,
      'Xóa khoản thu hội phí',
      `Cán bộ ${account.name} xóa khoản thu "${entry?.name ?? id}" khỏi toàn bộ hội viên.`,
      account.name,
    );
    return { id };
  }

  async updateBankInfo(tenantId: Types.ObjectId, accountId: string, dto: UpdateBankInfoDto) {
    const account = await this.requireAccount(tenantId, accountId);
    const quota = await this.getOrCreateQuota(tenantId, account.assoc!);
    quota.bankInfo = dto;
    await quota.save();

    await this.auditService.log(
      tenantId,
      'Cập nhật tài khoản ngân hàng',
      `Cán bộ ${account.name} cập nhật thông tin tài khoản ngân hàng nhận chuyển khoản của quỹ ${account.assoc}.`,
      account.name,
    );
    return quota.bankInfo;
  }

  async createTransaction(tenantId: Types.ObjectId, accountId: string, dto: CreateAssocTxDto) {
    const account = await this.requireAccount(tenantId, accountId);
    const quota = await this.getOrCreateQuota(tenantId, account.assoc!);

    let amount: number;
    let desc: string;
    let member: string | undefined;

    if (dto.type === 'Thu') {
      if (!dto.member) throw new BadRequestException('Vui lòng chọn một hội viên hợp lệ.');
      const isValidMember = await this.residentModel.exists({ tenantId, association: account.assoc, name: dto.member });
      if (!isValidMember) throw new BadRequestException('Vui lòng chọn một hội viên hợp lệ từ danh sách gợi ý.');
      if (!dto.obligationIds?.length) throw new BadRequestException('Vui lòng chọn ít nhất một khoản thu.');

      const chosen = quota.feeObligations.filter((o) => dto.obligationIds!.includes(o.id));
      if (!chosen.length) throw new BadRequestException('Khoản thu không hợp lệ.');
      amount = chosen.reduce((sum, o) => sum + o.amount, 0);
      desc = chosen.map((o) => o.name).join(', ');
      member = dto.member;
      quota.balance += amount;
    } else {
      if (!dto.desc) throw new BadRequestException('Vui lòng nhập nội dung chi.');
      if (!dto.amount || dto.amount <= 0) throw new BadRequestException('Số tiền giao dịch phải lớn hơn 0.');
      amount = dto.amount;
      desc = dto.desc;
      if (amount > quota.balance) throw new BadRequestException('Số dư tài khoản hội không đủ để chi quỹ.');
      quota.balance -= amount;
    }

    quota.txs.unshift({ id: randomId('TX'), type: dto.type, desc, member, amount, date: todayDisplay(), officer: account.name });
    await quota.save();

    await this.auditService.log(
      tenantId,
      'Giao dịch quỹ hội',
      `Cán bộ ${account.name} lập giao dịch ${dto.type} số tiền ${amount.toLocaleString('vi-VN')} đ cho quỹ ${account.assoc}.`,
      account.name,
    );
    return { balance: quota.balance, txs: quota.txs };
  }

  async updateTransaction(tenantId: Types.ObjectId, accountId: string, id: string, dto: { desc: string; amount: number }) {
    const account = await this.requireAccount(tenantId, accountId);
    const quota = await this.getOrCreateQuota(tenantId, account.assoc!);
    const tx = quota.txs.find((t) => t.id === id);
    if (!tx) throw new NotFoundException('Không tìm thấy giao dịch này.');

    const delta = dto.amount - tx.amount;
    quota.balance += tx.type === 'Thu' ? delta : -delta;
    tx.desc = dto.desc;
    tx.amount = dto.amount;
    await quota.save();

    await this.auditService.log(
      tenantId,
      'Sửa giao dịch quỹ hội',
      `Cán bộ ${account.name} sửa giao dịch ${tx.type} "${dto.desc}" thành ${dto.amount.toLocaleString('vi-VN')} đ cho quỹ ${account.assoc}.`,
      account.name,
    );
    return { balance: quota.balance, txs: quota.txs };
  }

  async deleteTransaction(tenantId: Types.ObjectId, accountId: string, id: string) {
    const account = await this.requireAccount(tenantId, accountId);
    const quota = await this.getOrCreateQuota(tenantId, account.assoc!);
    const tx = quota.txs.find((t) => t.id === id);
    if (!tx) throw new NotFoundException('Không tìm thấy giao dịch này.');

    quota.balance += tx.type === 'Thu' ? -tx.amount : tx.amount;
    quota.txs = quota.txs.filter((t) => t.id !== id);
    await quota.save();

    await this.auditService.log(
      tenantId,
      'Xóa giao dịch quỹ hội',
      `Cán bộ ${account.name} xóa giao dịch ${tx.type} "${tx.desc}" (${tx.amount.toLocaleString('vi-VN')} đ) khỏi quỹ ${account.assoc}.`,
      account.name,
    );
    return { balance: quota.balance, txs: quota.txs };
  }

  async approvePayment(tenantId: Types.ObjectId, accountId: string, residentId: string, obligationId: string) {
    const account = await this.requireAccount(tenantId, accountId);
    const quota = await this.getOrCreateQuota(tenantId, account.assoc!);
    const entries = (quota.memberFunds.get(residentId) as MemberFundEntry[]) || [];
    const entry = entries.find((f) => f.id === obligationId && f.status === 'Chờ duyệt');
    if (!entry) throw new NotFoundException('Không tìm thấy khoản chờ duyệt này.');

    entry.status = 'Đã đóng';
    quota.memberFunds.set(residentId, entries);
    quota.markModified('memberFunds');
    quota.balance += entry.amount;

    const resident = await this.residentModel.findOne({ _id: residentId, tenantId }).lean();
    const memberName = resident?.name ?? residentId;
    quota.txs.unshift({
      id: randomId('TX'),
      type: 'Thu',
      desc: entry.name,
      member: memberName,
      amount: entry.amount,
      date: entry.date,
      officer: account.name,
    });
    await quota.save();

    await this.auditService.log(
      tenantId,
      'Duyệt thanh toán hội phí',
      `Cán bộ ${account.name} duyệt xác nhận chuyển khoản ${entry.amount.toLocaleString('vi-VN')} đ của ${memberName} cho quỹ ${account.assoc}.`,
      account.name,
    );
    return { residentId, entries };
  }

  async rejectPayment(tenantId: Types.ObjectId, accountId: string, residentId: string, obligationId: string) {
    const account = await this.requireAccount(tenantId, accountId);
    const quota = await this.getOrCreateQuota(tenantId, account.assoc!);
    const entries = (quota.memberFunds.get(residentId) as MemberFundEntry[]) || [];
    const entry = entries.find((f) => f.id === obligationId && f.status === 'Chờ duyệt');
    if (!entry) throw new NotFoundException('Không tìm thấy khoản chờ duyệt này.');

    entry.status = 'Chưa đóng';
    entry.date = '-';
    quota.memberFunds.set(residentId, entries);
    quota.markModified('memberFunds');
    await quota.save();

    const resident = await this.residentModel.findOne({ _id: residentId, tenantId }).lean();
    await this.auditService.log(
      tenantId,
      'Từ chối thanh toán hội phí',
      `Cán bộ ${account.name} từ chối xác nhận chuyển khoản của ${resident?.name ?? residentId} cho quỹ ${account.assoc}.`,
      account.name,
    );
    return { residentId, entries };
  }
}
