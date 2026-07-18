import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  AdministrativeUnit,
  AdministrativeUnitSchema,
  SuperAdmin,
  SuperAdminSchema,
  Tenant,
  TenantSchema,
} from '../schemas/tenant.schema';
import { Account, AccountSchema } from '../schemas/account.schema';
import { Resident, ResidentSchema } from '../schemas/resident.schema';
import { Commune, CommuneSchema } from '../schemas/commune.schema';
import { HomeContent, HomeContentSchema } from '../schemas/home-content.schema';
import { SuperAdminAuthService } from './superadmin-auth.service';
import { SuperAdminAuthController } from './superadmin-auth.controller';
import { SuperAdminTenantsService } from './superadmin-tenants.service';
import { SuperAdminTenantsController } from './superadmin-tenants.controller';
import { SuperAdminCommunesService } from './superadmin-communes.service';
import { SuperAdminCommunesController } from './superadmin-communes.controller';
import { SuperAdminAdministrativeUnitsService } from './superadmin-administrative-units.service';
import { SuperAdminAdministrativeUnitsController } from './superadmin-administrative-units.controller';
import { SuperAdminGuard } from '../common/guards/superadmin.guard';
import { AuthModule } from '../auth/auth.module';
import { SuperAdminUploadsController } from './superadmin-uploads.controller';
import { UploadsModule } from '../uploads/uploads.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: SuperAdmin.name, schema: SuperAdminSchema },
      { name: Tenant.name, schema: TenantSchema },
      { name: AdministrativeUnit.name, schema: AdministrativeUnitSchema },
      { name: Account.name, schema: AccountSchema },
      { name: Resident.name, schema: ResidentSchema },
      { name: Commune.name, schema: CommuneSchema },
      { name: HomeContent.name, schema: HomeContentSchema },
    ]),
    AuthModule, // dùng chung JwtModule (JwtService) đã cấu hình sẵn
    UploadsModule, // dùng chung ImgbbService
  ],
  controllers: [
    SuperAdminAuthController,
    SuperAdminTenantsController,
    SuperAdminCommunesController,
    SuperAdminAdministrativeUnitsController,
    SuperAdminUploadsController,
  ],
  providers: [
    SuperAdminAuthService,
    SuperAdminTenantsService,
    SuperAdminCommunesService,
    SuperAdminAdministrativeUnitsService,
    SuperAdminGuard,
  ],
})
export class SuperAdminModule {}
