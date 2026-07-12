import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { Types } from 'mongoose';
import { AssociationOfficerLoansService } from './association-officer-loans.service';
import { CreateLoanDto } from './dto/create-loan.dto';
import { TenantGuard } from '../common/guards/tenant.guard';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/jwt-payload.interface';

// "Vay Vốn Hội Viên" — chỉ Cán bộ Hội.
@Controller('association-officer/loans')
@UseGuards(TenantGuard, JwtAuthGuard, RolesGuard)
@Roles('association-officer')
export class AssociationOfficerLoansController {
  constructor(private loansService: AssociationOfficerLoansService) {}

  @Get()
  async list(@CurrentUser() user: JwtPayload) {
    return this.loansService.list(new Types.ObjectId(user.tenantId), user.accountId);
  }

  @Post()
  async create(@CurrentUser() user: JwtPayload, @Body() dto: CreateLoanDto) {
    return this.loansService.create(new Types.ObjectId(user.tenantId), user.accountId, dto);
  }

  @Post(':id/complete')
  async complete(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.loansService.complete(new Types.ObjectId(user.tenantId), user.accountId, id);
  }

  @Delete(':id')
  async delete(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.loansService.delete(new Types.ObjectId(user.tenantId), user.accountId, id);
  }
}
