import { Type } from 'class-transformer';
import { IsIn, IsMongoId, IsNotEmpty, IsString, Matches, ValidateNested } from 'class-validator';

class EditableMemberFieldsDto {
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
  @Matches(/^$|^\d{10}$/, { message: 'Số điện thoại phải gồm đúng 10 chữ số.' })
  phone: string;

  @IsString() fatherName: string;
  @IsString() motherName: string;
  @IsString() group: string;
  @IsString() permanentAddress: string;
  @IsString() temporaryAddress: string;
}

export class CreateMemberEditRequestDto {
  @IsMongoId()
  residentId: string;

  @ValidateNested()
  @Type(() => EditableMemberFieldsDto)
  newValues: EditableMemberFieldsDto;
}
