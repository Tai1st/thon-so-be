import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { Types } from 'mongoose';
import { VillageHeadFundService } from './village-head-fund.service';
import { FundObligationDto } from './dto/fund-obligation.dto';
import { CreateVillageFundTxDto } from './dto/create-village-fund-tx.dto';
import { UpdateVillageFundTxDto } from './dto/update-village-fund-tx.dto';
import { UpdateBankInfoDto } from './dto/update-bank-info.dto';
import { TenantGuard } from '../common/guards/tenant.guard';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/jwt-payload.interface';

// Mục "Quản lý Quỹ Thôn" — chỉ Trưởng thôn.
@Controller('village-head/village-fund')
@UseGuards(TenantGuard, JwtAuthGuard, RolesGuard)
@Roles('village-head')
export class VillageHeadFundController {
  constructor(private fundService: VillageHeadFundService) {}

  @Get()
  async getOverview(@CurrentUser() user: JwtPayload) {
    return this.fundService.getOverview(new Types.ObjectId(user.tenantId));
  }

  @Post('obligations')
  async createObligation(@CurrentUser() user: JwtPayload, @Body() dto: FundObligationDto) {
    return this.fundService.createObligation(new Types.ObjectId(user.tenantId), dto);
  }

  @Patch('obligations/:id')
  async updateObligation(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: FundObligationDto,
  ) {
    return this.fundService.updateObligation(new Types.ObjectId(user.tenantId), id, dto);
  }

  @Delete('obligations/:id')
  async deleteObligation(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.fundService.deleteObligation(new Types.ObjectId(user.tenantId), id);
  }

  @Patch('bank-info')
  async updateBankInfo(@CurrentUser() user: JwtPayload, @Body() dto: UpdateBankInfoDto) {
    return this.fundService.updateBankInfo(new Types.ObjectId(user.tenantId), dto);
  }

  @Post('transactions')
  async createTransaction(@CurrentUser() user: JwtPayload, @Body() dto: CreateVillageFundTxDto) {
    return this.fundService.createTransaction(new Types.ObjectId(user.tenantId), dto);
  }

  @Patch('transactions/:type/:id')
  async updateTransaction(
    @CurrentUser() user: JwtPayload,
    @Param('type') type: 'thu' | 'chi',
    @Param('id') id: string,
    @Body() dto: UpdateVillageFundTxDto,
  ) {
    return this.fundService.updateTransaction(new Types.ObjectId(user.tenantId), type, id, dto);
  }

  @Delete('transactions/:type/:id')
  async deleteTransaction(
    @CurrentUser() user: JwtPayload,
    @Param('type') type: 'thu' | 'chi',
    @Param('id') id: string,
  ) {
    return this.fundService.deleteTransaction(new Types.ObjectId(user.tenantId), type, id);
  }

  @Post('payments/:familyId/:obligationId/approve')
  async approvePayment(
    @CurrentUser() user: JwtPayload,
    @Param('familyId') familyId: string,
    @Param('obligationId') obligationId: string,
  ) {
    return this.fundService.approvePayment(new Types.ObjectId(user.tenantId), familyId, obligationId);
  }

  @Post('payments/:familyId/:obligationId/reject')
  async rejectPayment(
    @CurrentUser() user: JwtPayload,
    @Param('familyId') familyId: string,
    @Param('obligationId') obligationId: string,
  ) {
    return this.fundService.rejectPayment(new Types.ObjectId(user.tenantId), familyId, obligationId);
  }
}
