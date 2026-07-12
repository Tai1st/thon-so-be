import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { Types } from 'mongoose';
import { SecurityTeamReportsService } from './security-team-reports.service';
import { UpdateIncidentStatusDto } from './dto/update-incident-status.dto';
import { DecideResidenceDto } from './dto/decide-residence.dto';
import { TenantGuard } from '../common/guards/tenant.guard';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/jwt-payload.interface';

// "Tin Báo Từ Cư Dân" + "Duyệt Đăng Ký Lưu Trú" — chỉ Tổ ANTT.
@Controller('security-team')
@UseGuards(TenantGuard, JwtAuthGuard, RolesGuard)
@Roles('security-team')
export class SecurityTeamReportsController {
  constructor(private reportsService: SecurityTeamReportsService) {}

  @Get('incident-reports')
  async listIncidentReports(@CurrentUser() user: JwtPayload) {
    return this.reportsService.listIncidentReports(new Types.ObjectId(user.tenantId));
  }

  @Patch('incident-reports/:id/status')
  async updateIncidentStatus(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateIncidentStatusDto,
  ) {
    return this.reportsService.updateIncidentStatus(new Types.ObjectId(user.tenantId), id, dto, user.accountId);
  }

  @Get('residence-registrations')
  async listResidenceRegistrations(@CurrentUser() user: JwtPayload) {
    return this.reportsService.listResidenceRegistrations(new Types.ObjectId(user.tenantId));
  }

  @Patch('residence-registrations/:id/decide')
  async decideResidenceRegistration(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: DecideResidenceDto,
  ) {
    return this.reportsService.decideResidenceRegistration(new Types.ObjectId(user.tenantId), id, dto, user.accountId);
  }
}
