// Thêm nhiều hộ mẫu (mỗi hộ vài nhân khẩu) + vị trí GPS cho 1 tenant test/
// demo — mỗi hộ tự sinh mã hộ mới (giống chủ hộ tạo qua AdminAccountsService
// .createResident), gán tọa độ GPS rải ngẫu nhiên quanh tâm tenant (trong
// bán kính nhỏ) để hiển thị pin trên bản đồ danh mục + bản đồ nội bộ.
//
// Chạy: npx ts-node scripts/add-sample-households.ts <slug> [số hộ, mặc định 5]
import 'dotenv/config';
import * as bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { Tenant, TenantSchema } from '../src/schemas/tenant.schema';
import { Account, AccountSchema } from '../src/schemas/account.schema';
import { Resident, ResidentSchema } from '../src/schemas/resident.schema';
import { Household, HouseholdSchema } from '../src/schemas/household.schema';

const HO_NAMES = ['Nguyễn Văn', 'Trần Thị', 'Lê Văn', 'Phạm Thị', 'Hoàng Văn', 'Vũ Thị', 'Đặng Văn', 'Bùi Thị', 'Đỗ Văn', 'Ngô Thị'];
const GIVEN_NAMES_MALE = ['An', 'Bình', 'Cường', 'Dũng', 'Hải', 'Khánh', 'Long', 'Minh', 'Phong', 'Quang'];
const GIVEN_NAMES_FEMALE = ['Hoa', 'Lan', 'Mai', 'Ngọc', 'Nhung', 'Phương', 'Thảo', 'Trang', 'Vân', 'Yến'];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomPhone(): string {
  return `09${Math.floor(10000000 + Math.random() * 89999999)}`;
}

function randomCccd(seed: number): string {
  return `04${String(1970 + (seed % 40)).slice(1)}${String(seed).padStart(7, '0')}`;
}

function jitterCoord(lat: number, lng: number): { lat: number; lng: number } {
  // ~ vài trăm mét quanh tâm tenant, đủ để rải pin phân biệt trên bản đồ.
  const dLat = (Math.random() - 0.5) * 0.01;
  const dLng = (Math.random() - 0.5) * 0.01;
  return { lat: lat + dLat, lng: lng + dLng };
}

async function main() {
  const slug = process.argv[2];
  const count = Number(process.argv[3]) || 5;
  if (!slug) throw new Error('Dùng: npx ts-node scripts/add-sample-households.ts <slug> [số hộ]');

  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('Thiếu MONGODB_URI trong .env');
  await mongoose.connect(uri);

  const TenantModel = mongoose.model(Tenant.name, TenantSchema);
  const AccountModel = mongoose.model(Account.name, AccountSchema);
  const ResidentModel = mongoose.model(Resident.name, ResidentSchema);
  const HouseholdModel = mongoose.model(Household.name, HouseholdSchema);

  const tenant = await TenantModel.findOne({ slug });
  if (!tenant) throw new Error(`Không tìm thấy tenant slug="${slug}".`);
  if (!tenant.lat || !tenant.lng) throw new Error('Tenant chưa có tọa độ trung tâm (lat/lng).');

  const passwordHash = await bcrypt.hash(tenant.slug, 10);
  let cccdSeed = Math.floor(Math.random() * 900000);

  for (let i = 0; i < count; i++) {
    let familyId = '';
    do {
      familyId = `FAM-${Math.floor(100 + Math.random() * 900)}`;
      // eslint-disable-next-line no-await-in-loop
    } while (await ResidentModel.exists({ tenantId: tenant._id, familyId }));

    const surname = pick(HO_NAMES);
    const headIsMale = Math.random() > 0.5;
    const headName = `${surname} ${pick(headIsMale ? GIVEN_NAMES_MALE : GIVEN_NAMES_FEMALE)}`;
    const spouseName = `${pick(HO_NAMES)} ${pick(headIsMale ? GIVEN_NAMES_FEMALE : GIVEN_NAMES_MALE)}`;
    const childCount = Math.floor(Math.random() * 3);

    const members = [
      { name: headName, relation: 'Chủ hộ', gender: headIsMale ? 'male' : 'female', isHouseholder: true, age: 30 + Math.floor(Math.random() * 30) },
      { name: spouseName, relation: headIsMale ? 'Vợ' : 'Chồng', gender: headIsMale ? 'female' : 'male', isHouseholder: false, age: 28 + Math.floor(Math.random() * 30) },
      ...Array.from({ length: childCount }, () => {
        const male = Math.random() > 0.5;
        return {
          name: `${surname} ${pick(male ? GIVEN_NAMES_MALE : GIVEN_NAMES_FEMALE)}`,
          relation: 'Con',
          gender: male ? 'male' : 'female',
          isHouseholder: false,
          age: 1 + Math.floor(Math.random() * 20),
        };
      }),
    ];

    for (const m of members) {
      cccdSeed++;
      const dob = `01/01/${new Date().getFullYear() - m.age}`;
      const cccd = randomCccd(cccdSeed);
      const resident = await ResidentModel.create({
        tenantId: tenant._id,
        name: m.name,
        dob,
        gender: m.gender,
        cccd,
        phone: m.isHouseholder ? randomPhone() : '',
        relation: m.relation,
        isHouseholder: m.isHouseholder,
        familyId,
        permanentAddress: `${tenant.name}, Xã Dliê Ya, Đắk Lắk`,
        temporaryAddress: '',
        group: 'Khác',
      });
      await AccountModel.create({
        tenantId: tenant._id,
        residentId: resident._id,
        username: cccd,
        passwordHash,
        name: m.name,
        role: 'resident',
        position: '',
        status: 'active',
      });
    }

    const gpsCoord = jitterCoord(tenant.lat, tenant.lng);
    const houseNumber = String(10 + i * 3 + Math.floor(Math.random() * 3));
    await HouseholdModel.create({
      tenantId: tenant._id,
      familyId,
      gpsCoord,
      houseNumber,
    });

    console.log(
      `Hộ ${familyId} — chủ hộ "${headName}" (${members.length} nhân khẩu), số nhà ${houseNumber}, GPS (${gpsCoord.lat.toFixed(6)}, ${gpsCoord.lng.toFixed(6)}).`,
    );
  }

  console.log(`Xong. Đã tạo ${count} hộ mới cho tenant "${slug}". Mật khẩu mặc định mọi tài khoản mới: "${tenant.slug}".`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
