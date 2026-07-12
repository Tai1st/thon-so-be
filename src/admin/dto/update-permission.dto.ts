import { IsIn } from 'class-validator';

const ROLES = ['resident', 'association-officer', 'village-head', 'security-team', 'admin'];
const FIELDS = ['cccd', 'dob', 'villageFund', 'gpsAddress'];
const VALUES = ['view', 'view-edit', 'locked'];

export class UpdatePermissionDto {
  @IsIn(ROLES)
  role: string;

  @IsIn(FIELDS)
  field: string;

  @IsIn(VALUES)
  value: string;
}
