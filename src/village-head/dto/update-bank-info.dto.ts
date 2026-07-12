import { IsNotEmpty, IsString } from 'class-validator';

export class UpdateBankInfoDto {
  @IsString()
  @IsNotEmpty()
  bankName: string;

  @IsString()
  @IsNotEmpty()
  accountNumber: string;

  @IsString()
  @IsNotEmpty()
  accountHolder: string;
}
