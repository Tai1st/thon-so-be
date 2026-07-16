import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { Types } from 'mongoose';
import { HouseholdsService } from './households.service';
import { UpdateGpsDto } from './dto/update-gps.dto';
import { UpdateHouseNumberDto } from './dto/update-house-number.dto';
import { TenantGuard } from '../common/guards/tenant.guard';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/jwt-payload.interface';

// Mọi endpoint dưới đây thao tác trên "hộ gia đình của người đang đăng
// nhập" (resolve qua Account.residentId -> Resident.familyId trong
// service) — không có route đọc/sửa hộ của người khác ở đây (đó thuộc
// phạm vi Trưởng thôn/Admin, chưa làm ở giai đoạn này).
@Controller('households')
@UseGuards(TenantGuard, JwtAuthGuard)
export class HouseholdsController {
  constructor(private householdsService: HouseholdsService) {}

  @Get('me')
  async getMine(@CurrentUser() user: JwtPayload) {
    return this.householdsService.getMine(new Types.ObjectId(user.tenantId), user.accountId);
  }

  @Patch('me/gps')
  async updateGps(@CurrentUser() user: JwtPayload, @Body() dto: UpdateGpsDto) {
    return this.householdsService.updateGps(
      new Types.ObjectId(user.tenantId),
      user.accountId,
      dto.lat,
      dto.lng,
    );
  }

  @Patch('me/house-number')
  async updateHouseNumber(@CurrentUser() user: JwtPayload, @Body() dto: UpdateHouseNumberDto) {
    return this.householdsService.updateHouseNumber(
      new Types.ObjectId(user.tenantId),
      user.accountId,
      dto.houseNumber,
    );
  }

  @Get('village-fund')
  async getVillageFund(@CurrentUser() user: JwtPayload) {
    return this.householdsService.getVillageFund(new Types.ObjectId(user.tenantId));
  }

  @Patch('me/fund-obligations/:id/pay')
  async payFundObligation(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.householdsService.payFundObligation(
      new Types.ObjectId(user.tenantId),
      user.accountId,
      id,
    );
  }

  @Get('my-association')
  async getMyAssociation(@CurrentUser() user: JwtPayload) {
    return this.householdsService.getMyAssociation(new Types.ObjectId(user.tenantId), user.accountId);
  }

  @Patch('my-association/fees/:id/pay')
  async payMyAssociationFee(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.householdsService.payMyAssociationFee(new Types.ObjectId(user.tenantId), user.accountId, id);
  }
}
