import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Commune, CommuneSchema } from '../schemas/commune.schema';
import { Tenant, TenantSchema } from '../schemas/tenant.schema';
import { Household, HouseholdSchema } from '../schemas/household.schema';
import { Resident, ResidentSchema } from '../schemas/resident.schema';
import { CommunesService } from './communes.service';
import { CommunesController } from './communes.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Commune.name, schema: CommuneSchema },
      { name: Tenant.name, schema: TenantSchema },
      { name: Household.name, schema: HouseholdSchema },
      { name: Resident.name, schema: ResidentSchema },
    ]),
  ],
  controllers: [CommunesController],
  providers: [CommunesService],
})
export class CommunesModule {}
