import { IsString } from 'class-validator';

export class UpdateHouseNumberDto {
  @IsString()
  houseNumber: string;
}
