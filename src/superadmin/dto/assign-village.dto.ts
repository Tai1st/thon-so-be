import { IsInt, IsMongoId, IsOptional } from 'class-validator';

// communeId=null (hoặc bỏ trống) = bỏ gán khỏi xã hiện tại. Có communeId
// thì bắt buộc kèm villageIndex.
export class AssignVillageDto {
  @IsOptional()
  @IsMongoId()
  communeId?: string | null;

  @IsOptional()
  @IsInt()
  villageIndex?: number | null;
}
