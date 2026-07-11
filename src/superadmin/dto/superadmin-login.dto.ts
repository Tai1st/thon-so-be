import { IsNotEmpty, IsString } from 'class-validator';

export class SuperAdminLoginDto {
  @IsString()
  @IsNotEmpty()
  username: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}
