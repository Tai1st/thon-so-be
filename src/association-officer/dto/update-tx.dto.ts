import { IsInt, IsNotEmpty, IsPositive, IsString } from 'class-validator';

// Sửa 1 giao dịch Thu/Chi đã ghi nhận (lỡ nhập sai). Với "Thu" label thay
// cho tên hội viên + nội dung gộp; đơn giản hóa thành 1 chuỗi mô tả để
// cán bộ tự chỉnh sửa, khớp cách hiển thị "member - desc" trên sổ sách.
export class UpdateAssocTxDto {
  @IsString()
  @IsNotEmpty()
  desc: string;

  @IsInt()
  @IsPositive()
  amount: number;
}
