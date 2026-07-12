import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateIncidentMinutesDto {
  @IsOptional()
  @IsString()
  relatedReportId?: string;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  involvedPeople?: string;

  @IsString()
  @IsNotEmpty()
  content: string;
}
