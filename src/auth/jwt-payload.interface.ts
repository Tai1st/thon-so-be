import { Role } from '../schemas/account.schema';

export interface JwtPayload {
  accountId: string;
  tenantId: string;
  role: Role;
}
