import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Account, AccountSchema } from '../schemas/account.schema';
import { Resident, ResidentSchema } from '../schemas/resident.schema';
import { AssociationQuota, AssociationQuotaSchema } from '../schemas/association-quota.schema';
import { AuditLog, AuditLogSchema } from '../schemas/audit-log.schema';
import { AdminAuditService } from '../admin/admin-audit.service';
import { AssociationOfficerMembersService } from './association-officer-members.service';
import { AssociationOfficerMembersController } from './association-officer-members.controller';
import { AssociationOfficerFundService } from './association-officer-fund.service';
import { AssociationOfficerFundController } from './association-officer-fund.controller';
import { AssociationOfficerLoansService } from './association-officer-loans.service';
import { AssociationOfficerLoansController } from './association-officer-loans.controller';
import { TenantModule } from '../tenant/tenant.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Account.name, schema: AccountSchema },
      { name: Resident.name, schema: ResidentSchema },
      { name: AssociationQuota.name, schema: AssociationQuotaSchema },
      { name: AuditLog.name, schema: AuditLogSchema },
    ]),
    TenantModule,
    AuthModule,
  ],
  controllers: [
    AssociationOfficerMembersController,
    AssociationOfficerFundController,
    AssociationOfficerLoansController,
  ],
  providers: [
    AdminAuditService,
    AssociationOfficerMembersService,
    AssociationOfficerFundService,
    AssociationOfficerLoansService,
  ],
})
export class AssociationOfficerModule {}
