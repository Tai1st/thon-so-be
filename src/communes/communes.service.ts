import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Commune, CommuneDocument } from '../schemas/commune.schema';
import { Tenant, TenantDocument } from '../schemas/tenant.schema';

@Injectable()
export class CommunesService {
  constructor(
    @InjectModel(Commune.name) private communeModel: Model<CommuneDocument>,
    @InjectModel(Tenant.name) private tenantModel: Model<TenantDocument>,
  ) {}

  // Công khai (không cần đăng nhập) — dùng cho trang danh mục ở domain gốc
  // (mục 4.1 tài liệu thiết kế): hiện bản đồ mọi thôn của xã, thôn đã có
  // tenant thì kèm slug/tên để điều hướng sang đúng subdomain.
  async findAllPublic() {
    const communes = await this.communeModel.find().sort({ createdAt: -1 }).lean();

    const tenantIds = communes.flatMap((c) => c.villages.map((v) => v.tenantId).filter(Boolean));
    const tenants = await this.tenantModel
      .find({ _id: { $in: tenantIds }, archivedAt: null })
      .select('slug name')
      .lean();
    const tenantById = new Map(tenants.map((t) => [String(t._id), t]));

    return communes.map((c) => ({
      _id: c._id,
      name: c.name,
      villages: c.villages.map((v) => {
        const tenant = v.tenantId ? tenantById.get(String(v.tenantId)) : undefined;
        return {
          name: v.name,
          lat: v.lat,
          lng: v.lng,
          boundary: v.boundary,
          tenantSlug: tenant?.slug ?? null,
          tenantName: tenant?.name ?? null,
        };
      }),
    }));
  }
}
