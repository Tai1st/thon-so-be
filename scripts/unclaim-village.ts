// Gỡ cờ "claimed" bị treo trên 1 village trong Commune — dùng khi village đã
// được đánh dấu claimed=true (kèm/không kèm tenantId) nhưng tenant thật đã bị
// xóa hoặc chưa từng liên kết đúng 2 chiều (Tenant.communeId <-> Commune
// village.tenantId). Không xóa village khỏi Commune, chỉ trả về trạng thái
// "chưa ai nhận" để superadmin có thể tạo tenant mới cho thôn này.
//
// Chạy: npx ts-node scripts/unclaim-village.ts <communeId> <villageIndex>
import 'dotenv/config';
import mongoose from 'mongoose';
import { Commune, CommuneSchema } from '../src/schemas/commune.schema';

async function main() {
  const communeId = process.argv[2];
  const villageIndex = Number(process.argv[3]);
  if (!communeId || Number.isNaN(villageIndex)) {
    throw new Error('Dùng: npx ts-node scripts/unclaim-village.ts <communeId> <villageIndex>');
  }

  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('Thiếu MONGODB_URI trong .env');
  await mongoose.connect(uri);

  const CommuneModel = mongoose.model(Commune.name, CommuneSchema);
  const commune = await CommuneModel.findById(communeId);
  if (!commune) throw new Error('Không tìm thấy commune.');
  const village = commune.villages[villageIndex];
  if (!village) throw new Error('Không tìm thấy village ở index này.');

  console.log('Trước khi sửa:', JSON.stringify({ name: village.name, claimed: village.claimed, tenantId: village.tenantId }));
  village.claimed = false;
  village.tenantId = undefined;
  await commune.save();
  console.log(`Đã gỡ claimed cho village "${village.name}" (index ${villageIndex}) trong commune "${commune.name}".`);

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
