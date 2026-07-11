import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { Tenant, TenantDocument } from '../schemas/tenant.schema';
import { Account, AccountDocument } from '../schemas/account.schema';
import { Resident, ResidentDocument } from '../schemas/resident.schema';
import { Commune, CommuneDocument } from '../schemas/commune.schema';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { AssignVillageDto } from './dto/assign-village.dto';

@Injectable()
export class SuperAdminTenantsService {
  constructor(
    @InjectModel(Tenant.name) private tenantModel: Model<TenantDocument>,
    @InjectModel(Account.name) private accountModel: Model<AccountDocument>,
    @InjectModel(Resident.name) private residentModel: Model<ResidentDocument>,
    @InjectModel(Commune.name) private communeModel: Model<CommuneDocument>,
  ) {}

  // Danh sách MỌI tenant kể cả đã khóa (khác /tenants/public — chỉ trả
  // tenant active) kèm thống kê cơ bản (mục 8.6 tài liệu thiết kế).
  async findAll(): Promise<Record<string, unknown>[]> {
    const tenants = await this.tenantModel.find().sort({ createdAt: -1 }).lean();
    return Promise.all(
      tenants.map(async (t) => {
        const [accountCount, residentCount] = await Promise.all([
          this.accountModel.countDocuments({ tenantId: t._id }),
          this.residentModel.countDocuments({ tenantId: t._id }),
        ]);
        return { ...t, accountCount, residentCount };
      }),
    );
  }

  async findOne(id: string) {
    const tenant = await this.tenantModel.findById(id).lean();
    if (!tenant) throw new NotFoundException('Không tìm thấy tenant.');
    return tenant;
  }

  // Tạo tenant mới + 1 Account admin đầu tiên trong cùng 1 thao tác, để
  // superadmin có thể bàn giao ngay tài khoản quản trị cho thôn mới.
  async create(dto: CreateTenantDto) {
    const existing = await this.tenantModel.findOne({ slug: dto.slug });
    if (existing) throw new ConflictException('Slug này đã được dùng bởi tenant khác.');

    const tenant = await this.tenantModel.create({
      slug: dto.slug,
      name: dto.name,
      lat: dto.lat,
      lng: dto.lng,
      boundary: dto.boundary,
      archivedAt: null,
    });

    const passwordHash = await bcrypt.hash(dto.adminPassword, 10);
    const admin = await this.accountModel.create({
      tenantId: tenant._id,
      username: dto.adminUsername,
      passwordHash,
      name: dto.adminName,
      role: 'admin',
      status: 'active',
    });

    return {
      tenant,
      admin: { id: String(admin._id), username: admin.username, name: admin.name },
    };
  }

  async update(id: string, dto: UpdateTenantDto) {
    const tenant = await this.tenantModel.findById(id);
    if (!tenant) throw new NotFoundException('Không tìm thấy tenant.');

    if (dto.name !== undefined) tenant.name = dto.name;
    if (dto.archived !== undefined) tenant.archivedAt = dto.archived ? new Date() : null;

    await tenant.save();
    return tenant;
  }

  // Gán (hoặc bỏ gán, khi dto.communeId === null) 1 tenant ĐÃ CÓ SẴN vào 1
  // thôn cụ thể của 1 Xã — dùng khi tenant được tạo thủ công (không qua
  // KMZ) hoặc muốn đổi lại xã/thôn sau này, khác với
  // SuperAdminCommunesService.createTenantFromVillage() (tạo tenant HOÀN
  // TOÀN MỚI trực tiếp từ 1 thôn chưa ai nhận).
  async assignVillage(tenantId: string, dto: AssignVillageDto) {
    const tenant = await this.tenantModel.findById(tenantId);
    if (!tenant) throw new NotFoundException('Không tìm thấy tenant.');

    // Bỏ gán khỏi thôn cũ (nếu có) trước, để không bao giờ có 2 thôn cùng
    // trỏ về 1 tenant hay 1 thôn bị "claimed" treo sau khi tenant đổi thôn.
    if (tenant.communeId && tenant.communeVillageIndex !== null && tenant.communeVillageIndex !== undefined) {
      const oldCommune = await this.communeModel.findById(tenant.communeId);
      const oldVillage = oldCommune?.villages[tenant.communeVillageIndex];
      if (oldVillage && String(oldVillage.tenantId) === String(tenant._id)) {
        oldVillage.claimed = false;
        oldVillage.tenantId = undefined;
        await oldCommune!.save();
      }
    }

    if (!dto.communeId) {
      tenant.communeId = null;
      tenant.communeVillageIndex = null;
      await tenant.save();
      return tenant;
    }

    if (dto.villageIndex === undefined || dto.villageIndex === null) {
      throw new ConflictException('Thiếu villageIndex khi gán tenant vào 1 xã.');
    }

    const commune = await this.communeModel.findById(dto.communeId);
    if (!commune) throw new NotFoundException('Không tìm thấy xã này.');
    const village = commune.villages[dto.villageIndex];
    if (!village) throw new NotFoundException('Không tìm thấy thôn này trong xã.');
    if (village.claimed && String(village.tenantId) !== String(tenant._id)) {
      throw new ConflictException('Thôn này đã được gán cho tenant khác.');
    }

    village.claimed = true;
    village.tenantId = tenant._id;
    await commune.save();

    tenant.communeId = commune._id;
    tenant.communeVillageIndex = dto.villageIndex;
    tenant.lat = village.lat;
    tenant.lng = village.lng;
    tenant.boundary = village.boundary;
    await tenant.save();

    return tenant;
  }
}
