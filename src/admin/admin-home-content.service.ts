import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { HomeContent, HomeContentDocument } from '../schemas/home-content.schema';
import { Account, AccountDocument } from '../schemas/account.schema';
import { Tenant, TenantDocument } from '../schemas/tenant.schema';
import { AdminAuditService } from './admin-audit.service';
import {
  NewsItemDto,
  ProductDto,
  ScheduleItemDto,
  GalleryItemDto,
  StatDto,
  SecurityInfoDto,
  UpdateBrandingDto,
  UpdateOldVillagesDto,
} from './dto/home-content.dto';

type ArrayField = 'news' | 'products' | 'schedule' | 'gallery' | 'stats';

function randomId(prefix: string): string {
  return `${prefix}-${Math.floor(1000 + Math.random() * 9000)}`;
}

@Injectable()
export class AdminHomeContentService {
  constructor(
    @InjectModel(HomeContent.name) private homeContentModel: Model<HomeContentDocument>,
    @InjectModel(Account.name) private accountModel: Model<AccountDocument>,
    @InjectModel(Tenant.name) private tenantModel: Model<TenantDocument>,
    private auditService: AdminAuditService,
  ) {}

  private async resolveAccountName(tenantId: Types.ObjectId, accountId: string): Promise<string> {
    const account = await this.accountModel.findOne({ _id: accountId, tenantId }).lean();
    return account?.name ?? 'Admin';
  }

  private async getOrCreate(tenantId: Types.ObjectId) {
    let doc = await this.homeContentModel.findOne({ tenantId });
    if (!doc) doc = await this.homeContentModel.create({ tenantId });
    return doc;
  }

  async get(tenantId: Types.ObjectId) {
    const doc = await this.getOrCreate(tenantId);
    const tenant = await this.tenantModel.findById(tenantId).lean();
    return { ...doc.toObject(), siteName: tenant?.name || '', logoUrl: tenant?.logoUrl || '' };
  }

  async updateBranding(tenantId: Types.ObjectId, dto: UpdateBrandingDto) {
    const doc = await this.getOrCreate(tenantId);
    doc.heroImage = dto.heroImage || '';
    await doc.save();
    await this.tenantModel.updateOne({ _id: tenantId }, { $set: { name: dto.siteName, logoUrl: dto.logoUrl || '' } });
    await this.auditService.log(tenantId, 'Cập nhật trang chủ', `Admin cập nhật thương hiệu trang chủ: tên "${dto.siteName}".`, 'Admin');
    return { siteName: dto.siteName, logoUrl: dto.logoUrl || '', heroImage: doc.heroImage };
  }

  // Danh sách "thôn cũ" (vd trước sáp nhập) — dùng làm lựa chọn nhóm cư trú
  // khi thêm/sửa nhân khẩu, và nhãn breakdown của các chỉ số thống kê.
  async updateOldVillages(tenantId: Types.ObjectId, dto: UpdateOldVillagesDto) {
    const doc = await this.getOrCreate(tenantId);
    doc.oldVillages = dto.oldVillages;
    doc.markModified('oldVillages');
    await doc.save();
    await this.auditService.log(
      tenantId,
      'Cập nhật trang chủ',
      `Admin cập nhật danh sách thôn cũ: ${dto.oldVillages.join(', ') || '(rỗng)'}.`,
      'Admin',
    );
    return { oldVillages: doc.oldVillages };
  }

  async updateSecurity(tenantId: Types.ObjectId, dto: SecurityInfoDto) {
    const doc = await this.getOrCreate(tenantId);
    doc.security.hotline = dto.hotline;
    doc.security.hotlineDisplay = dto.hotlineDisplay || dto.hotline;
    doc.security.slogan = dto.slogan || '';
    await doc.save();
    await this.auditService.log(tenantId, 'Cập nhật trang chủ', 'Admin cập nhật thông tin đường dây nóng ANTT.', 'Admin');
    return doc.security;
  }

  private async addItem(tenantId: Types.ObjectId, field: ArrayField, idPrefix: string, item: object, logMsg: string) {
    const doc = await this.getOrCreate(tenantId);
    const withId = { id: randomId(idPrefix), ...item };
    const record = doc as unknown as Record<ArrayField, unknown[]>;
    record[field].push(withId);
    doc.markModified(field);
    await doc.save();
    await this.auditService.log(tenantId, 'Cập nhật trang chủ', logMsg, 'Admin');
    return withId;
  }

  private async updateItem(tenantId: Types.ObjectId, field: ArrayField, id: string, item: object, logMsg: string) {
    const doc = await this.getOrCreate(tenantId);
    const record = doc as unknown as Record<ArrayField, { id: string }[]>;
    const idx = record[field].findIndex((i) => i.id === id);
    if (idx === -1) throw new NotFoundException('Không tìm thấy mục này.');
    record[field][idx] = { id, ...item };
    doc.markModified(field);
    await doc.save();
    await this.auditService.log(tenantId, 'Cập nhật trang chủ', logMsg, 'Admin');
    return record[field][idx];
  }

  private async deleteItem(tenantId: Types.ObjectId, field: ArrayField, id: string, logMsg: string) {
    const doc = await this.getOrCreate(tenantId);
    const record = doc as unknown as Record<ArrayField, { id: string }[]>;
    record[field] = record[field].filter((i) => i.id !== id);
    doc.markModified(field);
    await doc.save();
    await this.auditService.log(tenantId, 'Cập nhật trang chủ', logMsg, 'Admin');
    return { id };
  }

  // News
  async createNews(tenantId: Types.ObjectId, dto: NewsItemDto, accountId: string) {
    const createdBy = await this.resolveAccountName(tenantId, accountId);
    return this.addItem(tenantId, 'news', 'NEWS', { ...dto, createdBy }, `Admin đăng tin tức mới "${dto.title}".`);
  }
  async updateNews(tenantId: Types.ObjectId, id: string, dto: NewsItemDto, accountId: string) {
    const createdBy = await this.resolveAccountName(tenantId, accountId);
    return this.updateItem(tenantId, 'news', id, { ...dto, createdBy }, `Admin cập nhật tin tức "${dto.title}".`);
  }
  deleteNews(tenantId: Types.ObjectId, id: string) {
    return this.deleteItem(tenantId, 'news', id, `Admin xóa 1 tin tức khỏi trang chủ.`);
  }

  // Products
  createProduct(tenantId: Types.ObjectId, dto: ProductDto) {
    return this.addItem(tenantId, 'products', 'PRD', dto, `Admin thêm sản phẩm "${dto.name}".`);
  }
  updateProduct(tenantId: Types.ObjectId, id: string, dto: ProductDto) {
    return this.updateItem(tenantId, 'products', id, dto, `Admin cập nhật sản phẩm "${dto.name}".`);
  }
  deleteProduct(tenantId: Types.ObjectId, id: string) {
    return this.deleteItem(tenantId, 'products', id, `Admin xóa 1 sản phẩm khỏi trang chủ.`);
  }

  // Schedule
  createSchedule(tenantId: Types.ObjectId, dto: ScheduleItemDto) {
    return this.addItem(tenantId, 'schedule', 'SCH', dto, `Admin thêm lịch sự kiện "${dto.title}".`);
  }
  updateSchedule(tenantId: Types.ObjectId, id: string, dto: ScheduleItemDto) {
    return this.updateItem(tenantId, 'schedule', id, dto, `Admin cập nhật lịch sự kiện "${dto.title}".`);
  }
  deleteSchedule(tenantId: Types.ObjectId, id: string) {
    return this.deleteItem(tenantId, 'schedule', id, `Admin xóa 1 lịch sự kiện khỏi trang chủ.`);
  }

  // Gallery
  createGalleryItem(tenantId: Types.ObjectId, dto: GalleryItemDto) {
    return this.addItem(tenantId, 'gallery', 'GAL', dto, `Admin thêm 1 ảnh vào thư viện trang chủ.`);
  }
  deleteGalleryItem(tenantId: Types.ObjectId, id: string) {
    return this.deleteItem(tenantId, 'gallery', id, `Admin xóa 1 ảnh khỏi thư viện trang chủ.`);
  }

  // Stats
  createStat(tenantId: Types.ObjectId, dto: StatDto) {
    return this.addItem(tenantId, 'stats', 'STAT', { ...dto, breakdown: dto.breakdown || [] }, `Admin thêm chỉ số thống kê "${dto.label}".`);
  }
  updateStat(tenantId: Types.ObjectId, id: string, dto: StatDto) {
    return this.updateItem(tenantId, 'stats', id, { ...dto, breakdown: dto.breakdown || [] }, `Admin cập nhật chỉ số thống kê "${dto.label}".`);
  }
  deleteStat(tenantId: Types.ObjectId, id: string) {
    return this.deleteItem(tenantId, 'stats', id, `Admin xóa 1 chỉ số thống kê khỏi trang chủ.`);
  }
}
