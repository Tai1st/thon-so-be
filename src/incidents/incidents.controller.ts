import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { Types } from 'mongoose';
import { IncidentsService } from './incidents.service';
import { CreateIncidentReportDto } from './dto/create-incident-report.dto';
import { CreateResidenceRegistrationDto } from './dto/create-residence-registration.dto';
import { TenantGuard } from '../common/guards/tenant.guard';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/jwt-payload.interface';

// Tin báo ANTT + đăng ký lưu trú do cư dân gửi (mục "Báo ANTT" / "Đăng Ký
// Lưu Trú" tài liệu thiết kế) — chỉ có route tạo/xem của chính hộ mình ở
// đây; duyệt/xử lý thuộc phạm vi Tổ ANTT, chưa làm ở giai đoạn này.
@Controller()
@UseGuards(TenantGuard, JwtAuthGuard)
export class IncidentsController {
  constructor(private incidentsService: IncidentsService) {}

  @Post('incident-reports')
  async createIncidentReport(@CurrentUser() user: JwtPayload, @Body() dto: CreateIncidentReportDto) {
    return this.incidentsService.createIncidentReport(
      new Types.ObjectId(user.tenantId),
      user.accountId,
      dto,
    );
  }

  @Get('incident-reports/mine')
  async getMyIncidentReports(@CurrentUser() user: JwtPayload) {
    return this.incidentsService.getMyIncidentReports(new Types.ObjectId(user.tenantId), user.accountId);
  }

  @Post('residence-registrations')
  async createResidenceRegistration(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateResidenceRegistrationDto,
  ) {
    return this.incidentsService.createResidenceRegistration(
      new Types.ObjectId(user.tenantId),
      user.accountId,
      dto,
    );
  }

  @Get('residence-registrations/mine')
  async getMyResidenceRegistrations(@CurrentUser() user: JwtPayload) {
    return this.incidentsService.getMyResidenceRegistrations(
      new Types.ObjectId(user.tenantId),
      user.accountId,
    );
  }
}
