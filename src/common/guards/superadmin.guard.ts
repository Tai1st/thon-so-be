import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

export interface SuperAdminPayload {
  superAdminId: string;
  scope: 'superadmin';
}

export interface RequestWithSuperAdmin extends Request {
  superAdmin?: SuperAdminPayload;
}

// Superadmin KHÔNG gắn tenant nào (mục 5 tài liệu thiết kế) — guard này độc
// lập hoàn toàn với TenantGuard/JwtAuthGuard dùng cho các route trong 1
// tenant. Phân biệt bằng payload.scope === 'superadmin' để token của 1
// Account thường (dù có bị đánh cắp) không thể dùng lại ở đây.
@Injectable()
export class SuperAdminGuard implements CanActivate {
  constructor(private jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<RequestWithSuperAdmin>();
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Chưa đăng nhập superadmin.');
    }
    const token = authHeader.slice('Bearer '.length);
    let payload: SuperAdminPayload;
    try {
      payload = this.jwtService.verify<SuperAdminPayload>(token);
    } catch {
      throw new UnauthorizedException('Phiên đăng nhập không hợp lệ hoặc đã hết hạn.');
    }
    if (payload.scope !== 'superadmin') {
      throw new UnauthorizedException('Token không có quyền superadmin.');
    }
    req.superAdmin = payload;
    return true;
  }
}
