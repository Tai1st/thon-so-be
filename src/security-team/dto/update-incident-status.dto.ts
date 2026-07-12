import { IsIn } from 'class-validator';

export class UpdateIncidentStatusDto {
  @IsIn(['Đã tiếp nhận', 'Đã xử lý'])
  status: string;
}
