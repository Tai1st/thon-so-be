import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { Types } from 'mongoose';
import { AdminAssociationsService } from './admin-associations.service';
import { CreateAssociationDto, RenameAssociationDto } from './dto/association.dto';
import { TenantGuard } from '../common/guards/tenant.guard';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/jwt-payload.interface';

@Controller('admin/associations')
@UseGuards(TenantGuard, JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminAssociationsController {
  constructor(private associationsService: AdminAssociationsService) {}

  @Get()
  list(@CurrentUser() user: JwtPayload) {
    return this.associationsService.list(new Types.ObjectId(user.tenantId));
  }

  @Post()
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateAssociationDto) {
    return this.associationsService.create(new Types.ObjectId(user.tenantId), dto);
  }

  @Patch(':name')
  rename(@CurrentUser() user: JwtPayload, @Param('name') name: string, @Body() dto: RenameAssociationDto) {
    return this.associationsService.rename(new Types.ObjectId(user.tenantId), name, dto);
  }

  @Delete(':name')
  dissolve(@CurrentUser() user: JwtPayload, @Param('name') name: string) {
    return this.associationsService.dissolve(new Types.ObjectId(user.tenantId), name);
  }
}
