import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { Types } from 'mongoose';
import { AdminRequestsService } from './admin-requests.service';
import { TenantGuard } from '../common/guards/tenant.guard';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/jwt-payload.interface';

// Mục "Duyệt Yêu Cầu Xóa" (thực chất gồm cả 3 loại: xóa nhân khẩu, sửa
// thông tin, thêm thành viên mới) — chỉ Admin.
@Controller('admin/requests')
@UseGuards(TenantGuard, JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminRequestsController {
  constructor(private requestsService: AdminRequestsService) {}

  @Get('pending')
  async listPending(@CurrentUser() user: JwtPayload) {
    return this.requestsService.listPending(new Types.ObjectId(user.tenantId));
  }

  @Post('delete/:id/approve')
  async approveDelete(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.requestsService.approveDeleteRequest(new Types.ObjectId(user.tenantId), id);
  }

  @Post('delete/:id/reject')
  async rejectDelete(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.requestsService.rejectDeleteRequest(new Types.ObjectId(user.tenantId), id);
  }

  @Post('member-edit/:id/approve')
  async approveMemberEdit(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.requestsService.approveMemberEditRequest(new Types.ObjectId(user.tenantId), id);
  }

  @Post('member-edit/:id/reject')
  async rejectMemberEdit(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.requestsService.rejectMemberEditRequest(new Types.ObjectId(user.tenantId), id);
  }

  @Post('new-member/:id/approve')
  async approveNewMember(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.requestsService.approveNewMemberRequest(new Types.ObjectId(user.tenantId), id);
  }

  @Post('new-member/:id/reject')
  async rejectNewMember(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.requestsService.rejectNewMemberRequest(new Types.ObjectId(user.tenantId), id);
  }
}
