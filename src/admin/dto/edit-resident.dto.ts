import { IsBoolean, IsIn, IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';

// Admin có quyền cao nhất — sửa trực tiếp thông tin nhân khẩu, không cần
// qua MemberEditRequest chờ duyệt (khác Cư dân/Cán bộ Hội).
export class EditResidentInfoDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsBoolean()
  isHouseholder?: boolean;

  // Bắt buộc khi KHÔNG phải chủ hộ — chủ hộ thì BE tự gán "Chủ hộ".
  @IsOptional()
  @IsString()
  relation?: string;

  @IsString()
  @IsNotEmpty()
  dob: string;

  @Matches(/^\d{12}$/, { message: 'Số Căn Cước phải gồm đúng 12 chữ số.' })
  cccd: string;

  @IsIn(['male', 'female', 'unknown'], { message: 'Vui lòng chọn giới tính.' })
  gender: string;

  @IsOptional()
  @Matches(/^$|^\d{10}$/, { message: 'Số điện thoại phải gồm đúng 10 chữ số.' })
  phone?: string;

  @IsOptional()
  @IsString()
  fatherName?: string;

  @IsOptional()
  @IsString()
  motherName?: string;

  @IsOptional()
  @IsString()
  group?: string;

  @IsOptional()
  @IsString()
  permanentAddress?: string;

  @IsOptional()
  @IsString()
  temporaryAddress?: string;
}
