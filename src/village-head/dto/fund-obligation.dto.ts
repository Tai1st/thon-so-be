import { IsInt, IsNotEmpty, IsPositive, IsString } from 'class-validator';

export class FundObligationDto {
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
