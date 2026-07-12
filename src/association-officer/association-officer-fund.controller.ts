import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { Types } from 'mongoose';
import { AssociationOfficerFundService } from './association-officer-fund.service';
import { FeeObligationDto } from './dto/fee-obligation.dto';
import { CreateAssocTxDto } from './dto/create-tx.dto';
import { UpdateAssocTxDto } from './dto/update-tx.dto';
import { UpdateBankInfoDto } from './dto/update-bank-info.dto';
import { TenantGuard } from '../common/guards/tenant.guard';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/jwt-payload.interface';

// "Quản lý Quỹ Hội" — chỉ Cán bộ Hội, phạm vi đúng 1 hội (Account.assoc).
@Controller('association-officer/fund')
@UseGuards(TenantGuard, JwtAuthGuard, RolesGuard)
@Roles('association-officer')
export class AssociationOfficerFundController {
  constructor(private fundService: AssociationOfficerFundService) {}

  @Get()
  async getOverview(@CurrentUser() user: JwtPayload) {
    return this.fundService.getOverview(new Types.ObjectId(user.tenantId), user.accountId);
  }

  @Post('obligations')
  async createFeeObligation(@CurrentUser() user: JwtPayload, @Body() dto: FeeObligationDto) {
    return this.fundService.createFeeObligation(new Types.ObjectId(user.tenantId), user.accountId, dto);
  }

  @Patch('obligations/:id')
  async updateFeeObligation(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() dto: FeeObligationDto) {
    return this.fundService.updateFeeObligation(new Types.ObjectId(user.tenantId), user.accountId, id, dto);
  }

  @Delete('obligations/:id')
  async deleteFeeObligation(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.fundService.deleteFeeObligation(new Types.ObjectId(user.tenantId), user.accountId, id);
  }

  @Patch('bank-info')
  async updateBankInfo(@CurrentUser() user: JwtPayload, @Body() dto: UpdateBankInfoDto) {
    return this.fundService.updateBankInfo(new Types.ObjectId(user.tenantId), user.accountId, dto);
  }

  @Post('transactions')
  async createTransaction(@CurrentUser() user: JwtPayload, @Body() dto: CreateAssocTxDto) {
    return this.fundService.createTransaction(new Types.ObjectId(user.tenantId), user.accountId, dto);
  }

  @Patch('transactions/:id')
  async updateTransaction(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() dto: UpdateAssocTxDto) {
    return this.fundService.updateTransaction(new Types.ObjectId(user.tenantId), user.accountId, id, dto);
  }

  @Delete('transactions/:id')
  async deleteTransaction(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.fundService.deleteTransaction(new Types.ObjectId(user.tenantId), user.accountId, id);
  }

  @Post('payments/:residentId/:obligationId/approve')
  async approvePayment(
    @CurrentUser() user: JwtPayload,
    @Param('residentId') residentId: string,
    @Param('obligationId') obligationId: string,
  ) {
    return this.fundService.approvePayment(new Types.ObjectId(user.tenantId), user.accountId, residentId, obligationId);
  }

  @Post('payments/:residentId/:obligationId/reject')
  async rejectPayment(
    @CurrentUser() user: JwtPayload,
    @Param('residentId') residentId: string,
    @Param('obligationId') obligationId: string,
  ) {
    return this.fundService.rejectPayment(new Types.ObjectId(user.tenantId), user.accountId, residentId, obligationId);
  }
}
