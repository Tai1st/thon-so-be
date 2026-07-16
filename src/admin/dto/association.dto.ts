import { IsInt, IsNotEmpty, IsString, Min } from 'class-validator';

export class CreateAssociationDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsInt()
  @Min(0)
  balance: number;
}

export class RenameAssociationDto {
  @IsString()
  @IsNotEmpty()
  newName: string;
}
