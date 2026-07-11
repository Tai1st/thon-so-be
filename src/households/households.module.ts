import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Account, AccountSchema } from '../schemas/account.schema';
import { Resident, ResidentSchema } from '../schemas/resident.schema';
import { Household, HouseholdSchema } from '../schemas/household.schema';
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
    ]),
    TenantModule,
    AuthModule,
  ],
  controllers: [HouseholdsController],
  providers: [HouseholdsService],
})
export class HouseholdsModule {}
