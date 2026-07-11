import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { Types } from 'mongoose';
import { RequestsService } from './requests.service';
import { CreateMemberEditRequestDto } from './dto/create-member-edit-request.dto';
import { CreateNewMemberRequestDto } from './dto/create-new-member-request.dto';
import { TenantGuard } from '../common/guards/tenant.guard';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/jwt-payload.interface';

@Controller('requests')
@UseGuards(TenantGuard, JwtAuthGuard)
export class RequestsController {
  constructor(private requestsService: RequestsService) {}

  @Post('member-edit')
  async createMemberEdit(@CurrentUser() user: JwtPayload, @Body() dto: CreateMemberEditRequestDto) {
    return this.requestsService.createMemberEditRequest(
      new Types.ObjectId(user.tenantId),
      user.accountId,
      dto,
    );
  }

  @Post('new-member')
  async createNewMember(@CurrentUser() user: JwtPayload, @Body() dto: CreateNewMemberRequestDto) {
    return this.requestsService.createNewMemberRequest(
      new Types.ObjectId(user.tenantId),
      user.accountId,
      dto,
    );
  }

  @Get('mine')
  async getMine(@CurrentUser() user: JwtPayload) {
    return this.requestsService.getMine(new Types.ObjectId(user.tenantId), user.accountId);
  }
}
