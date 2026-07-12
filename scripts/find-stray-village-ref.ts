import 'dotenv/config';
import mongoose from 'mongoose';
import { Commune, CommuneSchema } from '../src/schemas/commune.schema';

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('Thiếu MONGODB_URI trong .env');
  await mongoose.connect(uri);

  const CommuneModel = mongoose.model(Commune.name, CommuneSchema);
  const communes = await CommuneModel.find().lean();

  for (const c of communes) {
    c.villages.forEach((v: any, idx: number) => {
      if (v.claimed || v.tenantId || (v.name && /ea.?đinh|ea.?dinh/i.test(v.name))) {
        console.log(JSON.stringify({ commune: c.name, communeId: c._id, villageIndex: idx, villageName: v.name, claimed: v.claimed, tenantId: v.tenantId }));
      }
    });
  }

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
