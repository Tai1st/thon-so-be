import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Tenant, TenantDocument, AdministrativeUnit, AdministrativeUnitDocument } from '../schemas/tenant.schema';

@Injectable()
export class TenantService {
  constructor(
    @InjectModel(Tenant.name) private tenantModel: Model<TenantDocument>,
    @InjectModel(AdministrativeUnit.name) private administrativeUnitModel: Model<AdministrativeUnitDocument>,
  ) {}

  // archivedAt != null được coi như không tồn tại (mục 6.2 tài liệu thiết kế)
  async findActiveBySlug(slug: string): Promise<TenantDocument | null> {
    return this.tenantModel.findOne({ slug, archivedAt: null }).exec();
  }

  async findAllActive(): Promise<TenantDocument[]> {
    return this.tenantModel.find({ archivedAt: null }).exec();
  }

  // Trụ sở cơ quan cấp xã — không có tenantId, hiển thị chung cho mọi
  // tenant cùng 1 xã trên bản đồ danh mục (mục 6 tài liệu thiết kế).
  async findAllAdministrativeUnits(): Promise<AdministrativeUnitDocument[]> {
    return this.administrativeUnitModel.find().exec();
  }
}
