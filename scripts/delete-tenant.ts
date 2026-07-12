// Xóa toàn bộ 1 tenant lỗi + mọi dữ liệu liên quan theo tenantId, dùng cho
// trường hợp tenant tạo hỏng/lỗi cần dọn sạch (vd tenant "eadinh" không có
// nhân khẩu thật, chỉ còn 1 account rác). KHÔNG dùng cho tenant đang có dữ
// liệu thật đang sử dụng — thao tác này không thể hoàn tác.
//
// Chạy: npx ts-node scripts/delete-tenant.ts <slug>
import 'dotenv/config';
import mongoose from 'mongoose';
import { Tenant, TenantSchema } from '../src/schemas/tenant.schema';
import { Account, AccountSchema } from '../src/schemas/account.schema';
import { Resident, ResidentSchema } from '../src/schemas/resident.schema';
import { AssociationQuota, AssociationQuotaSchema } from '../src/schemas/association-quota.schema';
import { AuditLog, AuditLogSchema } from '../src/schemas/audit-log.schema';
import { HomeContent, HomeContentSchema } from '../src/schemas/home-content.schema';
import { Household, HouseholdSchema, VillageFund, VillageFundSchema } from '../src/schemas/household.schema';
import { IncidentReport, IncidentReportSchema, ResidenceRegistration, ResidenceRegistrationSchema, IncidentMinutes, IncidentMinutesSchema } from '../src/schemas/incident.schema';
import { PermissionMatrix, PermissionMatrixSchema } from '../src/schemas/permission-matrix.schema';
import { DeleteRequest, DeleteRequestSchema, MemberEditRequest, MemberEditRequestSchema, NewMemberRequest, NewMemberRequestSchema } from '../src/schemas/requests.schema';
import { Commune, CommuneSchema } from '../src/schemas/commune.schema';

async function main() {
  const slug = process.argv[2];
  if (!slug) throw new Error('Thiếu slug. Dùng: npx ts-node scripts/delete-tenant.ts <slug>');

  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('Thiếu MONGODB_URI trong .env');
  await mongoose.connect(uri);

  const TenantModel = mongoose.model(Tenant.name, TenantSchema);
  const AccountModel = mongoose.model(Account.name, AccountSchema);
  const ResidentModel = mongoose.model(Resident.name, ResidentSchema);
  const AssociationQuotaModel = mongoose.model(AssociationQuota.name, AssociationQuotaSchema);
  const AuditLogModel = mongoose.model(AuditLog.name, AuditLogSchema);
  const HomeContentModel = mongoose.model(HomeContent.name, HomeContentSchema);
  const HouseholdModel = mongoose.model(Household.name, HouseholdSchema);
  const VillageFundModel = mongoose.model(VillageFund.name, VillageFundSchema);
  const IncidentReportModel = mongoose.model(IncidentReport.name, IncidentReportSchema);
  const ResidenceRegistrationModel = mongoose.model(ResidenceRegistration.name, ResidenceRegistrationSchema);
  const IncidentMinutesModel = mongoose.model(IncidentMinutes.name, IncidentMinutesSchema);
  const PermissionMatrixModel = mongoose.model(PermissionMatrix.name, PermissionMatrixSchema);
  const DeleteRequestModel = mongoose.model(DeleteRequest.name, DeleteRequestSchema);
  const MemberEditRequestModel = mongoose.model(MemberEditRequest.name, MemberEditRequestSchema);
  const NewMemberRequestModel = mongoose.model(NewMemberRequest.name, NewMemberRequestSchema);
  const CommuneModel = mongoose.model(Commune.name, CommuneSchema);

  const tenant = await TenantModel.findOne({ slug });
  if (!tenant) throw new Error(`Không tìm thấy tenant slug="${slug}".`);
  const tenantId = tenant._id;

  // Bỏ gán khỏi xã (nếu có) trước khi xóa, tránh làng bị "claimed" treo.
  if (tenant.communeId && tenant.communeVillageIndex !== null && tenant.communeVillageIndex !== undefined) {
    const commune = await CommuneModel.findById(tenant.communeId);
    const village = commune?.villages[tenant.communeVillageIndex];
    if (village && String(village.tenantId) === String(tenantId)) {
      village.claimed = false;
      village.tenantId = undefined;
      await commune!.save();
      console.log('Đã bỏ gán khỏi xã.');
    }
  }

  const results = await Promise.all([
    AccountModel.deleteMany({ tenantId }),
    ResidentModel.deleteMany({ tenantId }),
    AssociationQuotaModel.deleteMany({ tenantId }),
    AuditLogModel.deleteMany({ tenantId }),
    HomeContentModel.deleteMany({ tenantId }),
    HouseholdModel.deleteMany({ tenantId }),
    VillageFundModel.deleteMany({ tenantId }),
    IncidentReportModel.deleteMany({ tenantId }),
    ResidenceRegistrationModel.deleteMany({ tenantId }),
    IncidentMinutesModel.deleteMany({ tenantId }),
    PermissionMatrixModel.deleteMany({ tenantId }),
    DeleteRequestModel.deleteMany({ tenantId }),
    MemberEditRequestModel.deleteMany({ tenantId }),
    NewMemberRequestModel.deleteMany({ tenantId }),
  ]);
  const labels = [
    'Account', 'Resident', 'AssociationQuota', 'AuditLog', 'HomeContent', 'Household', 'VillageFund',
    'IncidentReport', 'ResidenceRegistration', 'IncidentMinutes', 'PermissionMatrix', 'DeleteRequest',
    'MemberEditRequest', 'NewMemberRequest',
  ];
  results.forEach((r, i) => console.log(`${labels[i]}: đã xóa ${r.deletedCount}`));

  await TenantModel.deleteOne({ _id: tenantId });
  console.log(`Đã xóa tenant "${slug}" (${tenantId}).`);

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
