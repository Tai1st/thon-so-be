import { IsInt, IsNotEmpty, IsPositive, IsString } from 'class-validator';

// Sửa 1 giao dịch Thu/Chi đã ghi nhận (lỡ nhập sai) — `label` là tên hộ
// đóng (Thu) hoặc nội dung chi (Chi) tùy `type` trên URL.
export class UpdateVillageFundTxDto {
  @IsString()
  @IsNotEmpty()
  label: string;

  @IsInt()
  @IsPositive()
  amount: number;
}
