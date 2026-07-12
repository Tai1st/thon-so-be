import { Controller, Get, UseGuards } from '@nestjs/common';
import { Types } from 'mongoose';
import { AdminAuditService } from './admin-audit.service';
import { TenantGuard } from '../common/guards/tenant.guard';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/jwt-payload.interface';

@Controller('admin/logs')
@UseGuards(TenantGuard, JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminLogsController {
  constructor(private auditService: AdminAuditService) {}

  @Get()
  async list(@CurrentUser() user: JwtPayload) {
    return this.auditService.list(new Types.ObjectId(user.tenantId));
  }
}
