import { Controller, Get } from '@nestjs/common';
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

  // Trụ sở cơ quan cấp xã (Đảng ủy, HĐND-UBND, MTTQ, Công an xã...) — hiển
  // thị chung cho mọi tenant cùng 1 xã trên bản đồ danh mục (mục 6, mục 9
  // tài liệu thiết kế).
  @Get('administrative-units')
  async listAdministrativeUnits() {
    const units = await this.tenantService.findAllAdministrativeUnits();
    return units.map((u) => ({
      name: u.name,
      logoUrl: u.logoUrl ?? null,
      lat: u.lat,
      lng: u.lng,
      mapsUrl: u.mapsUrl ?? null,
    }));
  }
}
