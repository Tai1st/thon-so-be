import { IsLatitude, IsLongitude } from 'class-validator';

export class UpdateGpsDto {
  @IsLatitude()
  lat: number;

  @IsLongitude()
  lng: number;
}
