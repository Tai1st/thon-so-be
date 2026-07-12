import { ArrayMinSize, IsArray, IsIn, IsInt, IsOptional, IsPositive, IsString } from 'class-validator';

// "Thu" ghi nhận 1 hộ đóng góp (chọn hộ + các khoản thu áp dụng, số tiền
// tự tính tổng từ danh mục obligationCatalog); "Chi" nhập tay nội dung +
// số tiền — khớp 2 nhánh form addVillageFundTransaction() bản mẫu.
export class CreateVillageFundTxDto {
  @IsIn(['Thu', 'Chi'])
  type: 'Thu' | 'Chi';

  @IsOptional()
  @IsString()
  household?: string;

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
