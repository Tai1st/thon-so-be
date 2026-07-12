// Migrate dữ liệu mẫu của prototype (E:\Dev\cong-thong-tin-thon\js\data.js)
// thành tenant thật đầu tiên ("doanket") trong MongoDB, đúng lộ trình mục
// 11 bước 1 của du-an-quan-ly-thon.md. Idempotent: xóa sạch dữ liệu cũ của
// tenant "doanket" trước khi insert lại, an toàn chạy nhiều lần khi dev.
//
// Chạy: npx tsx scripts/migrate-seed.ts
import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import * as vm from 'vm';
import mongoose, { Types } from 'mongoose';
import * as bcrypt from 'bcryptjs';

import {
  Tenant,
  TenantSchema,
  AdministrativeUnit,
  AdministrativeUnitSchema,
} from '../src/schemas/tenant.schema';
import { Account, AccountSchema } from '../src/schemas/account.schema';
import { Resident, ResidentSchema } from '../src/schemas/resident.schema';
import {
  Household,
  HouseholdSchema,
  VillageFund,
  VillageFundSchema,
} from '../src/schemas/household.schema';
import {
  AssociationQuota,
  AssociationQuotaSchema,
} from '../src/schemas/association-quota.schema';
import {
  HomeContent,
  HomeContentSchema,
} from '../src/schemas/home-content.schema';
import {
  PermissionMatrix,
  PermissionMatrixSchema,
} from '../src/schemas/permission-matrix.schema';
import { AuditLog, AuditLogSchema } from '../src/schemas/audit-log.schema';

const PROTOTYPE_DATA_JS = 'E:/Dev/cong-thong-tin-thon/js/data.js';
const GEOJSON_URL = 'https://tracuudlieya.io.vn/api/communes/dlieya/geojson';
const DEMO_PASSWORD = 'doanket';
const TENANT_SLUG = 'doanket';
const TENANT_VILLAGE_NAME_IN_GEOJSON = 'Thôn Đoàn kết';

const ROLE_MAP: Record<string, string> = {
  'Cư dân': 'resident',
  'Cán bộ Hội': 'association-officer',
  'Trưởng thôn': 'village-head',
  'Tổ ANTT': 'security-team',
  Admin: 'admin',
};
const FIELD_MAP: Record<string, string> = {
  'Căn Cước': 'cccd',
  'Ngày sinh': 'dob',
  'Quỹ thôn': 'villageFund',
  'Địa chỉ GPS': 'gpsAddress',
};
const LEVEL_MAP: Record<string, string> = {
  Xem: 'view',
  'Xem/Sửa': 'view-edit',
  Khóa: 'locked',
};

// Top-level `const`/`let` trong data.js không tự thành property của sandbox
// global khi chạy qua vm — nối thêm 1 dòng gán vào globalThis để đọc lại
// được sau khi script chạy xong, trong cùng 1 lần thực thi (cùng lexical
// scope nên vẫn thấy được các biến này).
function loadPrototypeData() {
  const src = fs.readFileSync(PROTOTYPE_DATA_JS, 'utf8');
  const footer = `
    ;globalThis.__seed = {
      defaultResidents, defaultGpsCoords, defaultFunds, defaultAssociationQuotas,
      defaultAccounts, defaultLogs, defaultPermissions, defaultHomeContent, defaultVillageFund
    };
  `;
  const sandbox: Record<string, unknown> = {};
  vm.createContext(sandbox);
  vm.runInContext(src + footer, sandbox, { filename: PROTOTYPE_DATA_JS });
  return sandbox.__seed as {
    defaultResidents: any[];
    defaultGpsCoords: Record<string, { lat: number; lng: number }>;
    defaultFunds: Record<string, any[]>;
    defaultAssociationQuotas: Record<string, any>;
    defaultAccounts: any[];
    defaultLogs: any[];
    defaultPermissions: Record<string, Record<string, string>>;
    defaultHomeContent: any;
    defaultVillageFund: any;
  };
}

async function fetchVillageGeo() {
  const res = await fetch(GEOJSON_URL);
  if (!res.ok) throw new Error(`Không tải được GeoJSON: HTTP ${res.status}`);
  const geo = await res.json();
  const feature = geo.features.find(
    (f: any) => f.properties.info['Tên mới'] === TENANT_VILLAGE_NAME_IN_GEOJSON,
  );
  if (!feature)
    throw new Error(
      `Không tìm thấy "${TENANT_VILLAGE_NAME_IN_GEOJSON}" trong GeoJSON.`,
    );

  const ring: [number, number][] = feature.geometry.coordinates[0]; // [lng, lat]
  let sumLat = 0;
  let sumLng = 0;
  ring.forEach(([lng, lat]) => {
    sumLat += lat;
    sumLng += lng;
  });
  const centroid = { lat: sumLat / ring.length, lng: sumLng / ring.length };

  const units = (geo.properties.units || [])
    .filter((u: any) => u.visible)
    .map((u: any) => {
      const place = String(u.location_url).match(
        /!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/,
      );
      const at = String(u.location_url).match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
      const [lat, lng] = place
        ? [parseFloat(place[1]), parseFloat(place[2])]
        : at
          ? [parseFloat(at[1]), parseFloat(at[2])]
          : [null, null];
      return {
        name: u.name,
        logoUrl: `https://tracuudlieya.io.vn${u.logo_url}`,
        lat,
        lng,
        mapsUrl: u.location_url,
      };
    })
    .filter((u: any) => u.lat !== null);

  return {
    boundary: {
      type: 'Polygon' as const,
      coordinates: feature.geometry.coordinates,
    },
    lat: centroid.lat,
    lng: centroid.lng,
    units,
  };
}

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('Thiếu MONGODB_URI trong .env');
  await mongoose.connect(uri);
  console.log('Đã kết nối MongoDB:', uri);

  const TenantModel = mongoose.model(Tenant.name, TenantSchema);
  const AdministrativeUnitModel = mongoose.model(
    AdministrativeUnit.name,
    AdministrativeUnitSchema,
  );
  const AccountModel = mongoose.model(Account.name, AccountSchema);
  const ResidentModel = mongoose.model(Resident.name, ResidentSchema);
  const HouseholdModel = mongoose.model(Household.name, HouseholdSchema);
  const VillageFundModel = mongoose.model(VillageFund.name, VillageFundSchema);
  const AssociationQuotaModel = mongoose.model(
    AssociationQuota.name,
    AssociationQuotaSchema,
  );
  const HomeContentModel = mongoose.model(HomeContent.name, HomeContentSchema);
  const PermissionMatrixModel = mongoose.model(
    PermissionMatrix.name,
    PermissionMatrixSchema,
  );
  const AuditLogModel = mongoose.model(AuditLog.name, AuditLogSchema);

  console.log('Đang đọc dữ liệu mẫu từ prototype...');
  const seed = loadPrototypeData();

  console.log('Đang tải ranh giới thật từ', GEOJSON_URL);
  const geo = await fetchVillageGeo();

  console.log('Xóa dữ liệu cũ của tenant "doanket" (nếu có)...');
  const oldTenant = await TenantModel.findOne({ slug: TENANT_SLUG });
  if (oldTenant) {
    const tid = oldTenant._id;
    await Promise.all([
      AccountModel.deleteMany({ tenantId: tid }),
      ResidentModel.deleteMany({ tenantId: tid }),
      HouseholdModel.deleteMany({ tenantId: tid }),
      VillageFundModel.deleteMany({ tenantId: tid }),
      AssociationQuotaModel.deleteMany({ tenantId: tid }),
      HomeContentModel.deleteMany({ tenantId: tid }),
      PermissionMatrixModel.deleteMany({ tenantId: tid }),
      AuditLogModel.deleteMany({ tenantId: tid }),
    ]);
    await TenantModel.deleteOne({ _id: tid });
  }
  await AdministrativeUnitModel.deleteMany({});

  console.log('Tạo Tenant "doanket"...');
  const tenant = await TenantModel.create({
    slug: TENANT_SLUG,
    name: 'Thôn Đoàn Kết',
    lat: geo.lat,
    lng: geo.lng,
    boundary: geo.boundary,
    archivedAt: null,
  });
  const tenantId = tenant._id as Types.ObjectId;

  if (geo.units.length) {
    await AdministrativeUnitModel.insertMany(geo.units);
    console.log(`Đã tạo ${geo.units.length} trụ sở cơ quan cấp xã.`);
  }

  console.log(`Tạo ${seed.defaultResidents.length} nhân khẩu...`);
  const residentDocs = await ResidentModel.insertMany(
    seed.defaultResidents.map((r) => ({
      tenantId,
      name: r.name,
      dob: r.dob,
      gender: r.gender || 'unknown',
      cccd: r.cccd || '',
      phone: r.phone || '',
      relation: r.relation,
      isHouseholder: !!r.isHouseholder,
      familyId: r.familyId,
      headName: r.headName || '',
      permanentAddress: r.permanentAddress || r.address || '',
      temporaryAddress: r.temporaryAddress || '',
      group: r.group || 'Khác',
      fatherName: r.fatherName || '',
      motherName: r.motherName || '',
      association: r.association || 'None',
    })),
  );
  const residentIdByName = new Map(residentDocs.map((r) => [r.name, r._id]));

  console.log(
    `Tạo ${seed.defaultAccounts.length} tài khoản (mật khẩu demo: "${DEMO_PASSWORD}")...`,
  );
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  await AccountModel.insertMany(
    seed.defaultAccounts.map((a) => {
      const role = ROLE_MAP[a.role];
      if (!role) throw new Error(`Role không xác định: "${a.role}"`);
      return {
        tenantId,
        residentId: residentIdByName.get(a.name),
        username: a.username,
        passwordHash,
        name: a.name,
        role,
        position: a.chucvu || '',
        lastActive: a.lastActive || 'Chưa đăng nhập',
        status: a.status === 'Hoạt động' ? 'active' : 'locked',
        assoc: a.assoc,
      };
    }),
  );

  console.log('Tạo Household (GPS + khoản đóng góp theo hộ)...');
  const familyIds = new Set<string>([
    ...Object.keys(seed.defaultGpsCoords || {}),
    ...Object.keys(seed.defaultFunds || {}),
  ]);
  await HouseholdModel.insertMany(
    Array.from(familyIds).map((familyId) => ({
      tenantId,
      familyId,
      gpsCoord: seed.defaultGpsCoords[familyId],
      houseNumber: '',
      fundObligations: (seed.defaultFunds[familyId] || []).map((f: any) => ({
        id: f.id,
        name: f.name,
        memo: f.memo || '',
        period: f.period,
        amount: f.amount,
        status: f.status || 'Chưa đóng',
        date: f.date || '',
      })),
    })),
  );

  console.log('Tạo VillageFund (quỹ thôn công khai)...');
  await VillageFundModel.create({
    tenantId,
    thu: seed.defaultVillageFund.thu || [],
    chi: (seed.defaultVillageFund.chi || []).map((c: any) => ({
      id: c.id,
      desc: c.desc,
      amount: c.amount,
      date: c.date,
    })),
    unpaidHouseholds: seed.defaultVillageFund.unpaidHouseholds || 0,
    totalHouseholds: seed.defaultVillageFund.totalHouseholds || 0,
    bankInfo: seed.defaultVillageFund.bankInfo || {},
  });

  console.log(
    `Tạo ${Object.keys(seed.defaultAssociationQuotas).length} chi hội...`,
  );
  await AssociationQuotaModel.insertMany(
    Object.entries(seed.defaultAssociationQuotas).map(
      ([name, q]: [string, any]) => ({
        tenantId,
        name,
        balance: q.balance || 0,
        txs: q.txs || [],
        loans: q.loans || [],
        bankInfo: q.bankInfo || {},
        feeObligations: q.feeObligations || [],
        memberFunds: q.memberFunds || {},
      }),
    ),
  );

  console.log('Tạo HomeContent (nội dung trang chủ)...');
  await HomeContentModel.create({
    tenantId,
    ...seed.defaultHomeContent,
    oldVillages: ['Đoàn Kết cũ', 'Yên Khánh cũ'],
  });

  console.log('Tạo PermissionMatrix (ma trận phân quyền)...');
  const permissionDoc: Record<string, unknown> = { tenantId };
  for (const [roleLabel, fields] of Object.entries(seed.defaultPermissions)) {
    const roleKey = ROLE_MAP[roleLabel];
    const mapped: Record<string, string> = {};
    for (const [fieldLabel, levelLabel] of Object.entries(fields)) {
      mapped[FIELD_MAP[fieldLabel]] = LEVEL_MAP[levelLabel];
    }
    permissionDoc[roleKey] = mapped;
  }
  await PermissionMatrixModel.create(permissionDoc);

  console.log(`Tạo ${seed.defaultLogs.length} bản ghi nhật ký...`);
  await AuditLogModel.insertMany(
    seed.defaultLogs.map((l: any) => ({
      tenantId,
      time: l.time,
      action: l.action,
      detail: l.detail,
      actor: l.actor,
    })),
  );

  console.log('\n✅ Migrate xong. Tenant "doanket" đã sẵn sàng.');
  console.log(
    `   Đăng nhập demo: bất kỳ username trong defaultAccounts, mật khẩu "${DEMO_PASSWORD}".`,
  );
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('❌ Migrate thất bại:', err);
  process.exit(1);
});
