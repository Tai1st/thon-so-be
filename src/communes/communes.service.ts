import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Commune, CommuneDocument } from '../schemas/commune.schema';
import { Tenant, TenantDocument } from '../schemas/tenant.schema';
import { Household, HouseholdDocument } from '../schemas/household.schema';
import { Resident, ResidentDocument } from '../schemas/resident.schema';

@Injectable()
export class CommunesService {
  constructor(
    @InjectModel(Commune.name) private communeModel: Model<CommuneDocument>,
    @InjectModel(Tenant.name) private tenantModel: Model<TenantDocument>,
    @InjectModel(Household.name) private householdModel: Model<HouseholdDocument>,
    @InjectModel(Resident.name) private residentModel: Model<ResidentDocument>,
  ) {}

  // Công khai (không cần đăng nhập) — dùng cho trang danh mục ở domain gốc
  // (mục 4.1 tài liệu thiết kế): hiện bản đồ mọi thôn của xã, thôn đã có
  // tenant thì kèm slug/tên để điều hướng sang đúng subdomain, kèm vị trí
  // GPS các hộ gia đình đã định vị (đúng hành vi tra-cuu.html gốc — hiện
  // cả marker nhà dân trên bản đồ tổng, không chỉ ranh giới thôn).
  async findAllPublic() {
    const communes = await this.communeModel.find().sort({ createdAt: -1 }).lean();

    const tenantIds = communes.flatMap((c) => c.villages.map((v) => v.tenantId).filter(Boolean));
    const tenants = await this.tenantModel
      .find({ _id: { $in: tenantIds }, archivedAt: null })
      .select('slug name')
      .lean();
    const tenantById = new Map(tenants.map((t) => [String(t._id), t]));

    const [households, householders] = await Promise.all([
      this.householdModel
        .find({ tenantId: { $in: tenantIds }, 'gpsCoord.lat': { $exists: true } })
        .select('tenantId familyId gpsCoord')
        .lean(),
      this.residentModel
        .find({ tenantId: { $in: tenantIds }, isHouseholder: true })
        .select('tenantId familyId name')
        .lean(),
    ]);
    // Tên chủ hộ hiển thị trên marker — khớp theo cặp (tenantId, familyId)
    // vì familyId chỉ duy nhất TRONG 1 tenant, không phải toàn hệ thống.
    const householderNameByKey = new Map(householders.map((r) => [`${r.tenantId}:${r.familyId}`, r.name]));

    const householdsByTenant = new Map<string, { lat: number; lng: number; name: string }[]>();
    households.forEach((h) => {
      if (!h.gpsCoord) return;
      const key = String(h.tenantId);
      const list = householdsByTenant.get(key) || [];
      const householderName = householderNameByKey.get(`${h.tenantId}:${h.familyId}`);
      list.push({
        lat: h.gpsCoord.lat,
        lng: h.gpsCoord.lng,
        name: householderName ? `Hộ ${householderName}` : `Hộ gia đình ${h.familyId}`,
      });
      householdsByTenant.set(key, list);
    });

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
          households: v.tenantId ? householdsByTenant.get(String(v.tenantId)) || [] : [],
        };
      }),
    }));
  }
}
