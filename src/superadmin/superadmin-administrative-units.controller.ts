import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { SuperAdminAdministrativeUnitsService } from './superadmin-administrative-units.service';
import { CreateAdministrativeUnitDto, UpdateAdministrativeUnitDto } from './dto/administrative-unit.dto';
import { SuperAdminGuard } from '../common/guards/superadmin.guard';

@Controller('superadmin/administrative-units')
@UseGuards(SuperAdminGuard)
export class SuperAdminAdministrativeUnitsController {
  constructor(private administrativeUnitsService: SuperAdminAdministrativeUnitsService) {}

  @Get()
  async findAll() {
    return this.administrativeUnitsService.findAll();
  }

  @Post()
  async create(@Body() dto: CreateAdministrativeUnitDto) {
    return this.administrativeUnitsService.create(dto);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateAdministrativeUnitDto) {
    return this.administrativeUnitsService.update(id, dto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.administrativeUnitsService.remove(id);
  }
}
