import { IsOptional, IsString, IsUrl, ValidateIf } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @ValidateIf((o) => !!o.avatarUrl)
  @IsUrl({}, { message: 'URL ảnh đại diện không hợp lệ.' })
  avatarUrl?: string;
}
