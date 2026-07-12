import { Controller, Get, NotFoundException, UseGuards } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { TenantGuard } from '../common/guards/tenant.guard';
import { CurrentTenant } from '../common/decorators/current-tenant.decorator';
import { HomeContent, HomeContentDocument } from '../schemas/home-content.schema';
import { Account, AccountDocument } from '../schemas/account.schema';
import { Resident, ResidentDocument } from '../schemas/resident.schema';
import type { TenantDocument } from '../schemas/tenant.schema';

function toPhoneDisplay(phone: string): string {
  return phone ? phone.replace(/(\d{3,4})(\d{3})(\d{3,4})/, '$1.$2.$3') : '';
}

// Public (không cần đăng nhập) — nội dung trang chủ hiển thị cho mọi
// người ghé thăm (mục 9 tài liệu thiết kế). Vẫn cần TenantGuard vì nội
// dung khác nhau theo từng thôn.
@Controller('home-content')
export class HomeContentController {
  constructor(
    @InjectModel(HomeContent.name) private homeContentModel: Model<HomeContentDocument>,
    @InjectModel(Account.name) private accountModel: Model<AccountDocument>,
    @InjectModel(Resident.name) private residentModel: Model<ResidentDocument>,
  ) {}

  @UseGuards(TenantGuard)
  @Get()
  async get(@CurrentTenant() tenant: TenantDocument): Promise<Record<string, unknown>> {
    const doc = await this.homeContentModel.findOne({ tenantId: tenant._id }).lean();
    if (!doc) throw new NotFoundException('Chưa có nội dung trang chủ cho thôn này.');
    return { ...doc, siteName: tenant.name || '', logoUrl: tenant.logoUrl || '' };
  }

  // "Ban Tự Quản" và "Tổ ANTT" trên trang chủ không phải nội dung soạn
  // riêng — sinh trực tiếp từ Account (field `position`/`role`), ghép số
  // điện thoại qua Resident cùng tên (mục 8.3-tương-tự tài liệu thiết kế,
  // đúng logic renderHomeLeadership()/renderHomeSecurity() của prototype).
  @UseGuards(TenantGuard)
  @Get('public-roster')
  async publicRoster(@CurrentTenant() tenant: TenantDocument) {
    const accounts = await this.accountModel.find({ tenantId: tenant._id, status: 'active' }).lean();
    const residents = await this.residentModel.find({ tenantId: tenant._id }).lean();
    const phoneByName = new Map(residents.map((r) => [r.name, r.phone || '']));

    const leadership = accounts
      .filter((a) => a.position && a.position.trim() && a.role !== 'security-team')
      .map((a) => {
        const phone = phoneByName.get(a.name) || '';
        return { role: a.position, name: a.name, phone, phoneDisplay: toPhoneDisplay(phone) };
      });

    const RANK: Record<string, number> = { 'Tổ Trưởng': 0, 'Tổ Phó': 1 };
    const security = accounts
      .filter((a) => a.role === 'security-team')
      .map((a) => {
        const title = (a.position && a.position.trim()) || 'Tổ Viên';
        const phone = phoneByName.get(a.name) || '';
        return { title, name: a.name, phone, phoneDisplay: toPhoneDisplay(phone) };
      })
      .sort((a, b) => (RANK[a.title] ?? 2) - (RANK[b.title] ?? 2));

    return { leadership, security };
  }
}
