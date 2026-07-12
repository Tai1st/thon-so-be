// Thêm vài cư dân mẫu cho 1 tenant (test/demo) — dùng đúng logic tương tự
// AdminAccountsService.createResident(): chủ hộ tự sinh mã hộ mới, thành
// viên dùng chung mã hộ đó; tài khoản tự cấp nếu có CCCD, mật khẩu mặc định
// = slug tenant.
//
// Chạy: npx ts-node scripts/add-sample-residents.ts <slug>
import 'dotenv/config';
import * as bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { Tenant, TenantSchema } from '../src/schemas/tenant.schema';
import { Account, AccountSchema } from '../src/schemas/account.schema';
import { Resident, ResidentSchema } from '../src/schemas/resident.schema';

const SAMPLE_HOUSEHOLD = [
  {
    name: 'Nguyễn Văn An',
    dob: '12/05/1975',
    gender: 'male',
    cccd: '041075001234',
    phone: '0905123456',
    relation: 'Chủ hộ',
    isHouseholder: true,
  },
  {
    name: 'Trần Thị Bình',
    dob: '20/08/1978',
    gender: 'female',
    cccd: '041078005678',
    phone: '0905123457',
    relation: 'Vợ',
    isHouseholder: false,
  },
  {
    name: 'Nguyễn Văn Cường',
    dob: '03/03/2005',
    gender: 'male',
    cccd: '041005009012',
    phone: '',
    relation: 'Con',
    isHouseholder: false,
  },
];

async function main() {
  const slug = process.argv[2];
  if (!slug) throw new Error('Dùng: npx ts-node scripts/add-sample-residents.ts <slug>');

  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('Thiếu MONGODB_URI trong .env');
  await mongoose.connect(uri);

  const TenantModel = mongoose.model(Tenant.name, TenantSchema);
  const AccountModel = mongoose.model(Account.name, AccountSchema);
  const ResidentModel = mongoose.model(Resident.name, ResidentSchema);

  const tenant = await TenantModel.findOne({ slug });
  if (!tenant) throw new Error(`Không tìm thấy tenant slug="${slug}".`);

  let familyId = '';
  do {
    familyId = `FAM-${Math.floor(100 + Math.random() * 900)}`;
    // eslint-disable-next-line no-await-in-loop
  } while (await ResidentModel.exists({ tenantId: tenant._id, familyId }));

  const passwordHash = await bcrypt.hash(tenant.slug, 10);

  for (const m of SAMPLE_HOUSEHOLD) {
    const resident = await ResidentModel.create({
      tenantId: tenant._id,
      name: m.name,
      dob: m.dob,
      gender: m.gender,
      cccd: m.cccd,
      phone: m.phone,
      relation: m.relation,
      isHouseholder: m.isHouseholder,
      familyId,
      permanentAddress: `${tenant.name}, Xã Dliê Ya, Đắk Lắk`,
      temporaryAddress: '',
      group: 'Khác',
    });

    if (m.cccd) {
      await AccountModel.create({
        tenantId: tenant._id,
        residentId: resident._id,
        username: m.cccd,
        passwordHash,
        name: m.name,
        role: 'resident',
        position: '',
        status: 'active',
      });
    }
    console.log(`Đã thêm "${m.name}" (${m.relation}) vào hộ ${familyId}${m.cccd ? ' + tài khoản đăng nhập' : ''}.`);
  }

  console.log(`Xong. Mã hộ: ${familyId}. Mật khẩu đăng nhập cho các tài khoản mới: "${tenant.slug}".`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
