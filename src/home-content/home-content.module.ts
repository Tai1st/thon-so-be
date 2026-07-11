import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { HomeContent, HomeContentSchema } from '../schemas/home-content.schema';
import { Account, AccountSchema } from '../schemas/account.schema';
import { Resident, ResidentSchema } from '../schemas/resident.schema';
import { HomeContentController } from './home-content.controller';
import { TenantModule } from '../tenant/tenant.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: HomeContent.name, schema: HomeContentSchema },
      { name: Account.name, schema: AccountSchema },
      { name: Resident.name, schema: ResidentSchema },
    ]),
    TenantModule,
  ],
  controllers: [HomeContentController],
})
export class HomeContentModule {}
