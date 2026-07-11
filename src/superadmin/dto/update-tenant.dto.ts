import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class UpdateTenantDto {
  @IsOptional()
  @IsString()
  name?: string;

  // true = khóa (archive), false = mở lại — soft-delete cấp tenant (mục 8.6,
  // xem chi tiết ở mục 7 tài liệu thiết kế: archivedAt != null coi như
  // không tồn tại, TenantGuard trả 404 y hệt slug sai, không xóa dữ liệu.
  @IsOptional()
  @IsBoolean()
  archived?: boolean;
}
