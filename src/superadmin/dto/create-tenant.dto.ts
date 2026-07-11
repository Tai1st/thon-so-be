import { IsNotEmpty, IsNumber, IsObject, IsOptional, IsString, Matches } from 'class-validator';

export class CreateTenantDto {
  // Slug là phần subdomain — chỉ chữ thường/số/gạch nối, không dấu cách.
  @Matches(/^[a-z0-9-]+$/, { message: 'Slug chỉ được chứa chữ thường, số và dấu gạch nối.' })
  slug: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  // Điền sẵn khi tạo tenant từ 1 thôn đã chọn trên bản đồ Xã (xem
  // SuperAdminCommunesService.createTenantFromVillage) — tùy chọn khi tạo
  // tenant thủ công (không qua Commune/KMZ) thì bỏ trống.
  @IsOptional()
  @IsNumber()
  lat?: number;

  @IsOptional()
  @IsNumber()
  lng?: number;

  @IsOptional()
  @IsObject()
  boundary?: { type: string; coordinates: number[][][] };

  // Tài khoản Admin đầu tiên của tenant mới — cần thiết để có thể đăng nhập
  // quản trị ngay sau khi tạo tenant (mục 8.6 tài liệu thiết kế).
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
