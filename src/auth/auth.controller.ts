import { Body, Controller, Get, NotFoundException, Patch, Post, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangeOwnPasswordDto } from './dto/change-own-password.dto';
import { TenantGuard } from '../common/guards/tenant.guard';
import { CurrentTenant } from '../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import type { TenantDocument } from '../schemas/tenant.schema';
import type { JwtPayload } from './jwt-payload.interface';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  // Không đặt JwtAuthGuard ở đây — login chính là bước TẠO ra JWT.
  // TenantGuard vẫn bắt buộc: phải biết đang đăng nhập vào thôn nào trước
  // khi tìm account (mục 5 tài liệu thiết kế).
  @UseGuards(TenantGuard)
  @Post('login')
  async login(@Body() dto: LoginDto, @CurrentTenant() tenant: TenantDocument) {
    if (!tenant) throw new NotFoundException('Không tìm thấy thôn này.');
    return this.authService.login(tenant._id, dto.username, dto.password);
  }

  // "Ai đang đăng nhập" — mọi dashboard FE đều cần gọi endpoint này đầu
  // tiên để biết role/tên hiển thị mà không phải tự giải mã JWT ở client.
  @UseGuards(TenantGuard, JwtAuthGuard)
  @Get('me')
  async me(@CurrentUser() user: JwtPayload) {
    return this.authService.me(user.tenantId, user.accountId);
  }

  // Chủ tài khoản tự sửa hồ sơ (avatarUrl) — không cần role admin, chỉ cần
  // đã đăng nhập, vì chỉ thao tác lên chính tài khoản của mình.
  @UseGuards(TenantGuard, JwtAuthGuard)
  @Patch('me')
  async updateProfile(@CurrentUser() user: JwtPayload, @Body() dto: UpdateProfileDto) {
    return this.authService.updateProfile(user.tenantId, user.accountId, dto);
  }

  @UseGuards(TenantGuard, JwtAuthGuard)
  @Post('me/change-password')
  async changeOwnPassword(@CurrentUser() user: JwtPayload, @Body() dto: ChangeOwnPasswordDto) {
    return this.authService.changeOwnPassword(user.tenantId, user.accountId, dto);
  }
}
