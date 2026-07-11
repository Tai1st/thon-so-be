import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { RequestWithUser } from './jwt-auth.guard';
import { Role } from '../../schemas/account.schema';

// Chạy sau JwtAuthGuard. Không có @Roles(...) trên handler => cho qua
// (endpoint chỉ cần đăng nhập, không giới hạn vai trò cụ thể).
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles || requiredRoles.length === 0) return true;

    const req = context.switchToHttp().getRequest<RequestWithUser>();
    if (!req.user || !requiredRoles.includes(req.user.role)) {
      throw new ForbiddenException('Vai trò của bạn không có quyền truy cập chức năng này.');
    }
    return true;
  }
}
