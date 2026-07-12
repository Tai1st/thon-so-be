import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Account, AccountSchema } from '../schemas/account.schema';
import { Resident, ResidentSchema } from '../schemas/resident.schema';
import { Household, HouseholdSchema, VillageFund, VillageFundSchema } from '../schemas/household.schema';
import { DeleteRequest, DeleteRequestSchema } from '../schemas/requests.schema';
import { VillageHeadResidentsService } from './village-head-residents.service';
import { VillageHeadResidentsController } from './village-head-residents.controller';
import { VillageHeadFundService } from './village-head-fund.service';
import { VillageHeadFundController } from './village-head-fund.controller';
import { TenantModule } from '../tenant/tenant.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Account.name, schema: AccountSchema },
      { name: Resident.name, schema: ResidentSchema },
      { name: Household.name, schema: HouseholdSchema },
      { name: VillageFund.name, schema: VillageFundSchema },
      { name: DeleteRequest.name, schema: DeleteRequestSchema },
    ]),
    TenantModule,
    AuthModule,
  ],
  controllers: [VillageHeadResidentsController, VillageHeadFundController],
  providers: [VillageHeadResidentsService, VillageHeadFundService],
})
export class VillageHeadModule {}
