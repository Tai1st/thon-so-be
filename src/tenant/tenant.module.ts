import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Tenant, TenantSchema, AdministrativeUnit, AdministrativeUnitSchema } from '../schemas/tenant.schema';
import { Commune, CommuneSchema } from '../schemas/commune.schema';
import { Household, HouseholdSchema } from '../schemas/household.schema';
import { TenantService } from './tenant.service';
import { TenantController } from './tenant.controller';
import { TenantGuard } from '../common/guards/tenant.guard';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Tenant.name, schema: TenantSchema },
      { name: AdministrativeUnit.name, schema: AdministrativeUnitSchema },
      { name: Commune.name, schema: CommuneSchema },
      { name: Household.name, schema: HouseholdSchema },
    ]),
  ],
  controllers: [TenantController],
  providers: [TenantService, TenantGuard],
  exports: [TenantService, TenantGuard, MongooseModule],
})
export class TenantModule {}
