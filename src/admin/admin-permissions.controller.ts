import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { Types } from 'mongoose';
import { AdminPermissionsService } from './admin-permissions.service';
import { UpdatePermissionDto } from './dto/update-permission.dto';
import { TenantGuard } from '../common/guards/tenant.guard';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/jwt-payload.interface';

@Controller('admin/permissions')
@UseGuards(TenantGuard, JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminPermissionsController {
  constructor(private permissionsService: AdminPermissionsService) {}

  @Get()
  async get(@CurrentUser() user: JwtPayload) {
    return this.permissionsService.get(new Types.ObjectId(user.tenantId));
  }

  @Patch()
  async update(@CurrentUser() user: JwtPayload, @Body() dto: UpdatePermissionDto) {
    return this.permissionsService.update(new Types.ObjectId(user.tenantId), dto);
  }
}
