import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { Types } from 'mongoose';
import { AdminAccountsService } from './admin-accounts.service';
import { EditAccountDto } from './dto/edit-account.dto';
import { CreateResidentDto } from './dto/create-resident.dto';
import { EditResidentInfoDto } from './dto/edit-resident.dto';
import { BulkImportResidentsDto } from './dto/bulk-import-residents.dto';
import { TenantGuard } from '../common/guards/tenant.guard';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/jwt-payload.interface';

@Controller('admin/accounts')
@UseGuards(TenantGuard, JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminAccountsController {
  constructor(private accountsService: AdminAccountsService) {}

  @Get()
  async list(@CurrentUser() user: JwtPayload) {
    return this.accountsService.list(new Types.ObjectId(user.tenantId));
  }

  @Get('associations')
  async listAssociations(@CurrentUser() user: JwtPayload) {
    return this.accountsService.listAssociationNames(new Types.ObjectId(user.tenantId));
  }

  @Patch(':id')
  async edit(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() dto: EditAccountDto) {
    return this.accountsService.editAccount(new Types.ObjectId(user.tenantId), id, dto);
  }

  @Post(':id/reset-password')
  async resetPassword(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.accountsService.resetPassword(new Types.ObjectId(user.tenantId), id);
  }

  @Post(':id/lock')
  async lock(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.accountsService.toggleStatus(new Types.ObjectId(user.tenantId), id, 'locked');
  }

  @Post(':id/unlock')
  async unlock(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.accountsService.toggleStatus(new Types.ObjectId(user.tenantId), id, 'active');
  }

  @Post('sync')
  async sync(@CurrentUser() user: JwtPayload) {
    return this.accountsService.syncAllResidentAccounts(new Types.ObjectId(user.tenantId));
  }

  @Post('residents')
  async createResident(@CurrentUser() user: JwtPayload, @Body() dto: CreateResidentDto) {
    return this.accountsService.createResident(new Types.ObjectId(user.tenantId), dto);
  }

  @Post('residents/bulk-import')
  async bulkImportResidents(@CurrentUser() user: JwtPayload, @Body() dto: BulkImportResidentsDto) {
    return this.accountsService.bulkImportResidents(new Types.ObjectId(user.tenantId), dto.rows);
  }

  @Get('residents/:residentId')
  async getResidentInfo(@CurrentUser() user: JwtPayload, @Param('residentId') residentId: string) {
    return this.accountsService.getResidentInfo(new Types.ObjectId(user.tenantId), residentId);
  }

  @Patch('residents/:residentId')
  async editResidentInfo(
    @CurrentUser() user: JwtPayload,
    @Param('residentId') residentId: string,
    @Body() dto: EditResidentInfoDto,
  ) {
    return this.accountsService.editResidentInfo(new Types.ObjectId(user.tenantId), residentId, dto);
  }

  @Delete('residents/:residentId')
  async deleteResident(@CurrentUser() user: JwtPayload, @Param('residentId') residentId: string) {
    return this.accountsService.deleteResident(new Types.ObjectId(user.tenantId), residentId);
  }
}
