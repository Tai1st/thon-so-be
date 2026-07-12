// Backfill KHÔNG PHÁ HỦY cho VillageFund.chi: migrate-seed.ts trước đây chỉ
// copy {desc, amount} khi seed, làm mất field `id`/`date` gốc trong
// E:\Dev\cong-thong-tin-thon\js\data.js (defaultVillageFund.chi), nên các
// giao dịch Chi cũ không có nút Sửa/Xóa (component chỉ hiện nút khi có id).
// Chỉ gán lại id/date cho các entry đang thiếu id, theo đúng thứ tự gốc —
// không đụng tới giao dịch mới hơn (đã có id do randomId() khi tạo qua UI).
//
// Chạy: npx ts-node scripts/backfill-village-fund-chi.ts
import 'dotenv/config';
import * as fs from 'fs';
import * as vm from 'vm';
import mongoose from 'mongoose';
import { VillageFund, VillageFundSchema } from '../src/schemas/household.schema';
import { Tenant, TenantSchema } from '../src/schemas/tenant.schema';

const PROTOTYPE_DATA_JS = 'E:/Dev/cong-thong-tin-thon/js/data.js';
const TENANT_SLUG = 'doanket';

function loadDefaultVillageFundChi(): { id: string; desc: string; amount: number; date: string }[] {
  const src = fs.readFileSync(PROTOTYPE_DATA_JS, 'utf8');
  const footer = `;globalThis.__villageFund = defaultVillageFund;`;
  const sandbox: Record<string, unknown> = {};
  vm.createContext(sandbox);
  vm.runInContext(src + footer, sandbox, { filename: PROTOTYPE_DATA_JS });
  return (sandbox.__villageFund as { chi: { id: string; desc: string; amount: number; date: string }[] }).chi;
}

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('Thiếu MONGODB_URI trong .env');
  await mongoose.connect(uri);

  const TenantModel = mongoose.model(Tenant.name, TenantSchema);
  const VillageFundModel = mongoose.model(VillageFund.name, VillageFundSchema);

  const tenant = await TenantModel.findOne({ slug: TENANT_SLUG });
  if (!tenant) throw new Error(`Không tìm thấy tenant "${TENANT_SLUG}"`);

  const fund = await VillageFundModel.findOne({ tenantId: tenant._id });
  if (!fund) throw new Error('Không tìm thấy VillageFund cho tenant này.');

  const sourceChi = loadDefaultVillageFundChi();
  const missing = fund.chi.filter((c) => !c.id);
  if (missing.length !== sourceChi.length) {
    console.warn(
      `Cảnh báo: số entry thiếu id (${missing.length}) khác số entry gốc (${sourceChi.length}) — vẫn gán theo thứ tự, kiểm tra lại kết quả sau khi chạy.`,
    );
  }

  let updated = 0;
  for (let i = 0; i < missing.length && i < sourceChi.length; i++) {
    missing[i].id = sourceChi[i].id;
    missing[i].date = sourceChi[i].date;
    updated++;
  }

  fund.markModified('chi');
  await fund.save();

  console.log(`Đã gán id/date cho ${updated} giao dịch Chi quỹ thôn còn thiếu.`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
