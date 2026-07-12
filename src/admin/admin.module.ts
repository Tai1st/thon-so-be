import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Account, AccountSchema } from '../schemas/account.schema';
import { Resident, ResidentSchema } from '../schemas/resident.schema';
import {
  DeleteRequest,
  DeleteRequestSchema,
  MemberEditRequest,
  MemberEditRequestSchema,
  NewMemberRequest,
  NewMemberRequestSchema,
} from '../schemas/requests.schema';
import { AssociationQuota, AssociationQuotaSchema } from '../schemas/association-quota.schema';
import { PermissionMatrix, PermissionMatrixSchema } from '../schemas/permission-matrix.schema';
import { HomeContent, HomeContentSchema } from '../schemas/home-content.schema';
import { AuditLog, AuditLogSchema } from '../schemas/audit-log.schema';
import { Tenant, TenantSchema } from '../schemas/tenant.schema';
import { AdminAuditService } from './admin-audit.service';
import { AdminRequestsService } from './admin-requests.service';
import { AdminRequestsController } from './admin-requests.controller';
import { AdminAccountsService } from './admin-accounts.service';
import { AdminAccountsController } from './admin-accounts.controller';
import { AdminPermissionsService } from './admin-permissions.service';
import { AdminPermissionsController } from './admin-permissions.controller';
import { AdminHomeContentService } from './admin-home-content.service';
import { AdminHomeContentController } from './admin-home-content.controller';
import { AdminLogsController } from './admin-logs.controller';
import { TenantModule } from '../tenant/tenant.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Account.name, schema: AccountSchema },
      { name: Resident.name, schema: ResidentSchema },
      { name: DeleteRequest.name, schema: DeleteRequestSchema },
      { name: MemberEditRequest.name, schema: MemberEditRequestSchema },
      { name: NewMemberRequest.name, schema: NewMemberRequestSchema },
      { name: AssociationQuota.name, schema: AssociationQuotaSchema },
      { name: PermissionMatrix.name, schema: PermissionMatrixSchema },
      { name: HomeContent.name, schema: HomeContentSchema },
      { name: AuditLog.name, schema: AuditLogSchema },
      { name: Tenant.name, schema: TenantSchema },
    ]),
    TenantModule,
    AuthModule,
  ],
  controllers: [
    AdminRequestsController,
    AdminAccountsController,
    AdminPermissionsController,
    AdminHomeContentController,
    AdminLogsController,
  ],
  providers: [
    AdminAuditService,
    AdminRequestsService,
    AdminAccountsService,
    AdminPermissionsService,
    AdminHomeContentService,
  ],
})
export class AdminModule {}
