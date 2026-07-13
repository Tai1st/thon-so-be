import { IsArray, IsBoolean, IsIn, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

// 1 dòng trong file Excel Admin upload để nhập cư dân hàng loạt (mục
// "Nhập từ Excel" tab Quản lý tài khoản), khớp đúng cột "SỐ HỘ TỊCH" trong
// file mẫu sẵn có của thôn — dùng làm khoá nhóm hộ (groupKey), KHÔNG lưu
// lại giá trị này vào Resident (chỉ dùng lúc xử lý để tự sinh mã hộ thật
// FAM-xxx cho mỗi nhóm, xem AdminAccountsService.bulkImportResidents).
// Cố ý để hầu hết field optional ở tầng DTO (khác CreateResidentDto) —
// thiếu tên/ngày sinh ở 1 dòng Excel không được làm ValidationPipe chặn
// toàn bộ request, mà phải được báo lỗi theo từng dòng.
export class BulkResidentRowDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  dob?: string;

  @IsOptional()
  @IsIn(['male', 'female', 'unknown'])
  gender?: string;

  @IsOptional()
  @IsString()
  cccd?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsBoolean()
  isHouseholder?: boolean;

  @IsOptional()
  @IsString()
  relation?: string;

  // Khoá nhóm hộ — mọi dòng cùng giá trị này (khớp cột "SỐ HỘ TỊCH" trong
  // file) được gom vào chung 1 hộ. Bắt buộc với mọi dòng (kể cả chủ hộ).
  @IsOptional()
  @IsString()
  groupKey?: string;

  @IsOptional()
  @IsString()
  group?: string;

  @IsOptional()
  @IsString()
  permanentAddress?: string;

  @IsOptional()
  @IsString()
  temporaryAddress?: string;

  @IsOptional()
  @IsString()
  fatherName?: string;

  @IsOptional()
  @IsString()
  motherName?: string;
}

export class BulkImportResidentsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkResidentRowDto)
  rows: BulkResidentRowDto[];
}
