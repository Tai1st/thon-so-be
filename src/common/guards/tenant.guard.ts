import {
  CanActivate,
  ExecutionContext,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Request } from 'express';
import { TenantService } from '../../tenant/tenant.service';
import { TenantDocument } from '../../schemas/tenant.schema';

export interface RequestWithTenant extends Request {
  tenant?: TenantDocument;
}

// Đọc header x-tenant-slug (do middleware Next.js forward — mục 4 tài liệu
// thiết kế), resolve Tenant thật từ Mongo, gắn vào req.tenant. Không tự xử
// lý JWT ở đây — JwtAuthGuard chạy sau sẽ đối chiếu tenantId trong token.
@Injectable()
export class TenantGuard implements CanActivate {
  constructor(private tenantService: TenantService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<RequestWithTenant>();
    const slug = req.headers['x-tenant-slug'];
    if (!slug || typeof slug !== 'string') {
      throw new NotFoundException('Thiếu thông tin thôn (x-tenant-slug).');
    }
    const tenant = await this.tenantService.findActiveBySlug(slug);
    if (!tenant) {
      throw new NotFoundException('Không tìm thấy thôn này.');
    }
    req.tenant = tenant;
    return true;
  }
}
