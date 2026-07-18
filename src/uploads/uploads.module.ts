import { Module } from '@nestjs/common';
import { UploadsController } from './uploads.controller';
import { ImgbbService } from './imgbb.service';
import { TenantModule } from '../tenant/tenant.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TenantModule, AuthModule],
  controllers: [UploadsController],
  providers: [ImgbbService],
  exports: [ImgbbService],
})
export class UploadsModule {}
