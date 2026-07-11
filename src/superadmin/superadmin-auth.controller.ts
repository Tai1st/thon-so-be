import { Body, Controller, Post } from '@nestjs/common';
import { SuperAdminAuthService } from './superadmin-auth.service';
import { SuperAdminLoginDto } from './dto/superadmin-login.dto';

@Controller('superadmin/auth')
export class SuperAdminAuthController {
  constructor(private superAdminAuthService: SuperAdminAuthService) {}

  @Post('login')
  async login(@Body() dto: SuperAdminLoginDto) {
    return this.superAdminAuthService.login(dto.username, dto.password);
  }
}
