import { ArrayMinSize, IsArray, IsIn, IsInt, IsOptional, IsPositive, IsString } from 'class-validator';

export class CreateAssocTxDto {
  @IsIn(['Thu', 'Chi'])
  type: 'Thu' | 'Chi';

  @IsOptional()
  @IsString()
  member?: string;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  obligationIds?: string[];

  @IsOptional()
  @IsString()
  desc?: string;

  @IsOptional()
  @IsInt()
  @IsPositive()
  amount?: number;
}
