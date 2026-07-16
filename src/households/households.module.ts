import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Account, AccountSchema } from '../schemas/account.schema';
import { Resident, ResidentSchema } from '../schemas/resident.schema';
import { Household, HouseholdSchema, VillageFund, VillageFundSchema } from '../schemas/household.schema';
import { AssociationQuota, AssociationQuotaSchema } from '../schemas/association-quota.schema';
import { HouseholdsService } from './households.service';
import { HouseholdsController } from './households.controller';
import { TenantModule } from '../tenant/tenant.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Account.name, schema: AccountSchema },
      { name: Resident.name, schema: ResidentSchema },
      { name: Household.name, schema: HouseholdSchema },
      { name: VillageFund.name, schema: VillageFundSchema },
      { name: AssociationQuota.name, schema: AssociationQuotaSchema },
    ]),
    TenantModule,
    AuthModule,
  ],
  controllers: [HouseholdsController],
  providers: [HouseholdsService],
})
export class HouseholdsModule {}
