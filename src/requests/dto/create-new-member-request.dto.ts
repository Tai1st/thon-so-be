import { IsIn, IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';

export class CreateNewMemberRequestDto {
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

  // Không bắt buộc, nhưng nếu có nhập thì phải đúng 10 chữ số.
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
