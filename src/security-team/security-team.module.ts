import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Account, AccountSchema } from '../schemas/account.schema';
import { Resident, ResidentSchema } from '../schemas/resident.schema';
import { Household, HouseholdSchema } from '../schemas/household.schema';
import {
  IncidentReport,
  IncidentReportSchema,
  ResidenceRegistration,
  ResidenceRegistrationSchema,
  IncidentMinutes,
  IncidentMinutesSchema,
} from '../schemas/incident.schema';
import { AdminAuditService } from '../admin/admin-audit.service';
import { AuditLog, AuditLogSchema } from '../schemas/audit-log.schema';
import { SecurityTeamReportsService } from './security-team-reports.service';
import { SecurityTeamReportsController } from './security-team-reports.controller';
import { SecurityTeamMinutesService } from './security-team-minutes.service';
import { SecurityTeamMinutesController } from './security-team-minutes.controller';
import { SecurityTeamResidentsService } from './security-team-residents.service';
import { SecurityTeamResidentsController } from './security-team-residents.controller';
import { TenantModule } from '../tenant/tenant.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Account.name, schema: AccountSchema },
      { name: Resident.name, schema: ResidentSchema },
      { name: Household.name, schema: HouseholdSchema },
      { name: IncidentReport.name, schema: IncidentReportSchema },
      { name: ResidenceRegistration.name, schema: ResidenceRegistrationSchema },
      { name: IncidentMinutes.name, schema: IncidentMinutesSchema },
      { name: AuditLog.name, schema: AuditLogSchema },
    ]),
    TenantModule,
    AuthModule,
  ],
  controllers: [SecurityTeamReportsController, SecurityTeamMinutesController, SecurityTeamResidentsController],
  providers: [
    AdminAuditService,
    SecurityTeamReportsService,
    SecurityTeamMinutesService,
    SecurityTeamResidentsService,
  ],
})
export class SecurityTeamModule {}
