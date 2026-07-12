// Backfill KHÔNG PHÁ HỦY: gán HomeContent.oldVillages cho tenant "doanket"
// bằng đúng 2 tên thôn cũ đã dùng trong toàn bộ dữ liệu mẫu (Resident.group,
// Stat.breakdown) trước khi trường này được Admin tự quản lý qua "Quản lý
// Trang chủ" — tránh làm trống danh sách nhóm cư trú của tenant demo hiện có.
//
// Chạy: npx ts-node scripts/backfill-old-villages.ts
import 'dotenv/config';
import mongoose from 'mongoose';
import { Tenant, TenantSchema } from '../src/schemas/tenant.schema';
import { HomeContent, HomeContentSchema } from '../src/schemas/home-content.schema';

const TENANT_SLUG = 'doanket';
const OLD_VILLAGES = ['Đoàn Kết cũ', 'Yên Khánh cũ'];

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('Thiếu MONGODB_URI trong .env');
  await mongoose.connect(uri);

  const TenantModel = mongoose.model(Tenant.name, TenantSchema);
  const HomeContentModel = mongoose.model(HomeContent.name, HomeContentSchema);

  const tenant = await TenantModel.findOne({ slug: TENANT_SLUG });
  if (!tenant) throw new Error(`Không tìm thấy tenant "${TENANT_SLUG}"`);

  const doc = await HomeContentModel.findOne({ tenantId: tenant._id });
  if (!doc) throw new Error('Không tìm thấy HomeContent cho tenant này.');

  doc.oldVillages = OLD_VILLAGES;
  doc.markModified('oldVillages');

  // Gán breakdown cho 3 stat gốc (Diện tích/Quy mô dân cư/Tổng nhân khẩu)
  // đúng dữ liệu mẫu ban đầu, nếu đang thiếu (do trước đây bị reset về []).
  const BREAKDOWN_BY_LABEL: Record<string, { label: string; value: string }[]> = {
    'Diện Tích Tự Nhiên': [
      { label: 'Thôn Đoàn Kết cũ:', value: '202,41 ha' },
      { label: 'Thôn Yên Khánh cũ:', value: '356,82 ha' },
    ],
    'Quy Mô Dân Cư': [
      { label: 'Thôn Đoàn Kết cũ:', value: '190 hộ' },
      { label: 'Thôn Yên Khánh cũ:', value: '173 hộ' },
    ],
    'Tổng Số Nhân Khẩu': [
      { label: 'Thôn Đoàn Kết cũ:', value: '851 người' },
      { label: 'Thôn Yên Khánh cũ:', value: '796 người' },
    ],
  };
  let statsFixed = 0;
  doc.stats.forEach((s) => {
    if ((!s.breakdown || s.breakdown.length === 0) && BREAKDOWN_BY_LABEL[s.label]) {
      s.breakdown = BREAKDOWN_BY_LABEL[s.label];
      statsFixed++;
    }
  });
  if (statsFixed > 0) doc.markModified('stats');

  await doc.save();
  console.log(`Đã gán oldVillages = [${OLD_VILLAGES.join(', ')}] và khôi phục breakdown cho ${statsFixed} chỉ số thống kê.`);

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
