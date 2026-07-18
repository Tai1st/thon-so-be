import { IsArray, IsNotEmpty, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import {
  AnttRepresentativeDto,
  DamageDto,
  OpinionsDto,
  OtherInvolvedPersonDto,
  ReporterDto,
} from './create-incident-minutes.dto';

// Sửa biên bản — thay toàn bộ nội dung (giống form "Lập biên bản mới"
// nhưng điền sẵn), không phải patch từng phần.
export class UpdateIncidentMinutesDto {
  @IsOptional()
  @IsString()
  relatedReportId?: string;

  @IsOptional()
  @IsString()
  code?: string;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsOptional()
  @IsString()
  recordTime?: string;

  @IsOptional()
  @IsString()
  recordLocation?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AnttRepresentativeDto)
  anttRepresentatives?: AnttRepresentativeDto[];

  @IsOptional()
  @ValidateNested()
  @Type(() => ReporterDto)
  reporter?: ReporterDto;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OtherInvolvedPersonDto)
  involvedPeople?: OtherInvolvedPersonDto[];

  @IsOptional()
  @IsString()
  incidentTime?: string;

  @IsOptional()
  @IsString()
  incidentLocation?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  incidentTypes?: string[];

  @IsOptional()
  @IsString()
  incidentTypeOther?: string;

  @IsString()
  @IsNotEmpty()
  content: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => DamageDto)
  damage?: DamageDto;

  @IsOptional()
  @IsString()
  verificationResult?: string;

  @IsOptional()
  @IsString()
  verificationNote?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => OpinionsDto)
  opinions?: OpinionsDto;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  recommendations?: string[];

  @IsOptional()
  @IsString()
  recommendationOther?: string;

  @IsOptional()
  @IsNumber()
  copies?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  imageUrls?: string[];
}
