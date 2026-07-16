import { IsIn, IsMongoId, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { ADMINISTRATIVE_UNIT_CATEGORIES } from '../../schemas/tenant.schema';

export class CreateAdministrativeUnitDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsIn(ADMINISTRATIVE_UNIT_CATEGORIES)
  category: string;

  // Tùy chọn — địa danh có thể tạo trước rồi gán xã sau ở trang quản lý.
  @IsOptional()
  @IsMongoId()
  communeId?: string;

  @IsOptional()
  @IsString()
  logoUrl?: string;

  @IsNumber()
  lat: number;

  @IsNumber()
  lng: number;

  @IsOptional()
  @IsString()
  mapsUrl?: string;
}

export class UpdateAdministrativeUnitDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsIn(ADMINISTRATIVE_UNIT_CATEGORIES)
  category?: string;

  @IsOptional()
  @IsMongoId()
  communeId?: string;

  @IsOptional()
  @IsString()
  logoUrl?: string;

  @IsOptional()
  @IsNumber()
  lat?: number;

  @IsOptional()
  @IsNumber()
  lng?: number;

  @IsOptional()
  @IsString()
  mapsUrl?: string;
}
