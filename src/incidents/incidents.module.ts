import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Account, AccountSchema } from '../schemas/account.schema';
import { Resident, ResidentSchema } from '../schemas/resident.schema';
import {
  IncidentReport,
  IncidentReportSchema,
  ResidenceRegistration,
  ResidenceRegistrationSchema,
} from '../schemas/incident.schema';
import { IncidentsService } from './incidents.service';
import { IncidentsController } from './incidents.controller';
import { TenantModule } from '../tenant/tenant.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Account.name, schema: AccountSchema },
      { name: Resident.name, schema: ResidentSchema },
      { name: IncidentReport.name, schema: IncidentReportSchema },
      { name: ResidenceRegistration.name, schema: ResidenceRegistrationSchema },
    ]),
    TenantModule,
    AuthModule,
  ],
  controllers: [IncidentsController],
  providers: [IncidentsService],
})
export class IncidentsModule {}
