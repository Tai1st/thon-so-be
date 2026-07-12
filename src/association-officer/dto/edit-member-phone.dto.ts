import { IsOptional, Matches } from 'class-validator';

export class EditMemberPhoneDto {
  @IsOptional()
  @Matches(/^$|^\d{10}$/, { message: 'Số điện thoại phải gồm đúng 10 chữ số.' })
  phone?: string;
}
