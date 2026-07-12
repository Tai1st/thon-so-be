import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { Types } from 'mongoose';
import { VillageHeadResidentsService } from './village-head-residents.service';
import { EditResidentDto } from './dto/edit-resident.dto';
import { CreateDeleteRequestDto } from './dto/create-delete-request.dto';
import { UpdateGpsDto } from './dto/update-gps.dto';
import { TenantGuard } from '../common/guards/tenant.guard';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/jwt-payload.interface';

// Mục "Quản lý Toàn Thôn" — chỉ Trưởng thôn được sửa trực tiếp thông tin
// nhân khẩu (khác Cư dân/Cán bộ Hội phải gửi request chờ Admin duyệt).
@Controller('village-head')
@UseGuards(TenantGuard, JwtAuthGuard, RolesGuard)
@Roles('village-head')
export class VillageHeadResidentsController {
  constructor(private residentsService: VillageHeadResidentsService) {}

  @Get('residents')
  async listResidents(@CurrentUser() user: JwtPayload, @Query('q') q?: string) {
    return this.residentsService.listResidents(new Types.ObjectId(user.tenantId), q);
  }

  @Patch('residents/:id')
  async editResident(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: EditResidentDto,
  ) {
    return this.residentsService.editResident(new Types.ObjectId(user.tenantId), id, dto);
  }

  @Post('delete-requests')
  async createDeleteRequest(@CurrentUser() user: JwtPayload, @Body() dto: CreateDeleteRequestDto) {
    return this.residentsService.createDeleteRequest(
      new Types.ObjectId(user.tenantId),
      user.accountId,
      dto,
    );
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
}
