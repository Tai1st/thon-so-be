import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Commune, CommuneSchema } from '../schemas/commune.schema';
import { Tenant, TenantSchema } from '../schemas/tenant.schema';
import { CommunesService } from './communes.service';
import { CommunesController } from './communes.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Commune.name, schema: CommuneSchema },
      { name: Tenant.name, schema: TenantSchema },
    ]),
  ],
  controllers: [CommunesController],
  providers: [CommunesService],
})
export class CommunesModule {}
