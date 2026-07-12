import { IsInt, IsNotEmpty, IsNumber, IsPositive, IsString, Min } from 'class-validator';

export class CreateLoanDto {
  @IsString()
  @IsNotEmpty()
  member: string;

  @IsInt()
  @IsPositive()
  amount: number;

  @IsNumber()
  @Min(0)
  interestRate: number;

  @IsInt()
  @IsPositive()
  termMonths: number;
}
