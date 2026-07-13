import { IsBoolean, IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateResidentDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  dob: string;

  @IsOptional()
  @IsIn(['male', 'female', 'unknown'])
  gender?: string;

  @IsOptional()
  @IsString()
  cccd?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  // Bắt buộc khi KHÔNG phải chủ hộ — chủ hộ thì BE tự gán "Chủ hộ" (xem
  // AdminAccountsService.createResident).
  @IsOptional()
  @IsString()
  relation?: string;

  @IsOptional()
  @IsBoolean()
  isHouseholder?: boolean;

  // Bắt buộc + phải khớp 1 hộ đã tồn tại khi KHÔNG phải chủ hộ — chủ hộ mới
  // thì bỏ trống, BE tự sinh mã hộ mới (xem AdminAccountsService.createResident).
  @IsOptional()
  @IsString()
  familyId?: string;

  @IsOptional()
  @IsString()
  permanentAddress?: string;

  @IsOptional()
  @IsString()
  temporaryAddress?: string;

  @IsOptional()
  @IsString()
  group?: string;

  @IsOptional()
  @IsString()
  fatherName?: string;

  @IsOptional()
  @IsString()
  motherName?: string;
}
