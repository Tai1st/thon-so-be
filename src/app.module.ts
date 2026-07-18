import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TenantModule } from './tenant/tenant.module';
import { AuthModule } from './auth/auth.module';
import { HomeContentModule } from './home-content/home-content.module';
import { HouseholdsModule } from './households/households.module';
import { RequestsModule } from './requests/requests.module';
import { SuperAdminModule } from './superadmin/superadmin.module';
import { IncidentsModule } from './incidents/incidents.module';
import { VillageHeadModule } from './village-head/village-head.module';
import { AdminModule } from './admin/admin.module';
import { SecurityTeamModule } from './security-team/security-team.module';
import { AssociationOfficerModule } from './association-officer/association-officer.module';
import { UploadsModule } from './uploads/uploads.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.get<string>('MONGODB_URI'),
      }),
    }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
    TenantModule,
    AuthModule,
    HomeContentModule,
    HouseholdsModule,
    RequestsModule,
    SuperAdminModule,
    IncidentsModule,
    VillageHeadModule,
    AdminModule,
    SecurityTeamModule,
    AssociationOfficerModule,
    UploadsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
