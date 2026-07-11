import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Tenant, TenantSchema } from '../schemas/tenant.schema';
import { TenantService } from './tenant.service';
import { TenantController } from './tenant.controller';
import { TenantGuard } from '../common/guards/tenant.guard';

@Module({
  imports: [MongooseModule.forFeature([{ name: Tenant.name, schema: TenantSchema }])],
  controllers: [TenantController],
  providers: [TenantService, TenantGuard],
  exports: [TenantService, TenantGuard, MongooseModule],
})
export class TenantModule {}
