// Backfill KHÔNG PHÁ HỦY cho tenant tạo qua createTenantFromVillage TRƯỚC
// khi sửa lỗi thiếu bước gán ngược Tenant.communeId/communeVillageIndex
// (village.claimed/tenantId phía Commune đã đúng, chỉ thiếu chiều tenant).
// Quét mọi Commune, với village nào có claimed=true + tenantId hợp lệ mà
// Tenant tương ứng đang có communeId=null thì gán lại cho khớp.
//
// Chạy: npx ts-node scripts/backfill-tenant-commune-link.ts
import 'dotenv/config';
import mongoose from 'mongoose';
import { Tenant, TenantSchema } from '../src/schemas/tenant.schema';
import { Commune, CommuneSchema } from '../src/schemas/commune.schema';

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('Thiếu MONGODB_URI trong .env');
  await mongoose.connect(uri);

  const TenantModel = mongoose.model(Tenant.name, TenantSchema);
  const CommuneModel = mongoose.model(Commune.name, CommuneSchema);

  const communes = await CommuneModel.find();
  let fixed = 0;
  for (const commune of communes) {
    for (let i = 0; i < commune.villages.length; i++) {
      const village = commune.villages[i];
      if (!village.claimed || !village.tenantId) continue;
      const tenant = await TenantModel.findById(village.tenantId);
      if (!tenant) continue;
      if (!tenant.communeId) {
        tenant.communeId = commune._id;
        tenant.communeVillageIndex = i;
        await tenant.save();
        console.log(`Đã gán lại "${tenant.name}" (${tenant.slug}) -> "${commune.name}" / thôn "${village.name}" (index ${i}).`);
        fixed++;
      }
    }
  }
  console.log(`Hoàn tất. Đã sửa ${fixed} tenant.`);

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
