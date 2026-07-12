import 'dotenv/config';
import mongoose from 'mongoose';
import { Tenant, TenantSchema } from '../src/schemas/tenant.schema';
import { Account, AccountSchema } from '../src/schemas/account.schema';
import { Resident, ResidentSchema } from '../src/schemas/resident.schema';

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('Thiếu MONGODB_URI trong .env');
  await mongoose.connect(uri);

  const TenantModel = mongoose.model(Tenant.name, TenantSchema);
  const AccountModel = mongoose.model(Account.name, AccountSchema);
  const ResidentModel = mongoose.model(Resident.name, ResidentSchema);

  const tenants = await TenantModel.find({
    $or: [{ slug: /eadinh/i }, { name: /eadinh/i }],
  }).lean();

  if (tenants.length === 0) {
    console.log('Không tìm thấy tenant nào khớp "eadinh".');
  }
  for (const t of tenants) {
    const [accountCount, residentCount] = await Promise.all([
      AccountModel.countDocuments({ tenantId: t._id }),
      ResidentModel.countDocuments({ tenantId: t._id }),
    ]);
    console.log(JSON.stringify({ _id: t._id, slug: t.slug, name: t.name, accountCount, residentCount, communeId: t.communeId, communeVillageIndex: t.communeVillageIndex }, null, 2));
  }

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
