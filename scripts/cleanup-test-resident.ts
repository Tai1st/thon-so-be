import 'dotenv/config';
import mongoose from 'mongoose';
import { Resident, ResidentSchema } from '../src/schemas/resident.schema';
import { Account, AccountSchema } from '../src/schemas/account.schema';

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('Thiếu MONGODB_URI trong .env');
  await mongoose.connect(uri);

  const ResidentModel = mongoose.model(Resident.name, ResidentSchema);
  const AccountModel = mongoose.model(Account.name, AccountSchema);

  const residents = await ResidentModel.find({ familyId: 'FAM-TESTPUP01' });
  for (const r of residents) {
    await AccountModel.deleteMany({ residentId: r._id });
  }
  const res = await ResidentModel.deleteMany({ familyId: 'FAM-TESTPUP01' });
  console.log(`Đã xóa ${res.deletedCount} resident + account liên quan (familyId=FAM-TESTPUP01).`);

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
