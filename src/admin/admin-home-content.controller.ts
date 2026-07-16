import { Body, Controller, Delete, Get, Param, Patch, Post, Put, UseGuards } from '@nestjs/common';
import { Types } from 'mongoose';
import { AdminHomeContentService } from './admin-home-content.service';
import {
  NewsItemDto,
  ProductDto,
  ScheduleItemDto,
  GalleryItemDto,
  StatDto,
  SecurityInfoDto,
  UpdateBrandingDto,
  UpdateOldVillagesDto,
} from './dto/home-content.dto';
import { TenantGuard } from '../common/guards/tenant.guard';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/jwt-payload.interface';

@Controller('admin/home-content')
@UseGuards(TenantGuard, JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminHomeContentController {
  constructor(private homeContentService: AdminHomeContentService) {}

  @Get()
  get(@CurrentUser() user: JwtPayload) {
    return this.homeContentService.get(new Types.ObjectId(user.tenantId));
  }

  @Put('security')
  updateSecurity(@CurrentUser() user: JwtPayload, @Body() dto: SecurityInfoDto) {
    return this.homeContentService.updateSecurity(new Types.ObjectId(user.tenantId), dto);
  }

  @Put('branding')
  updateBranding(@CurrentUser() user: JwtPayload, @Body() dto: UpdateBrandingDto) {
    return this.homeContentService.updateBranding(new Types.ObjectId(user.tenantId), dto);
  }

  @Put('old-villages')
  updateOldVillages(@CurrentUser() user: JwtPayload, @Body() dto: UpdateOldVillagesDto) {
    return this.homeContentService.updateOldVillages(new Types.ObjectId(user.tenantId), dto);
  }

  // Trưởng thôn cũng được đăng/sửa/xóa tin tức (mục "Tin tức & Thông báo"
  // ở cổng của họ) — override @Roles('admin') cấp controller cho riêng 3
  // route này, các route khác (thương hiệu, hội nhóm, sản phẩm...) vẫn
  // chỉ Admin mới có quyền.
  @Roles('admin', 'village-head')
  @Post('news')
  createNews(@CurrentUser() user: JwtPayload, @Body() dto: NewsItemDto) {
    return this.homeContentService.createNews(new Types.ObjectId(user.tenantId), dto, user.accountId);
  }
  @Roles('admin', 'village-head')
  @Patch('news/:id')
  updateNews(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() dto: NewsItemDto) {
    return this.homeContentService.updateNews(new Types.ObjectId(user.tenantId), id, dto, user.accountId);
  }
  @Roles('admin', 'village-head')
  @Delete('news/:id')
  deleteNews(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.homeContentService.deleteNews(new Types.ObjectId(user.tenantId), id);
  }

  @Post('products')
  createProduct(@CurrentUser() user: JwtPayload, @Body() dto: ProductDto) {
    return this.homeContentService.createProduct(new Types.ObjectId(user.tenantId), dto);
  }
  @Patch('products/:id')
  updateProduct(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() dto: ProductDto) {
    return this.homeContentService.updateProduct(new Types.ObjectId(user.tenantId), id, dto);
  }
  @Delete('products/:id')
  deleteProduct(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.homeContentService.deleteProduct(new Types.ObjectId(user.tenantId), id);
  }

  @Post('schedule')
  createSchedule(@CurrentUser() user: JwtPayload, @Body() dto: ScheduleItemDto) {
    return this.homeContentService.createSchedule(new Types.ObjectId(user.tenantId), dto);
  }
  @Patch('schedule/:id')
  updateSchedule(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() dto: ScheduleItemDto) {
    return this.homeContentService.updateSchedule(new Types.ObjectId(user.tenantId), id, dto);
  }
  @Delete('schedule/:id')
  deleteSchedule(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.homeContentService.deleteSchedule(new Types.ObjectId(user.tenantId), id);
  }

  @Post('gallery')
  createGalleryItem(@CurrentUser() user: JwtPayload, @Body() dto: GalleryItemDto) {
    return this.homeContentService.createGalleryItem(new Types.ObjectId(user.tenantId), dto);
  }
  @Patch('gallery/:id')
  updateGalleryItem(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() dto: GalleryItemDto) {
    return this.homeContentService.updateGalleryItem(new Types.ObjectId(user.tenantId), id, dto);
  }
  @Delete('gallery/:id')
  deleteGalleryItem(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.homeContentService.deleteGalleryItem(new Types.ObjectId(user.tenantId), id);
  }

  @Post('stats')
  createStat(@CurrentUser() user: JwtPayload, @Body() dto: StatDto) {
    return this.homeContentService.createStat(new Types.ObjectId(user.tenantId), dto);
  }
  @Patch('stats/:id')
  updateStat(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() dto: StatDto) {
    return this.homeContentService.updateStat(new Types.ObjectId(user.tenantId), id, dto);
  }
  @Delete('stats/:id')
  deleteStat(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.homeContentService.deleteStat(new Types.ObjectId(user.tenantId), id);
  }
}
