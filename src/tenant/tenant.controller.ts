import { Controller, Get } from '@nestjs/common';
import { TenantService } from './tenant.service';

// Public — không cần auth (mục 4.1 tài liệu thiết kế): danh sách tenant
// active cho trang danh mục ở domain gốc.
@Controller('tenants')
export class TenantController {
  constructor(private tenantService: TenantService) {}

  @Get('public')
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
}
