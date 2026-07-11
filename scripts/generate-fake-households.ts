// Sinh thêm hộ/nhân khẩu GIẢ (bịa, không phải người thật) cho tenant
// "doanket" để tổng số hộ khớp với con số villageFund.totalHouseholds=363
// đã có sẵn trong js/data.js gốc — bản thân prototype chỉ có dữ liệu chi
// tiết cho 15 hộ mẫu (+4 hộ chỉ có tên trong unpaidHouseholdsList), không
// đủ hộ để demo trông "đầy" như 1 thôn thật. Idempotent: xóa sạch dải
// familyId đã sinh (FAM-014/027/033/041 + FAM-100..FAM-443) trước khi tạo
// lại, an toàn chạy nhiều lần khi dev. KHÔNG tạo Account cho các hộ giả —
// chỉ 15 hộ mẫu gốc mới có tài khoản đăng nhập thật (đúng defaultAccounts).
//
// Chạy: npm run generate:fake-households  (dùng ts-node, KHÔNG dùng tsx —
// xem lý do trong PROGRESS.md phần "Vướng mắc kỹ thuật").
import 'dotenv/config';
import mongoose, { Types } from 'mongoose';
import { Tenant, TenantSchema } from '../src/schemas/tenant.schema';
import { Resident, ResidentSchema } from '../src/schemas/resident.schema';
import { Household, HouseholdSchema } from '../src/schemas/household.schema';

const TENANT_SLUG = 'doanket';
const TARGET_TOTAL_HOUSEHOLDS = 363;

// 4 hộ chỉ xuất hiện dưới dạng "đại diện" trong villageFund.unpaidHouseholdsList
// của js/data.js gốc (chưa có hồ sơ nhân khẩu đầy đủ) — dựng thành hộ thật,
// giữ đúng tên/ngày sinh/nhóm dân cư đã có sẵn, đánh dấu đúng khoản đã nêu
// "chưa đóng" (unpaidAmount 750.000đ = NTM 500k + KH 100k + ANQP 150k).
const STUB_HOUSEHOLDS = [
  { familyId: 'FAM-014', name: 'Lê Thị Bích', dob: '22/06/1988', group: 'Đoàn Kết cũ' },
  { familyId: 'FAM-027', name: 'Nguyễn Văn Hùng', dob: '14/11/1982', group: 'Đoàn Kết cũ' },
  { familyId: 'FAM-033', name: 'Trần Văn Sáu', dob: '07/08/1975', group: 'Yên Khánh cũ' },
  { familyId: 'FAM-041', name: 'Hoàng Thị Nga', dob: '19/04/1990', group: 'Đoàn Kết cũ' },
];
const SYNTHETIC_RANGE_START = 100;

const FUND_DEFS = [
  { id: 'NTM', name: 'Quỹ xây dựng Nông thôn mới', period: 'Năm 2026', amount: 500000 },
  { id: 'KH', name: 'Quỹ Khuyến học thôn', period: 'Năm 2026', amount: 100000 },
  { id: 'ANQP', name: 'Quỹ Quốc phòng & An ninh', period: 'Năm 2026', amount: 150000 },
  { id: 'QVN', name: 'Quỹ Ngày vì người nghèo', period: 'Năm 2026', amount: 100000 },
];

const SURNAMES = ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Huỳnh', 'Phan', 'Vũ', 'Võ', 'Đặng', 'Bùi', 'Đỗ', 'Hồ', 'Ngô', 'Dương', 'Lý'];
const MALE_MIDDLE = ['Văn', 'Đình', 'Xuân', 'Quang', 'Công', 'Hữu', 'Thành', 'Minh', 'Đức', 'Anh'];
const FEMALE_MIDDLE = ['Thị', 'Ngọc', 'Thu', 'Hồng', 'Kim', 'Thanh', 'Diệu', 'Bích', 'Hoài', 'Tuyết'];
const MALE_FIRST = ['Hùng', 'Dũng', 'Cường', 'Sơn', 'Hải', 'Nam', 'Tùng', 'Long', 'Phong', 'Khánh', 'Đạt', 'Tiến', 'Bình', 'Thắng', 'Quân', 'Vinh', 'Kiên', 'Huy', 'Trung', 'Đăng'];
const FEMALE_FIRST = ['Lan', 'Hoa', 'Mai', 'Hương', 'Linh', 'Nga', 'Trang', 'Thảo', 'Vy', 'Ngân', 'Yến', 'Dung', 'Hạnh', 'Xuân', 'Loan', 'Cúc', 'Hà', 'My', 'Nhung', 'Phượng'];
const GROUPS = ['Đoàn Kết cũ', 'Đoàn Kết cũ', 'Đoàn Kết cũ', 'Yên Khánh cũ'];
const DEFAULT_ADDRESS = 'Thôn Đoàn Kết, xã Dliê Ya, tỉnh Đắk Lắk';

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomName(gender: 'male' | 'female'): string {
  const middle = gender === 'male' ? pick(MALE_MIDDLE) : pick(FEMALE_MIDDLE);
  const first = gender === 'male' ? pick(MALE_FIRST) : pick(FEMALE_FIRST);
  return `${pick(SURNAMES)} ${middle} ${first}`;
}

function randomDob(minAge: number, maxAge: number): string {
  const year = 2026 - (minAge + Math.floor(Math.random() * (maxAge - minAge)));
  const month = 1 + Math.floor(Math.random() * 12);
  const day = 1 + Math.floor(Math.random() * 28);
  return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;
}

function randomCccd(usedCccds: Set<string>): string {
  let cccd: string;
  do {
    cccd = '066' + String(Math.floor(100000000 + Math.random() * 899999999));
  } while (usedCccds.has(cccd));
  usedCccds.add(cccd);
  return cccd;
}

function randomPhone(): string {
  return Math.random() < 0.7 ? '09' + String(Math.floor(10000000 + Math.random() * 89999999)) : '';
}

function buildFundObligations(familyId: string, forceUnpaidIds?: string[]): any[] {
  return FUND_DEFS.map((f) => {
    const forcedUnpaid = forceUnpaidIds?.includes(f.id);
    const unpaid = forcedUnpaid ?? Math.random() < 0.06; // ~6% các khoản còn thiếu, tương tự tỉ lệ thật (12/363)
    return {
      id: f.id,
      name: f.name,
      period: f.period,
      amount: f.amount,
      status: unpaid ? 'Chưa đóng' : 'Đã đóng',
      date: unpaid ? '-' : '15/01/2026',
      memo: `DONG_GOP_${familyId}_${f.id}`,
    };
  });
}

// Ray-casting đơn giản: chấm ngẫu nhiên trong bounding box của ranh giới
// thật rồi loại bỏ điểm nằm ngoài polygon — đủ dùng để rải hộ giả trông tự
// nhiên trên bản đồ, không cần thư viện GIS ngoài.
function pointInPolygon(lat: number, lng: number, ring: [number, number][]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [lngI, latI] = ring[i];
    const [lngJ, latJ] = ring[j];
    const intersect =
      latI > lat !== latJ > lat && lng < ((lngJ - lngI) * (lat - latI)) / (latJ - latI) + lngI;
    if (intersect) inside = !inside;
  }
  return inside;
}

function randomPointInBoundary(ring: [number, number][]): { lat: number; lng: number } {
  const lats = ring.map((p) => p[1]);
  const lngs = ring.map((p) => p[0]);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);

  for (let attempt = 0; attempt < 30; attempt++) {
    const lat = minLat + Math.random() * (maxLat - minLat);
    const lng = minLng + Math.random() * (maxLng - minLng);
    if (pointInPolygon(lat, lng, ring)) return { lat, lng };
  }
  // fallback: tâm bounding box nếu 30 lần thử đều rơi ra ngoài (polygon lõm)
  return { lat: (minLat + maxLat) / 2, lng: (minLng + maxLng) / 2 };
}

function buildHouseholdMembers(familyId: string, usedCccds: Set<string>) {
  const headGender: 'male' | 'female' = Math.random() < 0.75 ? 'male' : 'female';
  const headName = randomName(headGender);
  const headDob = randomDob(28, 65);
  const group = pick(GROUPS);

  const members = [
    {
      familyId,
      name: headName,
      dob: headDob,
      gender: headGender,
      cccd: randomCccd(usedCccds),
      phone: randomPhone() || '09' + String(Math.floor(10000000 + Math.random() * 89999999)),
      relation: 'Chủ hộ',
      isHouseholder: true,
      headName: '',
      permanentAddress: DEFAULT_ADDRESS,
      temporaryAddress: '',
      group,
      fatherName: '',
      motherName: '',
    },
  ];

  const memberCount = Math.floor(Math.random() * 4); // 0..3 thành viên khác ngoài chủ hộ
  const spouseGender = headGender === 'male' ? 'female' : 'male';
  if (memberCount > 0 && Math.random() < 0.7) {
    members.push({
      familyId,
      name: randomName(spouseGender),
      dob: randomDob(26, 62),
      gender: spouseGender,
      cccd: randomCccd(usedCccds),
      phone: randomPhone(),
      relation: headGender === 'male' ? 'Vợ' : 'Chồng',
      isHouseholder: false,
      headName,
      permanentAddress: DEFAULT_ADDRESS,
      temporaryAddress: '',
      group,
      fatherName: '',
      motherName: '',
    });
  }
  const remaining = memberCount - (members.length - 1);
  for (let i = 0; i < remaining; i++) {
    const childGender: 'male' | 'female' = Math.random() < 0.5 ? 'male' : 'female';
    members.push({
      familyId,
      name: randomName(childGender),
      dob: randomDob(1, 30),
      gender: childGender,
      cccd: randomCccd(usedCccds),
      phone: randomPhone(),
      relation: 'Con',
      isHouseholder: false,
      headName,
      permanentAddress: DEFAULT_ADDRESS,
      temporaryAddress: '',
      group,
      fatherName: headGender === 'male' ? headName : '',
      motherName: headGender === 'female' ? headName : '',
    });
  }

  return members;
}

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('Thiếu MONGODB_URI trong .env');
  await mongoose.connect(uri);
  console.log('Đã kết nối MongoDB:', uri);

  const TenantModel = mongoose.model(Tenant.name, TenantSchema);
  const ResidentModel = mongoose.model(Resident.name, ResidentSchema);
  const HouseholdModel = mongoose.model(Household.name, HouseholdSchema);

  const tenant = await TenantModel.findOne({ slug: TENANT_SLUG });
  if (!tenant) throw new Error(`Không tìm thấy tenant "${TENANT_SLUG}" — chạy migrate:seed trước.`);
  const tenantId = tenant._id as Types.ObjectId;
  if (!tenant.boundary?.coordinates?.[0]) {
    throw new Error('Tenant chưa có boundary GeoJSON — chạy lại migrate:seed để lấy ranh giới thật.');
  }
  const ring = tenant.boundary.coordinates[0] as [number, number][];

  const existingResidentCount = await ResidentModel.countDocuments({ tenantId });
  const existingFamilyIds = await ResidentModel.distinct('familyId', { tenantId });
  console.log(`Hộ thật đã có sẵn: ${existingFamilyIds.length} hộ (${existingResidentCount} nhân khẩu).`);

  const syntheticCount = TARGET_TOTAL_HOUSEHOLDS - existingFamilyIds.length - STUB_HOUSEHOLDS.length;
  if (syntheticCount < 0) {
    console.log('Đã đủ hoặc vượt số hộ mục tiêu, không cần sinh thêm.');
    await mongoose.disconnect();
    return;
  }
  const syntheticIds = Array.from(
    { length: syntheticCount },
    (_, i) => `FAM-${String(SYNTHETIC_RANGE_START + i).padStart(3, '0')}`,
  );
  console.log(`Sẽ sinh thêm: 4 hộ "đại diện" (FAM-014/027/033/041) + ${syntheticCount} hộ giả (FAM-${SYNTHETIC_RANGE_START}..FAM-${SYNTHETIC_RANGE_START + syntheticCount - 1}).`);

  const idsToClean = [...STUB_HOUSEHOLDS.map((s) => s.familyId), ...syntheticIds];
  await ResidentModel.deleteMany({ tenantId, familyId: { $in: idsToClean } });
  await HouseholdModel.deleteMany({ tenantId, familyId: { $in: idsToClean } });

  const usedCccds = new Set<string>((await ResidentModel.distinct('cccd', { tenantId })).filter(Boolean));

  const allResidents: any[] = [];
  const allHouseholds: any[] = [];

  for (const stub of STUB_HOUSEHOLDS) {
    const gender: 'male' | 'female' = stub.name.includes('Thị') || /Bích|Nga/.test(stub.name) ? 'female' : 'male';
    allResidents.push({
      tenantId,
      familyId: stub.familyId,
      name: stub.name,
      dob: stub.dob,
      gender,
      cccd: randomCccd(usedCccds),
      phone: randomPhone() || '09' + String(Math.floor(10000000 + Math.random() * 89999999)),
      relation: 'Chủ hộ',
      isHouseholder: true,
      headName: '',
      permanentAddress: DEFAULT_ADDRESS,
      temporaryAddress: '',
      group: stub.group,
      fatherName: '',
      motherName: '',
    });
    const point = randomPointInBoundary(ring);
    allHouseholds.push({
      tenantId,
      familyId: stub.familyId,
      gpsCoord: point,
      houseNumber: '',
      // Đúng unpaidAmount 750.000đ đã ghi trong villageFund.unpaidHouseholdsList
      // gốc = NTM(500k) + KH(100k) + ANQP(150k) chưa đóng, QVN đã đóng.
      fundObligations: buildFundObligations(stub.familyId, ['NTM', 'KH', 'ANQP']),
    });
  }

  for (const familyId of syntheticIds) {
    const members = buildHouseholdMembers(familyId, usedCccds);
    members.forEach((m) => allResidents.push({ tenantId, ...m }));
    const point = randomPointInBoundary(ring);
    allHouseholds.push({
      tenantId,
      familyId,
      gpsCoord: point,
      houseNumber: '',
      fundObligations: buildFundObligations(familyId),
    });
  }

  await ResidentModel.insertMany(allResidents);
  await HouseholdModel.insertMany(allHouseholds);

  const finalFamilyCount = await ResidentModel.distinct('familyId', { tenantId });
  const finalResidentCount = await ResidentModel.countDocuments({ tenantId });
  console.log(`✅ Xong. Tổng: ${finalFamilyCount.length} hộ, ${finalResidentCount} nhân khẩu (mục tiêu ${TARGET_TOTAL_HOUSEHOLDS} hộ).`);

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
