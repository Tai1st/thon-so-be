import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

const ROLES = ['resident', 'association-officer', 'village-head', 'security-team', 'admin'];

export class EditAccountDto {
  @IsIn(ROLES)
  role: string;

  @IsOptional()
  @IsString()
  position?: string;

  // Bắt buộc khi role === 'association-officer' — chọn hội phụ trách (kiểm
  // tra tồn tại nằm ở service, không phải DTO, vì phụ thuộc dữ liệu DB).
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  assoc?: string;
}
