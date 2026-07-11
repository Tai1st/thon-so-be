import { IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';

export class CreateTenantFromVillageDto {
  @Matches(/^[a-z0-9-]+$/, { message: 'Slug chỉ được chứa chữ thường, số và dấu gạch nối.' })
  slug: string;

  // Cho phép sửa lại tên hiển thị khác với tên gốc trong KMZ — nếu bỏ
  // trống thì dùng đúng tên thôn đã có trong Commune.villages[].name.
  @IsOptional()
  @IsString()
  name?: string;

  @IsString()
  @IsNotEmpty()
  adminUsername: string;

  @IsString()
  @IsNotEmpty()
  adminPassword: string;

  @IsString()
  @IsNotEmpty()
  adminName: string;
}
