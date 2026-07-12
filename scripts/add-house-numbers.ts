// Gán số nhà cho các hộ CHƯA có houseNumber của 1 tenant — không đụng tới
// hộ đã có số nhà (an toàn chạy nhiều lần / sau khi user đã tự nhập tay).
// Household doc có thể chưa tồn tại (chỉ tạo khi có GPS/houseNumber trước
// đó) nên với hộ chưa có doc, upsert luôn.
//
// Chạy: npx ts-node scripts/add-house-numbers.ts <slug>
import 'dotenv/config';
import mongoose from 'mongoose';
import { Tenant, TenantSchema } from '../src/schemas/tenant.schema';
import { Resident, ResidentSchema } from '../src/schemas/resident.schema';
import { Household, HouseholdSchema } from '../src/schemas/household.schema';

async function main() {
  const slug = process.argv[2];
  if (!slug) throw new Error('Dùng: npx ts-node scripts/add-house-numbers.ts <slug>');

  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('Thiếu MONGODB_URI trong .env');
  await mongoose.connect(uri);

  const TenantModel = mongoose.model(Tenant.name, TenantSchema);
  const ResidentModel = mongoose.model(Resident.name, ResidentSchema);
  const HouseholdModel = mongoose.model(Household.name, HouseholdSchema);

  const tenant = await TenantModel.findOne({ slug });
  if (!tenant) throw new Error(`Không tìm thấy tenant slug="${slug}".`);

  const familyIds = (await ResidentModel.distinct('familyId', { tenantId: tenant._id })) as string[];
  familyIds.sort();

  const existing = await HouseholdModel.find({ tenantId: tenant._id }).lean();
  const houseNumberByFamilyId = new Map(existing.map((h) => [h.familyId, h.houseNumber]));

  let assigned = 0;
  let skipped = 0;
  let counter = 1;
  for (const familyId of familyIds) {
    const current = houseNumberByFamilyId.get(familyId);
    if (current) {
      skipped++;
      continue;
    }
    const houseNumber = String(counter);
    counter++;
    await HouseholdModel.updateOne({ tenantId: tenant._id, familyId }, { $set: { houseNumber } }, { upsert: true });
    assigned++;
  }

  console.log(`Đã gán số nhà cho ${assigned} hộ, bỏ qua ${skipped} hộ đã có số nhà sẵn (tổng ${familyIds.length} hộ).`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
