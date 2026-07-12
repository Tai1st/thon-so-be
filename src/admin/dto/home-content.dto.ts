import { IsArray, IsIn, IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';

export class NewsItemDto {
  @IsIn(['hanh-chinh', 'san-xuat', 'doan-the'])
  categorySlug: string;

  @IsString()
  @IsNotEmpty()
  category: string;

  @IsOptional()
  @IsString()
  colorClass?: string;

  @IsString()
  @IsNotEmpty()
  date: string;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsOptional()
  @IsString()
  summary?: string;

  @IsOptional()
  @IsString()
  content?: string;
}

export class ProductDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  badge?: string;

  @IsOptional()
  @IsString()
  image?: string;

  @IsOptional()
  @IsString()
  desc?: string;

  @IsOptional()
  @IsString()
  footerLabel?: string;

  @IsOptional()
  @IsString()
  footerValue?: string;
}

export class ScheduleItemDto {
  @IsString()
  @IsNotEmpty()
  day: string;

  @IsString()
  @IsNotEmpty()
  month: string;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  time?: string;
}

export class GalleryItemDto {
  @IsString()
  @IsNotEmpty()
  image: string;

  @IsOptional()
  @IsString()
  caption?: string;
}

export class StatDto {
  @IsOptional()
  @IsString()
  icon?: string;

  @IsString()
  @IsNotEmpty()
  label: string;

  @IsString()
  @IsNotEmpty()
  value: string;

  @IsOptional()
  @IsString()
  unit?: string;

  // Chi tiết theo từng "thôn cũ" (vd { label: "Thôn Đoàn Kết cũ:", value:
  // "202,41 ha" }) — danh sách thôn cũ do Admin định nghĩa ở mục Thương hiệu.
  @IsOptional()
  @IsArray()
  @IsObject({ each: true })
  breakdown?: { label: string; value: string }[];
}

export class UpdateOldVillagesDto {
  @IsArray()
  @IsString({ each: true })
  oldVillages: string[];
}

export class SecurityInfoDto {
  @IsString()
  @IsNotEmpty()
  hotline: string;

  @IsOptional()
  @IsString()
  hotlineDisplay?: string;

  @IsOptional()
  @IsString()
  slogan?: string;
}

export class UpdateBrandingDto {
  @IsString()
  @IsNotEmpty()
  siteName: string;

  @IsOptional()
  @IsString()
  logoUrl?: string;

  @IsOptional()
  @IsString()
  heroImage?: string;
}
