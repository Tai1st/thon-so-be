import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Tenant, TenantSchema, AdministrativeUnit, AdministrativeUnitSchema } from '../schemas/tenant.schema';
import { TenantService } from './tenant.service';
import { TenantController } from './tenant.controller';
import { TenantGuard } from '../common/guards/tenant.guard';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Tenant.name, schema: TenantSchema },
      { name: AdministrativeUnit.name, schema: AdministrativeUnitSchema },
    ]),
  ],
  controllers: [TenantController],
  providers: [TenantService, TenantGuard],
  exports: [TenantService, TenantGuard, MongooseModule],
})
export class TenantModule {}
