import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Tenant, TenantDocument, AdministrativeUnit, AdministrativeUnitDocument } from '../schemas/tenant.schema';
import { Commune, CommuneDocument } from '../schemas/commune.schema';
import { Household, HouseholdDocument } from '../schemas/household.schema';
import { Resident, ResidentDocument } from '../schemas/resident.schema';

const EARTH_KM_PER_DEGREE = 111.32;

// Diện tích 1 polygon GeoJSON (ring ngoài, [lng, lat][]) theo km² — xấp xỉ
// phẳng (Shoelace) có hiệu chỉnh cos(vĩ độ) cho co giãn kinh độ, đủ chính
// xác ở quy mô 1 xã/thôn (không cần thêm dependency turf chỉ cho phép tính
// này). Không dùng cho vùng cực lớn (sai số tăng theo diện tích).
function polygonAreaKm2(ring: number[][]): number {
  if (ring.length < 3) return 0;
  const avgLatRad = (ring.reduce((s, [, lat]) => s + lat, 0) / ring.length) * (Math.PI / 180);
  const kmPerLngDegree = EARTH_KM_PER_DEGREE * Math.cos(avgLatRad);
  let area = 0;
  for (let i = 0; i < ring.length; i++) {
    const [lng1, lat1] = ring[i];
    const [lng2, lat2] = ring[(i + 1) % ring.length];
    const x1 = lng1 * kmPerLngDegree;
    const y1 = lat1 * EARTH_KM_PER_DEGREE;
    const x2 = lng2 * kmPerLngDegree;
    const y2 = lat2 * EARTH_KM_PER_DEGREE;
    area += x1 * y2 - x2 * y1;
  }
  return Math.abs(area / 2);
}

@Injectable()
export class TenantService {
  constructor(
    @InjectModel(Tenant.name) private tenantModel: Model<TenantDocument>,
    @InjectModel(AdministrativeUnit.name) private administrativeUnitModel: Model<AdministrativeUnitDocument>,
    @InjectModel(Commune.name) private communeModel: Model<CommuneDocument>,
    @InjectModel(Household.name) private householdModel: Model<HouseholdDocument>,
    @InjectModel(Resident.name) private residentModel: Model<ResidentDocument>,
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
  // (nếu có), các hộ có tọa độ GPS, và số liệu thống kê (diện tích/số hộ/
  // dân số/mật độ) — dựng bản đồ danh mục ở domain gốc (mục 4.1 tài liệu
  // thiết kế). Public, không cần đăng nhập.
  async findAllPublicCommunes() {
    const communes = await this.communeModel.find().lean();
    const tenantIds = communes.flatMap((c) =>
      c.villages.filter((v) => v.claimed && v.tenantId).map((v) => v.tenantId!),
    );

    const tenants = tenantIds.length
      ? await this.tenantModel.find({ _id: { $in: tenantIds }, archivedAt: null }).lean()
      : [];
    const tenantById = new Map(tenants.map((t) => [String(t._id), t]));
    const activeTenantIds = tenants.map((t) => t._id);

    const [households, householdCounts, residentCounts] = activeTenantIds.length
      ? await Promise.all([
          this.householdModel.find({ tenantId: { $in: activeTenantIds }, gpsCoord: { $ne: null } }).lean(),
          this.householdModel.aggregate<{ _id: string; count: number }>([
            { $match: { tenantId: { $in: activeTenantIds } } },
            { $group: { _id: '$tenantId', count: { $sum: 1 } } },
          ]),
          this.residentModel.aggregate<{ _id: string; count: number }>([
            { $match: { tenantId: { $in: activeTenantIds } } },
            { $group: { _id: '$tenantId', count: { $sum: 1 } } },
          ]),
        ])
      : [[], [], []];
    const householdCountByTenant = new Map(householdCounts.map((r) => [String(r._id), r.count]));
    const residentCountByTenant = new Map(residentCounts.map((r) => [String(r._id), r.count]));

    return communes.map((c) => {
      const villages = c.villages.map((v) => {
        const tenant = v.tenantId ? tenantById.get(String(v.tenantId)) : undefined;
        const tenantKey = tenant ? String(tenant._id) : null;
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
          householdCount: tenantKey ? householdCountByTenant.get(tenantKey) || 0 : 0,
          populationCount: tenantKey ? residentCountByTenant.get(tenantKey) || 0 : 0,
          areaKm2: polygonAreaKm2(v.boundary.coordinates[0]),
        };
      });

      const areaKm2 = villages.reduce((sum, v) => sum + v.areaKm2, 0);
      const totalHouseholds = villages.reduce((sum, v) => sum + v.householdCount, 0);
      const totalPopulation = villages.reduce((sum, v) => sum + v.populationCount, 0);

      return {
        _id: c._id,
        name: c.name,
        areaKm2,
        totalHouseholds,
        totalPopulation,
        densityPerKm2: areaKm2 > 0 ? totalPopulation / areaKm2 : 0,
        villages,
      };
    });
  }
}
