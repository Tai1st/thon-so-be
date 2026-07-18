import { BadRequestException, Controller, Post, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { randomUUID } from 'crypto';
import { extname } from 'path';
import { ImgbbService } from './imgbb.service';
import { TenantGuard } from '../common/guards/tenant.guard';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

export const ALLOWED_IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
export const MAX_IMAGE_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// Upload ảnh dùng chung cho MỌI vai trò đã đăng nhập trong 1 tenant (admin
// quản lý trang chủ, nhưng cũng cả cư dân/trưởng thôn/... tự đổi ảnh đại
// diện) — không giới hạn @Roles vì đây chỉ là lưu file hộ người dùng, khác
// với các thao tác ghi dữ liệu nghiệp vụ cần phân quyền chặt. Lưu qua
// imgbb.com, trả về đúng 1 URL string ghép thẳng vào các field
// logoUrl/heroImage/avatarUrl/... đã có sẵn, không cần đổi schema.
@Controller('uploads')
@UseGuards(TenantGuard, JwtAuthGuard)
export class UploadsController {
  constructor(private imgbbService: ImgbbService) {}

  @Post()
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_IMAGE_FILE_SIZE } }))
  async upload(@UploadedFile() file?: Express.Multer.File) {
    if (!file) throw new BadRequestException('Thiếu file.');
    if (!ALLOWED_IMAGE_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException('Chỉ chấp nhận ảnh JPEG, PNG, WebP hoặc GIF.');
    }

    const fileName = `${randomUUID()}${extname(file.originalname)}`;
    const url = await this.imgbbService.upload(file.buffer, file.mimetype, fileName);
    return { url };
  }
}
