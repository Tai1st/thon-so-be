import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, Model } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { Tenant, TenantDocument } from '../schemas/tenant.schema';
import { Account, AccountDocument } from '../schemas/account.schema';
import { Resident, ResidentDocument } from '../schemas/resident.schema';
import { Commune, CommuneDocument } from '../schemas/commune.schema';
import { HomeContent, HomeContentDocument } from '../schemas/home-content.schema';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { AssignVillageDto } from './dto/assign-village.dto';

// Mọi collection còn lại có field tenantId (dọn sạch khi xóa hẳn 1 tenant).
// Không dùng InjectModel riêng cho từng cái vì SuperAdminModule không cần
// phụ thuộc toàn bộ schema của các module nghiệp vụ khác — xóa thẳng qua
// tên collection Mongo (đã pluralize theo mặc định của Mongoose).
const TENANT_SCOPED_COLLECTIONS = [
  'accounts',
  'residents',
  'associationquotas',
  'auditlogs',
  'homecontents',
  'households',
  'villagefunds',
  'incidentreports',
  'residenceregistrations',
  'incidentminutes',
  'permissionmatrixes',
  'deleterequests',
  'membereditrequests',
  'newmemberrequests',
];

@Injectable()
export class SuperAdminTenantsService {
  constructor(
    @InjectModel(Tenant.name) private tenantModel: Model<TenantDocument>,
    @InjectModel(Account.name) private accountModel: Model<AccountDocument>,
    @InjectModel(Resident.name) private residentModel: Model<ResidentDocument>,
    @InjectModel(Commune.name) private communeModel: Model<CommuneDocument>,
    @InjectModel(HomeContent.name) private homeContentModel: Model<HomeContentDocument>,
    @InjectConnection() private connection: Connection,
  ) {}

  // Bỏ gán "claimed" của village trong Commune đang trỏ tới tenant này, nếu
  // có — dùng chung cho cả remove() và các chỗ unclaim khác.
  private async unclaimVillageIfLinked(tenant: TenantDocument) {
    if (tenant.communeId && tenant.communeVillageIndex !== null && tenant.communeVillageIndex !== undefined) {
      const commune = await this.communeModel.findById(tenant.communeId);
      const village = commune?.villages[tenant.communeVillageIndex];
      if (village && String(village.tenantId) === String(tenant._id)) {
        village.claimed = false;
        village.tenantId = undefined;
        await commune!.save();
      }
    }
  }

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

    // Khởi tạo sẵn nội dung trang chủ mặc định (rỗng) ngay khi tạo tenant,
    // để trang chủ công khai + trang đăng nhập có dữ liệu hiển thị ngay
    // (không 404) mà không phải chờ Admin vào "Quản lý Trang chủ" trước.
    // Admin sửa lại các trường này sau qua PUT /admin/home-content/branding.
    await this.homeContentModel.create({ tenantId: tenant._id });

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
    await this.unclaimVillageIfLinked(tenant);

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

  // Gán tenant vào đúng thôn/xã ngay sau khi tạo từ bản đồ
  // (createTenantFromVillage) — village.claimed/tenantId đã được set ở
  // phía Commune, đây là chiều ngược lại trên chính Tenant document, thiếu
  // bước này thì tenant hiện "Chưa gán" trong danh sách dù village đã claimed.
  async linkVillage(tenantId: string, communeId: string, villageIndex: number) {
    await this.tenantModel.updateOne({ _id: tenantId }, { $set: { communeId, communeVillageIndex: villageIndex } });
  }

  // Xóa hẳn 1 tenant lỗi/không dùng nữa + mọi dữ liệu liên quan theo
  // tenantId, và trả lại thôn (nếu có gán) về trạng thái "chưa ai nhận" để
  // tạo tenant mới cho đúng thôn đó từ bản đồ. Không thể hoàn tác.
  async remove(id: string) {
    const tenant = await this.tenantModel.findById(id);
    if (!tenant) throw new NotFoundException('Không tìm thấy tenant.');

    await this.unclaimVillageIfLinked(tenant);
    await Promise.all(
      TENANT_SCOPED_COLLECTIONS.map((name) => this.connection.collection(name).deleteMany({ tenantId: tenant._id })),
    );
    await this.tenantModel.deleteOne({ _id: tenant._id });

    return { deleted: true };
  }
}
