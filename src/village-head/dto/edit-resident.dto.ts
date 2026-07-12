import { IsIn, IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';

// Trưởng thôn có quyền sửa trực tiếp (khác Cư dân/Cán bộ Hội chỉ được đề
// nghị qua MemberEditRequest chờ Admin duyệt) — mục "Quản lý Toàn Thôn".
export class EditResidentDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  relation: string;

  @IsString()
  @IsNotEmpty()
  dob: string;

  @Matches(/^\d{12}$/, { message: 'Số Căn Cước phải gồm đúng 12 chữ số.' })
  cccd: string;

  @IsIn(['male', 'female'], { message: 'Vui lòng chọn giới tính.' })
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
