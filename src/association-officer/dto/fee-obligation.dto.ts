import { IsInt, IsNotEmpty, IsPositive, IsString } from 'class-validator';

export class FeeObligationDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsInt()
  @IsPositive()
  amount: number;

  @IsString()
  @IsNotEmpty()
  period: string;
}
