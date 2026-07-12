// Backfill KHÔNG PHÁ HỦY cho field Resident.association (mới thêm sau khi
// tenant "doanket" đã được seed từ trước, nên migrate-seed.ts's insertMany
// không áp dụng lại được cho residents đã tồn tại). Chỉ update field này
// theo tên khớp với E:\Dev\cong-thong-tin-thon\js\data.js — không xóa/reset
// gì khác, an toàn chạy khi đã có dữ liệu demo thật đang dùng.
//
// Chạy: npx ts-node scripts/backfill-association.ts
import 'dotenv/config';
import * as fs from 'fs';
import * as vm from 'vm';
import mongoose from 'mongoose';
import { Resident, ResidentSchema } from '../src/schemas/resident.schema';
import { Tenant, TenantSchema } from '../src/schemas/tenant.schema';

const PROTOTYPE_DATA_JS = 'E:/Dev/cong-thong-tin-thon/js/data.js';
const TENANT_SLUG = 'doanket';

function loadDefaultResidents(): { name: string; association?: string }[] {
  const src = fs.readFileSync(PROTOTYPE_DATA_JS, 'utf8');
  const footer = `;globalThis.__residents = defaultResidents;`;
  const sandbox: Record<string, unknown> = {};
  vm.createContext(sandbox);
  vm.runInContext(src + footer, sandbox, { filename: PROTOTYPE_DATA_JS });
  return sandbox.__residents as { name: string; association?: string }[];
}

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('Thiếu MONGODB_URI trong .env');
  await mongoose.connect(uri);

  const TenantModel = mongoose.model(Tenant.name, TenantSchema);
  const ResidentModel = mongoose.model(Resident.name, ResidentSchema);

  const tenant = await TenantModel.findOne({ slug: TENANT_SLUG });
  if (!tenant) throw new Error(`Không tìm thấy tenant "${TENANT_SLUG}"`);

  const defaultResidents = loadDefaultResidents();
  let updated = 0;
  for (const r of defaultResidents) {
    if (!r.association) continue;
    const res = await ResidentModel.updateOne(
      { tenantId: tenant._id, name: r.name },
      { $set: { association: r.association } },
    );
    if (res.matchedCount > 0) updated++;
  }

  console.log(`Đã cập nhật association cho ${updated}/${defaultResidents.length} nhân khẩu.`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
