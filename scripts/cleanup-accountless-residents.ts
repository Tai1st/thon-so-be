// Xóa các cư dân KHÔNG có tài khoản đăng nhập (bất kể lý do — thiếu CCCD,
// CCCD trùng khiến account không tạo được, v.v.) trên TOÀN BỘ tenant.
// Đây là thao tác XÓA THẬT, không thể hoàn tác — mặc định chỉ chạy
// dry-run (liệt kê, không xóa gì). Phải truyền --confirm mới thực sự xóa.
//
// Chạy: npx ts-node scripts/cleanup-accountless-residents.ts            (dry-run)
//       npx ts-node scripts/cleanup-accountless-residents.ts --confirm  (xóa thật)
//
// BẮT BUỘC mongodump backup trước khi chạy --confirm (xem DEPLOY.md mục 9).
import 'dotenv/config';
import mongoose from 'mongoose';
import { Resident, ResidentSchema } from '../src/schemas/resident.schema';
import { Account, AccountSchema } from '../src/schemas/account.schema';
import { Tenant, TenantSchema } from '../src/schemas/tenant.schema';
import {
  DeleteRequest,
  DeleteRequestSchema,
  MemberEditRequest,
  MemberEditRequestSchema,
} from '../src/schemas/requests.schema';
import { AssociationQuota, AssociationQuotaSchema } from '../src/schemas/association-quota.schema';

const CONFIRM = process.argv.includes('--confirm');

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('Thiếu MONGODB_URI trong .env');
  await mongoose.connect(uri);
  console.log('Đã kết nối MongoDB:', uri);
  console.log(CONFIRM ? '⚠️  CHẾ ĐỘ XÓA THẬT (--confirm)' : 'ℹ️  DRY-RUN — chỉ liệt kê, chưa xóa gì.');
  console.log('');

  const ResidentModel = mongoose.model(Resident.name, ResidentSchema);
  const AccountModel = mongoose.model(Account.name, AccountSchema);
  const TenantModel = mongoose.model(Tenant.name, TenantSchema);
  const DeleteRequestModel = mongoose.model(DeleteRequest.name, DeleteRequestSchema);
  const MemberEditRequestModel = mongoose.model(MemberEditRequest.name, MemberEditRequestSchema);
  const AssociationQuotaModel = mongoose.model(AssociationQuota.name, AssociationQuotaSchema);

  const accounts = await AccountModel.find({ residentId: { $ne: null } }, { residentId: 1 }).lean();
  const accountedResidentIds = new Set(accounts.map((a) => String(a.residentId)));

  const allResidents = await ResidentModel.find({}).lean();
  const accountless = allResidents.filter((r) => !accountedResidentIds.has(String(r._id)));

  if (accountless.length === 0) {
    console.log('Không có cư dân nào thiếu tài khoản. Không cần làm gì thêm.');
    await mongoose.disconnect();
    return;
  }

  const tenants = await TenantModel.find({}, { name: 1, slug: 1 }).lean();
  const tenantNameById = new Map(tenants.map((t) => [String(t._id), `${t.name} (${t.slug})`]));

  // Nhóm theo hộ để cảnh báo hộ nào sẽ mất HẾT thành viên, hoặc mất chủ hộ.
  const byFamily = new Map<string, typeof allResidents>();
  for (const r of allResidents) {
    const key = `${r.tenantId}:${r.familyId}`;
    const list = byFamily.get(key) || [];
    list.push(r);
    byFamily.set(key, list);
  }

  console.log(`Tổng số cư dân: ${allResidents.length}`);
  console.log(`Số cư dân KHÔNG có tài khoản (sẽ bị xóa): ${accountless.length}`);
  console.log('');
  console.log('Chi tiết theo tenant:');
  const byTenant = new Map<string, number>();
  for (const r of accountless) {
    const key = tenantNameById.get(String(r.tenantId)) || String(r.tenantId);
    byTenant.set(key, (byTenant.get(key) || 0) + 1);
  }
  for (const [tenant, count] of byTenant) {
    console.log(`  - ${tenant}: ${count} cư dân`);
  }
  console.log('');

  const emptyHouseholdKeys = new Set<string>();
  const headlessHouseholdKeys = new Set<string>();
  for (const r of accountless) {
    const key = `${r.tenantId}:${r.familyId}`;
    const familyMembers = byFamily.get(key) || [];
    const remaining = familyMembers.filter((m) => accountedResidentIds.has(String(m._id)));
    if (remaining.length === 0) {
      emptyHouseholdKeys.add(key);
    } else if (r.isHouseholder && !remaining.some((m) => m.isHouseholder)) {
      headlessHouseholdKeys.add(key);
    }
  }

  if (emptyHouseholdKeys.size) {
    console.log(`⚠️  CẢNH BÁO: ${emptyHouseholdKeys.size} hộ sẽ MẤT TOÀN BỘ thành viên sau khi xóa — toàn bộ danh sách hộ đó (kể cả người ĐÃ có tài khoản, nếu có) để đối chiếu:`);
    for (const key of emptyHouseholdKeys) {
      const [tenantId, familyId] = key.split(':');
      const members = byFamily.get(key) || [];
      console.log(`  Hộ ${familyId} (tenant ${tenantNameById.get(tenantId) || tenantId}) — ${members.length} người:`);
      for (const m of members) {
        const hasAccount = accountedResidentIds.has(String(m._id));
        console.log(
          `    - ${m.name} | sinh ${m.dob} | ${m.relation}${m.isHouseholder ? ' (chủ hộ)' : ''} | CCCD: "${m.cccd || '(trống)'}" | ${hasAccount ? 'ĐÃ có tài khoản' : 'sẽ bị xóa'}`,
        );
      }
    }
    console.log('');
  }
  if (headlessHouseholdKeys.size) {
    console.log(`⚠️  CẢNH BÁO: ${headlessHouseholdKeys.size} hộ sẽ MẤT CHỦ HỘ (còn thành viên khác nhưng không ai là chủ hộ):`);
    for (const key of headlessHouseholdKeys) {
      const [, familyId] = key.split(':');
      console.log(`  - ${familyId} (tenant ${tenantNameById.get(key.split(':')[0]) || key.split(':')[0]})`);
    }
    console.log('');
  }

  // Nhóm trùng tên + cùng hộ + cùng tenant — dấu hiệu của bản ghi trùng lặp
  // thật (import lỗi 2 lần) thay vì trùng ngẫu nhiên giữa 2 người khác nhau.
  const dupKey = (r: (typeof accountless)[number]) => `${r.tenantId}:${r.familyId}:${r.name}`;
  const dupGroups = new Map<string, typeof accountless>();
  for (const r of accountless) {
    const key = dupKey(r);
    const list = dupGroups.get(key) || [];
    list.push(r);
    dupGroups.set(key, list);
  }
  const realDupGroups = [...dupGroups.values()].filter((g) => g.length > 1);
  if (realDupGroups.length) {
    console.log(`⚠️  CẢNH BÁO: ${realDupGroups.length} nhóm có khả năng là bản ghi TRÙNG LẶP (cùng tên, cùng hộ, cùng tenant) — kiểm tra kỹ trước khi xóa:`);
    for (const group of realDupGroups) {
      const first = group[0];
      console.log(`  "${first.name}" trong hộ ${first.familyId} (tenant ${tenantNameById.get(String(first.tenantId)) || first.tenantId}) — ${group.length} bản ghi:`);
      for (const r of group) {
        console.log(`    - _id=${r._id} | sinh ${r.dob} | ${r.gender} | SĐT: "${r.phone || '(trống)'}" | quan hệ: ${r.relation}`);
      }
    }
    console.log('');
  }

  console.log('Danh sách cư dân sẽ bị xóa:');
  for (const r of accountless) {
    console.log(`  - [${r.familyId}] ${r.name} (_id=${r._id}, CCCD: "${r.cccd || '(trống)'}", tenant: ${tenantNameById.get(String(r.tenantId)) || r.tenantId})`);
  }

  if (!CONFIRM) {
    console.log('');
    console.log('Đây là dry-run — chưa xóa gì. Chạy lại với --confirm để xóa thật.');
    await mongoose.disconnect();
    return;
  }

  console.log('');
  console.log('Đang xóa...');
  const idsToDelete = accountless.map((r) => r._id);
  const idsToDeleteStr = idsToDelete.map((id) => String(id));

  const residentDel = await ResidentModel.deleteMany({ _id: { $in: idsToDelete } });
  const deleteReqDel = await DeleteRequestModel.deleteMany({ residentId: { $in: idsToDeleteStr } });
  const memberEditReqDel = await MemberEditRequestModel.deleteMany({ residentId: { $in: idsToDeleteStr } });

  // Dọn luôn các entry hội phí cá nhân (memberFunds) trỏ tới resident đã xóa.
  const quotas = await AssociationQuotaModel.find({});
  let quotaCleanCount = 0;
  for (const quota of quotas) {
    let changed = false;
    for (const residentId of idsToDeleteStr) {
      if (quota.memberFunds.has(residentId)) {
        quota.memberFunds.delete(residentId);
        changed = true;
      }
    }
    if (changed) {
      quota.markModified('memberFunds');
      await quota.save();
      quotaCleanCount += 1;
    }
  }

  console.log(`✅ Đã xóa ${residentDel.deletedCount} cư dân.`);
  console.log(`✅ Đã dọn ${deleteReqDel.deletedCount} yêu cầu xóa liên quan, ${memberEditReqDel.deletedCount} yêu cầu sửa thông tin liên quan.`);
  console.log(`✅ Đã dọn dữ liệu hội phí cá nhân trong ${quotaCleanCount} quỹ hội.`);

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
