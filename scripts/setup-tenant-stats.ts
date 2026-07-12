// Tạo/đồng bộ 3 chỉ số thống kê chuẩn (Diện Tích Tự Nhiên / Quy Mô Dân Cư /
// Tổng Số Nhân Khẩu) cho 1 tenant dựa trên HomeContent.oldVillages đã có +
// dữ liệu Resident/Household THẬT hiện có — không bịa số liệu diện tích
// (chưa có dữ liệu KMZ per-village nên để "Chưa cập nhật"), chỉ tính đúng
// dân cư/nhân khẩu theo Resident.group. Nếu resident đang để group mặc
// định "Khác", script sẽ rải đều (round-robin) vào các thôn cũ để có số
// liệu breakdown khác 0 cho demo — bỏ qua resident đã có group thật khác
// "Khác".
//
// Chạy: npx ts-node scripts/setup-tenant-stats.ts <slug>
import 'dotenv/config';
import mongoose from 'mongoose';
import { Tenant, TenantSchema } from '../src/schemas/tenant.schema';
import { HomeContent, HomeContentSchema } from '../src/schemas/home-content.schema';
import { Resident, ResidentSchema } from '../src/schemas/resident.schema';

function randomId(prefix: string): string {
  return `${prefix}-${Math.floor(1000 + Math.random() * 9000)}`;
}

async function main() {
  const slug = process.argv[2];
  if (!slug) throw new Error('Dùng: npx ts-node scripts/setup-tenant-stats.ts <slug>');

  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('Thiếu MONGODB_URI trong .env');
  await mongoose.connect(uri);

  const TenantModel = mongoose.model(Tenant.name, TenantSchema);
  const HomeContentModel = mongoose.model(HomeContent.name, HomeContentSchema);
  const ResidentModel = mongoose.model(Resident.name, ResidentSchema);

  const tenant = await TenantModel.findOne({ slug });
  if (!tenant) throw new Error(`Không tìm thấy tenant slug="${slug}".`);

  const doc = await HomeContentModel.findOne({ tenantId: tenant._id });
  if (!doc) throw new Error('Chưa có HomeContent cho tenant này.');
  const oldVillages: string[] = doc.oldVillages || [];
  if (oldVillages.length === 0) throw new Error('Tenant chưa có oldVillages nào — vào Quản lý Trang chủ thêm trước.');

  // Rải resident đang để "Khác" vào các thôn cũ (round-robin theo familyId
  // để cùng 1 hộ luôn cùng 1 nhóm), không đụng resident đã có group thật.
  const residentsToFix = await ResidentModel.find({ tenantId: tenant._id, group: 'Khác' }).sort({ familyId: 1 });
  const familyIdToVillage = new Map<string, string>();
  let vIdx = 0;
  for (const r of residentsToFix) {
    if (!familyIdToVillage.has(r.familyId)) {
      familyIdToVillage.set(r.familyId, oldVillages[vIdx % oldVillages.length]);
      vIdx++;
    }
    r.group = familyIdToVillage.get(r.familyId)!;
    await r.save();
  }

  const allResidents = await ResidentModel.find({ tenantId: tenant._id }).lean();
  const totalResidents = allResidents.length;
  const familyIds = new Set(allResidents.map((r) => r.familyId));
  const totalHouseholds = familyIds.size;

  function countByVillage(predicate: (r: (typeof allResidents)[number]) => boolean) {
    return oldVillages.map((v) => ({
      label: `Thôn ${v}:`,
      value: `${allResidents.filter((r) => r.group === v && predicate(r)).length}`,
    }));
  }

  const householdsByVillage = oldVillages.map((v) => {
    const familyIdsInVillage = new Set(allResidents.filter((r) => r.group === v).map((r) => r.familyId));
    return { label: `Thôn ${v}:`, value: `${familyIdsInVillage.size} hộ` };
  });
  const residentsByVillage = oldVillages.map((v) => ({
    label: `Thôn ${v}:`,
    value: `${allResidents.filter((r) => r.group === v).length} người`,
  }));
  const areaByVillage = oldVillages.map((v) => ({ label: `Thôn ${v}:`, value: 'Chưa cập nhật' }));

  const STAT_DEFS: { label: string; icon: string; value: string; unit: string; breakdown: { label: string; value: string }[] }[] = [
    { label: 'Diện Tích Tự Nhiên', icon: 'fa-map-location-dot', value: 'Chưa cập nhật', unit: '', breakdown: areaByVillage },
    { label: 'Quy Mô Dân Cư', icon: 'fa-house-chimney', value: `${totalHouseholds}`, unit: 'hộ', breakdown: householdsByVillage },
    { label: 'Tổng Số Nhân Khẩu', icon: 'fa-people-group', value: `${totalResidents}`, unit: 'người', breakdown: residentsByVillage },
  ];

  for (const def of STAT_DEFS) {
    const idx = doc.stats.findIndex((s) => s.label === def.label);
    const withId = { id: idx >= 0 ? doc.stats[idx].id : randomId('STAT'), ...def };
    if (idx >= 0) doc.stats[idx] = withId as never;
    else doc.stats.push(withId as never);
  }
  doc.markModified('stats');
  await doc.save();

  console.log(`Đã đồng bộ ${residentsToFix.length} nhân khẩu vào ${oldVillages.length} thôn cũ, và cập nhật 3 chỉ số thống kê cho tenant "${slug}".`);
  console.log(`Tổng: ${totalHouseholds} hộ, ${totalResidents} nhân khẩu.`);

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
