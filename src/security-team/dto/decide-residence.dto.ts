import { IsIn } from 'class-validator';

export class DecideResidenceDto {
  @IsIn(['Đã duyệt', 'Từ chối'])
  status: string;
}
