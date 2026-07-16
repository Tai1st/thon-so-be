import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Tenant, TenantDocument, AdministrativeUnit, AdministrativeUnitDocument } from '../schemas/tenant.schema';
import { Commune, CommuneDocument } from '../schemas/commune.schema';
import { Household, HouseholdDocument } from '../schemas/household.schema';

@Injectable()
export class TenantService {
  constructor(
    @InjectModel(Tenant.name) private tenantModel: Model<TenantDocument>,
    @InjectModel(AdministrativeUnit.name) private administrativeUnitModel: Model<AdministrativeUnitDocument>,
    @InjectModel(Commune.name) private communeModel: Model<CommuneDocument>,
    @InjectModel(Household.name) private householdModel: Model<HouseholdDocument>,
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
  async findAllAdministrativeUnits(communeId: string): Promise<AdministrativeUnitDocument[]> {
    return this.administrativeUnitModel.find({ communeId }).exec();
  }

  // Danh mục mọi Xã (đã nhập KMZ) + thôn bên trong, kèm tenant đã claimed
  // (nếu có) và các hộ có tọa độ GPS — dựng bản đồ danh mục ở domain gốc
  // (mục 4.1 tài liệu thiết kế). Public, không cần đăng nhập.
  async findAllPublicCommunes() {
    const communes = await this.communeModel.find().lean();
    const tenantIds = communes.flatMap((c) =>
      c.villages.filter((v) => v.claimed && v.tenantId).map((v) => v.tenantId!),
    );
    if (tenantIds.length === 0) {
      return communes.map((c) => ({
        _id: c._id,
        name: c.name,
        villages: c.villages.map((v) => ({
          name: v.name,
          lat: v.lat,
          lng: v.lng,
          boundary: v.boundary,
          tenantSlug: null,
          tenantName: null,
          households: [],
        })),
      }));
    }

    const tenants = await this.tenantModel.find({ _id: { $in: tenantIds }, archivedAt: null }).lean();
    const tenantById = new Map(tenants.map((t) => [String(t._id), t]));

    const households = await this.householdModel
      .find({ tenantId: { $in: tenants.map((t) => t._id) }, gpsCoord: { $ne: null } })
      .lean();

    return communes.map((c) => ({
      _id: c._id,
      name: c.name,
      villages: c.villages.map((v) => {
        const tenant = v.tenantId ? tenantById.get(String(v.tenantId)) : undefined;
        // Bản đồ danh mục KHÔNG cần đăng nhập — không lộ tên cư dân thật,
        // chỉ hiện số nhà (hoặc mã hộ nếu chưa khai số nhà) + tên thôn. Tên
        // đầy đủ + vị trí chi tiết chỉ xem được qua các cổng dashboard có
        // JwtAuthGuard/RolesGuard đúng vai trò của thôn đó.
        const villageHouseholds = tenant
          ? households
              .filter((h) => String(h.tenantId) === String(tenant._id))
              .map((h) => ({
                lat: h.gpsCoord!.lat,
                lng: h.gpsCoord!.lng,
                name: h.houseNumber ? `Số nhà ${h.houseNumber} — ${v.name}` : v.name,
              }))
          : [];
        return {
          name: v.name,
          lat: v.lat,
          lng: v.lng,
          boundary: v.boundary,
          tenantSlug: tenant?.slug ?? null,
          tenantName: tenant?.name ?? null,
          households: villageHouseholds,
        };
      }),
    }));
  }
}
