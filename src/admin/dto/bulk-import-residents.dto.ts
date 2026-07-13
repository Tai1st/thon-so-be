import { IsArray, IsBoolean, IsIn, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

// 1 dòng trong file Excel Admin upload để nhập cư dân hàng loạt (mục
// "Nhập từ Excel" tab Quản lý tài khoản). Khác CreateResidentDto ở chỗ hộ
// được nhóm qua Số Căn Cước của chủ hộ (headCccd) thay vì mã hộ có sẵn —
// vì lúc nhập 1 hộ mới trong cùng file thì mã hộ thật chưa tồn tại để
// điền vào, và họ tên không dùng được để nhóm vì có thể trùng nhau.
// Cố ý để hầu hết field optional ở tầng DTO (khác CreateResidentDto) —
// thiếu tên/ngày sinh ở 1 dòng Excel không được làm ValidationPipe chặn
// toàn bộ request, mà phải được báo lỗi theo từng dòng (xem
// AdminAccountsService.bulkImportResidents).
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

  // Bắt buộc khi KHÔNG phải chủ hộ — Số Căn Cước của chủ hộ (không dùng họ
  // tên vì có thể trùng), phải khớp CCCD 1 dòng đánh dấu "là chủ hộ" trong
  // CÙNG file, hoặc khớp CCCD 1 chủ hộ đã có sẵn trong hệ thống (xem
  // AdminAccountsService.bulkImportResidents).
  @IsOptional()
  @IsString()
  headCccd?: string;

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
