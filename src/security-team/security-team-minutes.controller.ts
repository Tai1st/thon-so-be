import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { Types } from 'mongoose';
import { SecurityTeamMinutesService } from './security-team-minutes.service';
import { CreateIncidentMinutesDto } from './dto/create-incident-minutes.dto';
import { UpdateIncidentMinutesDto } from './dto/update-incident-minutes.dto';
import { TenantGuard } from '../common/guards/tenant.guard';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/jwt-payload.interface';

// "Biên Bản Sự Việc" — chỉ Tổ ANTT xem/lập được, không hiện với cư dân.
@Controller('security-team/incident-minutes')
@UseGuards(TenantGuard, JwtAuthGuard, RolesGuard)
@Roles('security-team')
export class SecurityTeamMinutesController {
  constructor(private minutesService: SecurityTeamMinutesService) {}

  @Get()
  async list(@CurrentUser() user: JwtPayload) {
    return this.minutesService.list(new Types.ObjectId(user.tenantId));
  }

  @Post()
  async create(@CurrentUser() user: JwtPayload, @Body() dto: CreateIncidentMinutesDto) {
    return this.minutesService.create(new Types.ObjectId(user.tenantId), user.accountId, dto);
  }

  @Patch(':id')
  async update(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() dto: UpdateIncidentMinutesDto) {
    return this.minutesService.update(new Types.ObjectId(user.tenantId), user.accountId, id, dto);
  }

  @Delete(':id')
  async delete(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.minutesService.delete(new Types.ObjectId(user.tenantId), user.accountId, id);
  }
}
