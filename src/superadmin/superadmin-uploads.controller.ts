import { BadRequestException, Controller, Post, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { randomUUID } from 'crypto';
import { extname } from 'path';
import { ImgbbService } from '../uploads/imgbb.service';
import { ALLOWED_IMAGE_MIME_TYPES, MAX_IMAGE_FILE_SIZE } from '../uploads/uploads.controller';
import { SuperAdminGuard } from '../common/guards/superadmin.guard';

// Bản dành riêng cho Superadmin (vd logo địa danh "Ban tự quản") — tách
// khỏi UploadsController vì superadmin không có tenantId, dùng guard hoàn
// toàn khác (SuperAdminGuard, xem ghi chú trong guard đó) nên không thể
// tái dùng chung guard/route với 1 tenant. Cùng chia sẻ ImgbbService.
@Controller('superadmin/uploads')
@UseGuards(SuperAdminGuard)
export class SuperAdminUploadsController {
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
