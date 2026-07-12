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

// Logo mặc định cho MỌI tenant mới — Admin tự đổi sau qua "Quản lý Trang
// chủ" > Thương hiệu (PUT /admin/home-content/branding).
const DEFAULT_LOGO_URL = 'https://i.ibb.co/Fktt9Cn7/image.png';

function randomId(prefix: string): string {
  return `${prefix}-${Math.floor(1000 + Math.random() * 9000)}`;
}

function todayDisplay(): string {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

// Nội dung trang chủ mẫu cho tenant mới, khớp số lượng/cấu trúc bản mẫu
// "doanket" — CHỈ 2 chỉ số gắn với dữ liệu cư dân thật (Quy Mô Dân Cư/Tổng
// Số Nhân Khẩu, do scripts/setup-tenant-stats.ts tính lại từ Resident/
// Household thật) và Diện Tích Tự Nhiên (số liệu khảo sát đất đai thật của
// từng thôn) mới để "Chưa cập nhật" — còn lại (tin tức/sản vật/lịch công
// tác/thư viện ảnh/khẩu hiệu ANTT) là nội dung mẫu chung chung, không gắn
// tên thôn/cán bộ cụ thể nào, để Admin tự sửa lại sau.
function defaultHomeContent() {
  const today = todayDisplay();
  return {
    security: {
      hotline: '',
      hotlineDisplay: '',
      slogan: 'Đoàn kết - Chủ động - Kỷ cương - An toàn',
    },
    stats: [
      { id: randomId('STAT'), icon: 'fa-map-location-dot', label: 'Diện Tích Tự Nhiên', value: 'Chưa cập nhật', unit: '', breakdown: [] },
      { id: randomId('STAT'), icon: 'fa-house-chimney', label: 'Quy Mô Dân Cư', value: 'Chưa cập nhật', unit: 'hộ', breakdown: [] },
      { id: randomId('STAT'), icon: 'fa-people-group', label: 'Tổng Số Nhân Khẩu', value: 'Chưa cập nhật', unit: 'người', breakdown: [] },
    ],
    news: [
      {
        id: randomId('NEWS'),
        categorySlug: 'hanh-chinh',
        category: 'Hành chính',
        colorClass: 'bg-red-100 text-red-600',
        date: today,
        title: 'Chào mừng đến với Cổng Thông Tin Điện Tử',
        summary: 'Nội dung trang chủ đang được Ban quản lý thôn cập nhật.',
        content: 'Nội dung trang chủ đang được Ban quản lý thôn cập nhật. Vui lòng quay lại sau.',
        createdBy: 'Admin',
      },
      {
        id: randomId('NEWS'),
        categorySlug: 'san-xuat',
        category: 'Sản xuất',
        colorClass: 'bg-emerald-100 text-emerald-600',
        date: today,
        title: 'Chương trình tập huấn kỹ thuật canh tác nông nghiệp',
        summary: 'Hội Nông dân phối hợp tổ chức các lớp tập huấn nâng cao kỹ thuật canh tác cho bà con trong thôn.',
        content:
          'Nhằm nâng cao năng suất và chất lượng nông sản, Hội Nông dân phối hợp cùng các kỹ sư nông nghiệp tổ chức chương trình tập huấn kỹ thuật canh tác cho bà con trong thôn.\n\nThông tin chi tiết về thời gian, địa điểm sẽ được Ban quản lý thôn cập nhật cụ thể.',
        createdBy: 'Admin',
      },
      {
        id: randomId('NEWS'),
        categorySlug: 'doan-the',
        category: 'Đoàn thể',
        colorClass: 'bg-amber-100 text-amber-600',
        date: today,
        title: 'Phát động phong trào "Ngày Chủ Nhật Xanh"',
        summary: 'Chi đoàn Thanh niên và Hội Phụ nữ phát động toàn dân tham gia dọn dẹp vệ sinh đường làng.',
        content:
          'Thực hiện tiêu chí Xanh - Sạch - Đẹp trong xây dựng Nông thôn mới, Chi đoàn Thanh niên phối hợp Hội Liên hiệp Phụ nữ phát động phong trào ra quân vệ sinh môi trường, trồng cây xanh dọc các tuyến đường trong thôn.\n\nKính mời bà con nhân dân cùng tham gia đóng góp ngày công.',
        createdBy: 'Admin',
      },
    ],
    products: [
      {
        id: randomId('PRD'),
        name: 'Cà Phê Robusta',
        badge: 'Chủ Lực',
        image: 'https://placehold.co/400x260/dcfce7/15803d?text=Ca+Phe+Robusta',
        desc: 'Hạt cà phê Robusta đậm đà đặc sản Tây Nguyên, trồng hữu cơ cho hương thơm thuần khiết và vị đậm mạnh mẽ.',
        footerLabel: 'Sản lượng năm:',
        footerValue: 'Chưa cập nhật',
      },
      {
        id: randomId('PRD'),
        name: 'Sầu Riêng Ri6',
        badge: 'Giá Trị Cao',
        image: 'https://placehold.co/400x260/fef3c7/b45309?text=Sau+Rieng+Ri6',
        desc: 'Cơm vàng hạt lép, dẻo ngọt đậm hương thơm, thu hoạch theo quy trình xuất khẩu sạch, an toàn cho người tiêu dùng.',
        footerLabel: 'Diện tích:',
        footerValue: 'Chưa cập nhật',
      },
      {
        id: randomId('PRD'),
        name: 'Hồ Tiêu Đen',
        badge: 'Truyền Thống',
        image: 'https://placehold.co/400x260/fee2e2/b91c1c?text=Ho+Tieu+Den',
        desc: 'Hạt chắc, độ cay nồng sâu và thơm tự nhiên đặc trưng. Là mặt hàng thế mạnh lâu đời của bà con trong thôn.',
        footerLabel: 'Tiêu chuẩn:',
        footerValue: 'VietGAP',
      },
      {
        id: randomId('PRD'),
        name: 'Hạt Mắc Ca',
        badge: 'Kinh Tế Mới',
        image: 'https://placehold.co/400x260/e0e7ff/4338ca?text=Mac+Ca',
        desc: 'Nữ hoàng các loại hạt, hạt to tròn đều, chứa hàm lượng dinh dưỡng cao, béo ngậy được thị trường ưa chuộng.',
        footerLabel: 'Sản xuất:',
        footerValue: 'Sấy nứt vỏ',
      },
      {
        id: randomId('PRD'),
        name: 'Chanh Dây Tím',
        badge: 'Dài Hạn',
        image: 'https://placehold.co/400x260/fae8ff/86198f?text=Chanh+Day',
        desc: 'Sản vật mọng nước, vị chua ngọt dạt dào sảng khoái, nguồn nguyên liệu hoàn hảo xuất khẩu đi các nước EU.',
        footerLabel: 'Nguồn gốc:',
        footerValue: 'Chuẩn xuất khẩu',
      },
    ],
    schedule: [
      { id: randomId('SCH'), day: '25', month: 'Tháng 5', title: 'Hội nghị nhân dân quý II', location: 'Nhà văn hóa thôn', time: '07:30' },
      { id: randomId('SCH'), day: '28', month: 'Tháng 5', title: 'Tập huấn kỹ thuật canh tác nông nghiệp', location: 'Vườn mẫu thôn', time: '08:00' },
      { id: randomId('SCH'), day: '05', month: 'Tháng 6', title: 'Ngày Chủ nhật xanh', location: 'Toàn thôn', time: '07:00' },
    ],
    gallery: [
      { id: randomId('GAL'), image: 'https://placehold.co/400x260/dcfce7/15803d?text=Hop+trien+khai', caption: 'Họp triển khai kế hoạch sản xuất' },
      { id: randomId('GAL'), image: 'https://placehold.co/400x260/fef3c7/b45309?text=Thu+hoach', caption: 'Bà con thu hoạch nông sản đầu vụ' },
      { id: randomId('GAL'), image: 'https://placehold.co/400x260/dbeafe/1e40af?text=Ra+quan+ve+sinh', caption: 'Ra quân vệ sinh môi trường, trồng cây xanh' },
    ],
  };
}

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
      logoUrl: DEFAULT_LOGO_URL,
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

    // Khởi tạo sẵn nội dung trang chủ mẫu ngay khi tạo tenant, để trang chủ
    // công khai + trang đăng nhập có dữ liệu hiển thị ngay (không 404, không
    // trống trơn) mà không phải chờ Admin vào "Quản lý Trang chủ" trước.
    // Admin sửa lại các trường này sau qua PUT /admin/home-content/branding
    // và các endpoint CRUD news/stats/... tương ứng.
    await this.homeContentModel.create({ tenantId: tenant._id, ...defaultHomeContent() });

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
