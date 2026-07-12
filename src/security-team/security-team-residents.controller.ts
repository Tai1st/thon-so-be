import { Body, Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { Types } from 'mongoose';
import { SecurityTeamResidentsService } from './security-team-residents.service';
import { UpdateGpsDto } from './dto/update-gps.dto';
import { TenantGuard } from '../common/guards/tenant.guard';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/jwt-payload.interface';

// "Quản Lý Dân Cư" (chỉ xem) + "Thành Viên Tổ ANTT" — chỉ Tổ ANTT.
@Controller('security-team')
@UseGuards(TenantGuard, JwtAuthGuard, RolesGuard)
@Roles('security-team')
export class SecurityTeamResidentsController {
  constructor(private residentsService: SecurityTeamResidentsService) {}

  @Get('residents')
  async listResidents(@CurrentUser() user: JwtPayload, @Query('q') q?: string) {
    return this.residentsService.listResidents(new Types.ObjectId(user.tenantId), q);
  }

  @Get('households/:familyId/location')
  async getHouseholdLocation(@CurrentUser() user: JwtPayload, @Param('familyId') familyId: string) {
    return this.residentsService.getHouseholdLocation(new Types.ObjectId(user.tenantId), familyId);
  }

  @Patch('households/:familyId/gps')
  async updateHouseholdGps(
    @CurrentUser() user: JwtPayload,
    @Param('familyId') familyId: string,
    @Body() dto: UpdateGpsDto,
  ) {
    return this.residentsService.updateHouseholdGps(new Types.ObjectId(user.tenantId), familyId, dto);
  }

  @Get('roster')
  async listRoster(@CurrentUser() user: JwtPayload) {
    return this.residentsService.listRoster(new Types.ObjectId(user.tenantId));
  }
}
