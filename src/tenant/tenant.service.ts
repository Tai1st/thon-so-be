import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Tenant, TenantDocument } from '../schemas/tenant.schema';

@Injectable()
export class TenantService {
  constructor(
    @InjectModel(Tenant.name) private tenantModel: Model<TenantDocument>,
  ) {}

  // archivedAt != null được coi như không tồn tại (mục 6.2 tài liệu thiết kế)
  async findActiveBySlug(slug: string): Promise<TenantDocument | null> {
    return this.tenantModel.findOne({ slug, archivedAt: null }).exec();
  }

  async findAllActive(): Promise<TenantDocument[]> {
    return this.tenantModel.find({ archivedAt: null }).exec();
  }
}
