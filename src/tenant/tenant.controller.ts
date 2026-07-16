import { Controller, Get, Query } from '@nestjs/common';
import { TenantService } from './tenant.service';

// Public — không cần auth (mục 4.1 tài liệu thiết kế): danh sách tenant
// active cho trang danh mục ở domain gốc.
@Controller()
export class TenantController {
  constructor(private tenantService: TenantService) {}

  @Get('tenants/public')
  async listPublic() {
    const tenants = await this.tenantService.findAllActive();
    return tenants.map((t) => ({
      slug: t.slug,
      name: t.name,
      lat: t.lat,
      lng: t.lng,
      boundary: t.boundary,
    }));
  }

  // Danh mục mọi Xã + thôn cho trang danh mục ở domain gốc (mục 4.1 tài
  // liệu thiết kế) — FE gọi qua /communes/public khi không xác định được
  // tenant slug từ subdomain.
  @Get('communes/public')
  async listPublicCommunes() {
    return this.tenantService.findAllPublicCommunes();
  }

  // Địa danh trên bản đồ danh mục — trụ sở cơ quan (Đảng ủy, UBND, MTTQ,
  // Công an) VÀ các địa điểm khác (quán ăn, tạp hóa...), gán theo TỪNG XÃ
  // (mục 6, mục 9 tài liệu thiết kế). FE trang danh mục domain gốc truyền
  // ?communeId=<xã đang hiển thị> — thiếu communeId thì trả rỗng, vì không
  // còn cách nào biết nên hiện địa danh của xã nào.
  @Get('administrative-units')
  async listAdministrativeUnits(@Query('communeId') communeId?: string) {
    if (!communeId) return [];
    const units = await this.tenantService.findAllAdministrativeUnits(communeId);
    return units.map((u) => ({
      name: u.name,
      category: u.category,
      logoUrl: u.logoUrl ?? null,
      lat: u.lat,
      lng: u.lng,
      mapsUrl: u.mapsUrl ?? null,
    }));
  }
}
