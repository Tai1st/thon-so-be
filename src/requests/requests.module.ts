import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Account, AccountSchema } from '../schemas/account.schema';
import { Resident, ResidentSchema } from '../schemas/resident.schema';
import {
  MemberEditRequest,
  MemberEditRequestSchema,
  NewMemberRequest,
  NewMemberRequestSchema,
} from '../schemas/requests.schema';
import { RequestsService } from './requests.service';
import { RequestsController } from './requests.controller';
import { TenantModule } from '../tenant/tenant.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Account.name, schema: AccountSchema },
      { name: Resident.name, schema: ResidentSchema },
      { name: MemberEditRequest.name, schema: MemberEditRequestSchema },
      { name: NewMemberRequest.name, schema: NewMemberRequestSchema },
    ]),
    TenantModule,
    AuthModule,
  ],
  controllers: [RequestsController],
  providers: [RequestsService],
})
export class RequestsModule {}
