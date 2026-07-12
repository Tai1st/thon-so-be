import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateResidenceRegistrationDto {
  @IsString()
  @IsNotEmpty()
  guestName: string;

  @IsOptional()
  @IsString()
  guestCccd?: string;

  @IsString()
  @IsNotEmpty()
  relationship: string;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsString()
  @IsNotEmpty()
  fromDate: string;

  @IsString()
  @IsNotEmpty()
  toDate: string;
}
