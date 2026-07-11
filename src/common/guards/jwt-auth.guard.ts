import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { RequestWithTenant } from './tenant.guard';
import { JwtPayload } from '../../auth/jwt-payload.interface';

export interface RequestWithUser extends RequestWithTenant {
  user?: JwtPayload;
}

// Chạy SAU TenantGuard (thứ tự guard trong @UseGuards). Xác thực JWT rồi
// đối chiếu tenantId trong token với tenant vừa resolve từ subdomain — sai
// thôn thì coi như chưa đăng nhập (401), không rò rỉ việc tài khoản có
// tồn tại ở tenant khác hay không (mục 5.1 tài liệu thiết kế).
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<RequestWithUser>();
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Chưa đăng nhập.');
    }
    const token = authHeader.slice('Bearer '.length);
    let payload: JwtPayload;
    try {
      payload = this.jwtService.verify<JwtPayload>(token);
    } catch {
      throw new UnauthorizedException('Phiên đăng nhập không hợp lệ hoặc đã hết hạn.');
    }
    if (!req.tenant || payload.tenantId !== String(req.tenant._id)) {
      throw new UnauthorizedException('Phiên đăng nhập không khớp với thôn này.');
    }
    req.user = payload;
    return true;
  }
}
