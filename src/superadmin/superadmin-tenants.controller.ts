import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { SuperAdminTenantsService } from './superadmin-tenants.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { AssignVillageDto } from './dto/assign-village.dto';
import { SuperAdminGuard } from '../common/guards/superadmin.guard';

@Controller('superadmin/tenants')
@UseGuards(SuperAdminGuard)
export class SuperAdminTenantsController {
  constructor(private tenantsService: SuperAdminTenantsService) {}

  @Get()
  async findAll(): Promise<Record<string, unknown>[]> {
    return this.tenantsService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.tenantsService.findOne(id);
  }

  @Post()
  async create(@Body() dto: CreateTenantDto) {
    return this.tenantsService.create(dto);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateTenantDto) {
    return this.tenantsService.update(id, dto);
  }

  @Patch(':id/assign-village')
  async assignVillage(@Param('id') id: string, @Body() dto: AssignVillageDto) {
    return this.tenantsService.assignVillage(id, dto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.tenantsService.remove(id);
  }
}
