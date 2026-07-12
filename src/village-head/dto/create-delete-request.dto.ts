import { IsNotEmpty, IsString } from 'class-validator';

export class CreateDeleteRequestDto {
  @IsString()
  @IsNotEmpty()
  residentId: string;

  @IsString()
  @IsNotEmpty()
  reason: string;
}
