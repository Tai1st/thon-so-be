import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Account, AccountDocument } from '../schemas/account.schema';
import { Resident, ResidentDocument } from '../schemas/resident.schema';
import { AssociationQuota, AssociationQuotaDocument } from '../schemas/association-quota.schema';
import { AdminAuditService } from '../admin/admin-audit.service';
import { CreateLoanDto } from './dto/create-loan.dto';

function todayDisplay(): string {
  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()}`;
}
function randomId(prefix: string): string {
  return `${prefix}-${Math.floor(100 + Math.random() * 900)}`;
}

@Injectable()
export class AssociationOfficerLoansService {
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

  async list(tenantId: Types.ObjectId, accountId: string) {
    const account = await this.requireAccount(tenantId, accountId);
    const quota = await this.getOrCreateQuota(tenantId, account.assoc!);
    return quota.loans;
  }

  async create(tenantId: Types.ObjectId, accountId: string, dto: CreateLoanDto) {
    const account = await this.requireAccount(tenantId, accountId);
    const quota = await this.getOrCreateQuota(tenantId, account.assoc!);

    const isValidMember = await this.residentModel.exists({ tenantId, association: account.assoc, name: dto.member });
    if (!isValidMember) throw new BadRequestException('Vui lòng chọn một hội viên hợp lệ từ danh sách gợi ý.');
    if (dto.amount > quota.balance) throw new BadRequestException('Số dư quỹ hội không đủ để giải ngân khoản vay này.');

    const date = todayDisplay();
    const disburseTxId = randomId('TX');
    quota.txs.unshift({
      id: disburseTxId,
      type: 'Chi',
      desc: `Giải ngân cho ${dto.member} vay vốn`,
      amount: dto.amount,
      date,
      officer: account.name,
    });
    quota.balance -= dto.amount;

    const loanId = randomId('LOAN');
    quota.loans.unshift({
      id: loanId,
      memberName: dto.member,
      amount: dto.amount,
      interestRate: dto.interestRate,
      termMonths: dto.termMonths,
      status: 'Đang vay',
      date,
      completedDate: null,
      disburseTxId,
    });
    await quota.save();

    await this.auditService.log(
      tenantId,
      'Lập khoản vay',
      `Cán bộ ${account.name} giải ngân ${dto.amount.toLocaleString('vi-VN')} đ cho ${dto.member} vay, lãi suất ${dto.interestRate}%, thời hạn ${dto.termMonths} tháng.`,
      account.name,
    );
    return quota.loans;
  }

  async complete(tenantId: Types.ObjectId, accountId: string, loanId: string) {
    const account = await this.requireAccount(tenantId, accountId);
    const quota = await this.getOrCreateQuota(tenantId, account.assoc!);
    const loan = quota.loans.find((l) => l.id === loanId);
    if (!loan || loan.status === 'Đã hoàn thành') throw new NotFoundException('Không tìm thấy khoản vay đang hoạt động này.');

    const interest = Math.round((loan.amount * loan.interestRate) / 100);
    const total = loan.amount + interest;
    const date = todayDisplay();

    loan.status = 'Đã hoàn thành';
    loan.completedDate = date;

    const completeTxId = randomId('TX');
    quota.txs.unshift({ id: completeTxId, type: 'Thu', desc: 'Gốc + lãi', member: loan.memberName, amount: total, date, officer: account.name });
    quota.balance += total;
    loan.completeTxId = completeTxId;
    await quota.save();

    await this.auditService.log(
      tenantId,
      'Hoàn thành khoản vay',
      `${loan.memberName} đã đóng đủ gốc và lãi ${total.toLocaleString('vi-VN')} đ cho quỹ ${account.assoc}.`,
      account.name,
    );
    return quota.loans;
  }

  async delete(tenantId: Types.ObjectId, accountId: string, loanId: string) {
    const account = await this.requireAccount(tenantId, accountId);
    const quota = await this.getOrCreateQuota(tenantId, account.assoc!);
    const loan = quota.loans.find((l) => l.id === loanId);
    if (!loan) throw new NotFoundException('Không tìm thấy khoản vay này.');

    if (loan.disburseTxId) {
      const tx = quota.txs.find((t) => t.id === loan.disburseTxId);
      if (tx) {
        quota.balance += tx.amount;
        quota.txs = quota.txs.filter((t) => t.id !== loan.disburseTxId);
      }
    }
    if (loan.completeTxId) {
      const tx = quota.txs.find((t) => t.id === loan.completeTxId);
      if (tx) {
        quota.balance -= tx.amount;
        quota.txs = quota.txs.filter((t) => t.id !== loan.completeTxId);
      }
    }
    quota.loans = quota.loans.filter((l) => l.id !== loanId);
    await quota.save();

    await this.auditService.log(
      tenantId,
      'Xóa khoản vay',
      `Cán bộ ${account.name} xóa khoản vay của ${loan.memberName} và hoàn tác các giao dịch liên quan.`,
      account.name,
    );
    return { id: loanId };
  }
}
