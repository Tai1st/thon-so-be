import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { Types } from 'mongoose';
import { AssociationOfficerMembersService } from './association-officer-members.service';
import { AddMemberDto } from './dto/add-member.dto';
import { EditMemberPhoneDto } from './dto/edit-member-phone.dto';
import { TenantGuard } from '../common/guards/tenant.guard';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/jwt-payload.interface';

// "Quản lý Hội viên" — chỉ Cán bộ Hội, phạm vi đúng 1 hội (Account.assoc).
@Controller('association-officer/members')
@UseGuards(TenantGuard, JwtAuthGuard, RolesGuard)
@Roles('association-officer')
export class AssociationOfficerMembersController {
  constructor(private membersService: AssociationOfficerMembersService) {}

  @Get()
  async list(@CurrentUser() user: JwtPayload) {
    return this.membersService.list(new Types.ObjectId(user.tenantId), user.accountId);
  }

  @Post()
  async addMember(@CurrentUser() user: JwtPayload, @Body() dto: AddMemberDto) {
    return this.membersService.addMember(new Types.ObjectId(user.tenantId), user.accountId, dto);
  }

  @Delete(':residentId')
  async removeMember(@CurrentUser() user: JwtPayload, @Param('residentId') residentId: string) {
    return this.membersService.removeMember(new Types.ObjectId(user.tenantId), user.accountId, residentId);
  }

  @Patch(':residentId/phone')
  async editMemberPhone(
    @CurrentUser() user: JwtPayload,
    @Param('residentId') residentId: string,
    @Body() dto: EditMemberPhoneDto,
  ) {
    return this.membersService.editMemberPhone(new Types.ObjectId(user.tenantId), user.accountId, residentId, dto);
  }
}
