import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { Account, AccountDocument } from '../schemas/account.schema';
import { Resident, ResidentDocument } from '../schemas/resident.schema';
import { AssociationQuota, AssociationQuotaDocument } from '../schemas/association-quota.schema';
import { Tenant, TenantDocument } from '../schemas/tenant.schema';
import { EditAccountDto } from './dto/edit-account.dto';
import { CreateResidentDto } from './dto/create-resident.dto';
import { EditResidentInfoDto } from './dto/edit-resident.dto';
import { BulkResidentRowDto } from './dto/bulk-import-residents.dto';
import { AdminAuditService } from './admin-audit.service';

@Injectable()
export class AdminAccountsService {
  constructor(
    @InjectModel(Account.name) private accountModel: Model<AccountDocument>,
    @InjectModel(Resident.name) private residentModel: Model<ResidentDocument>,
    @InjectModel(AssociationQuota.name) private associationQuotaModel: Model<AssociationQuotaDocument>,
    @InjectModel(Tenant.name) private tenantModel: Model<TenantDocument>,
    private auditService: AdminAuditService,
  ) {}

  // Mật khẩu mặc định cấp cho tài khoản mới/reset luôn là slug của tenant
  // (vd tenant "doanket" -> mật khẩu "doanket") — mỗi thôn 1 mật khẩu mặc
  // định riêng thay vì dùng chung 1 chuỗi cố định cho mọi tenant.
  private async defaultPasswordHash(tenantId: Types.ObjectId): Promise<string> {
    const tenant = await this.tenantModel.findById(tenantId).lean();
    return bcrypt.hash(tenant?.slug || 'doanket', 10);
  }

  async listAssociationNames(tenantId: Types.ObjectId): Promise<string[]> {
    return this.associationQuotaModel.distinct('name', { tenantId });
  }

  async list(tenantId: Types.ObjectId): Promise<{
    accounts: (Account & { _id: Types.ObjectId; familyId?: string })[];
    residentCount: number;
    unaccountedCount: number;
  }> {
    const [accounts, residentCount] = await Promise.all([
      this.accountModel.find({ tenantId }).sort({ name: 1 }).lean(),
      this.residentModel.countDocuments({ tenantId }),
    ]);
    const accountedNames = new Set(accounts.map((a) => a.name));
    const unaccountedCount = await this.residentModel.countDocuments({
      tenantId,
      name: { $nin: [...accountedNames] },
    });

    // Gắn mã hộ (familyId) của cư dân liên kết vào từng tài khoản — dùng để
    // tìm kiếm/sắp xếp theo hộ ở FE (tab "Quản lý tài khoản").
    const residentIds = accounts.map((a) => a.residentId).filter((id): id is Types.ObjectId => !!id);
    const residents = await this.residentModel.find({ _id: { $in: residentIds } }, { familyId: 1 }).lean();
    const familyIdByResidentId = new Map(residents.map((r) => [String(r._id), r.familyId]));
    const accountsWithFamilyId = accounts.map((a) => ({
      ...a,
      familyId: a.residentId ? familyIdByResidentId.get(String(a.residentId)) : undefined,
    }));

    return { accounts: accountsWithFamilyId, residentCount, unaccountedCount };
  }

  async editAccount(tenantId: Types.ObjectId, accountId: string, dto: EditAccountDto) {
    const account = await this.accountModel.findOne({ _id: accountId, tenantId });
    if (!account) throw new NotFoundException('Không tìm thấy tài khoản.');
    if (account.role === 'admin' && dto.role !== 'admin') {
      throw new BadRequestException('Không thể đổi vai trò của tài khoản Admin.');
    }

    if (dto.role === 'association-officer') {
      if (!dto.assoc) throw new BadRequestException('Vui lòng chọn hội mà tài khoản này sẽ phụ trách.');
      const assocExists = await this.associationQuotaModel.exists({ tenantId, name: dto.assoc });
      if (!assocExists) throw new BadRequestException('Hội được chọn không tồn tại.');
    }

    const oldRole = account.role;
    const oldPosition = account.position;
    account.role = dto.role as Account['role'];
    account.position = dto.position ?? '';
    if (dto.role === 'association-officer') account.assoc = dto.assoc;
    else account.assoc = undefined;
    await account.save();

    const changes: string[] = [];
    if (dto.role !== oldRole) changes.push(`vai trò (phân quyền) từ "${oldRole}" thành "${dto.role}"${account.assoc ? ` (phụ trách ${account.assoc})` : ''}`);
    if (account.position !== oldPosition) changes.push(`chức vụ thành "${account.position || 'không có'}"`);
    await this.auditService.log(
      tenantId,
      'Cập nhật tài khoản',
      `Admin cập nhật tài khoản ${account.name}${changes.length ? ': ' + changes.join('; ') : ''}.`,
      'Admin',
    );
    return account;
  }

  async resetPassword(tenantId: Types.ObjectId, accountId: string) {
    const account = await this.accountModel.findOne({ _id: accountId, tenantId });
    if (!account) throw new NotFoundException('Không tìm thấy tài khoản.');
    account.passwordHash = await this.defaultPasswordHash(tenantId);
    await account.save();
    await this.auditService.log(
      tenantId,
      'Reset Mật khẩu',
      `Admin khôi phục mật khẩu mặc định cho tài khoản ${account.name}.`,
      'Admin',
    );
    return { id: account._id, name: account.name };
  }

  async toggleStatus(tenantId: Types.ObjectId, accountId: string, status: 'active' | 'locked') {
    const account = await this.accountModel.findOne({ _id: accountId, tenantId });
    if (!account) throw new NotFoundException('Không tìm thấy tài khoản.');
    if (account.role === 'admin') throw new BadRequestException('Không thể khóa tài khoản Admin.');
    account.status = status;
    await account.save();
    await this.auditService.log(
      tenantId,
      'Đổi trạng thái tài khoản',
      `Thay đổi trạng thái hoạt động tài khoản ${account.name} thành: ${status === 'active' ? 'Hoạt động' : 'Đã khóa'}.`,
      'Admin',
    );
    return account;
  }

  // Admin thêm trực tiếp 1 nhân khẩu mới (không qua NewMemberRequest chờ
  // duyệt) — tự động cấp tài khoản đăng nhập nếu có CCCD hợp lệ, mật khẩu
  // mặc định = slug tenant, khớp createResidentAccount() ở luồng duyệt yêu
  // cầu để hành vi nhất quán giữa 2 luồng tạo cư dân.
  // Chủ hộ mới -> tự sinh mã hộ mới (hộ chưa từng tồn tại); thành viên
  // (không phải chủ hộ) -> bắt buộc nhập đúng mã hộ đã có sẵn, tránh gõ
  // nhầm tạo ra 1 hộ rỗng không ai làm chủ.
  private async generateFamilyId(tenantId: Types.ObjectId): Promise<string> {
    let familyId: string;
    do {
      familyId = `FAM-${Math.floor(100 + Math.random() * 900)}`;
      // eslint-disable-next-line no-await-in-loop
    } while (await this.residentModel.exists({ tenantId, familyId }));
    return familyId;
  }

  // Tạo 1 bản ghi Resident + tự cấp tài khoản đăng nhập nếu có CCCD hợp lệ
  // — dùng chung cho createResident() (1 người) và bulkImportResidents()
  // (nhiều người từ file Excel).
  private async createResidentRecord(
    tenantId: Types.ObjectId,
    familyId: string,
    data: {
      name: string;
      dob: string;
      gender?: string;
      cccd?: string;
      phone?: string;
      relation?: string;
      isHouseholder?: boolean;
      permanentAddress?: string;
      temporaryAddress?: string;
      group?: string;
      fatherName?: string;
      motherName?: string;
    },
  ) {
    const resident = await this.residentModel.create({
      tenantId,
      name: data.name,
      dob: data.dob,
      gender: data.gender || 'unknown',
      cccd: data.cccd || '',
      phone: data.phone || '',
      relation: data.isHouseholder ? 'Chủ hộ' : data.relation,
      isHouseholder: data.isHouseholder || false,
      familyId,
      permanentAddress: data.permanentAddress || '',
      temporaryAddress: data.temporaryAddress || '',
      group: data.group || 'Khác',
      fatherName: data.fatherName || '',
      motherName: data.motherName || '',
    });

    let accountCreated = false;
    if (resident.cccd) {
      const existing = await this.accountModel.findOne({ tenantId, username: resident.cccd });
      if (!existing) {
        const passwordHash = await this.defaultPasswordHash(tenantId);
        await this.accountModel.create({
          tenantId,
          residentId: resident._id,
          username: resident.cccd,
          passwordHash,
          name: resident.name,
          role: 'resident',
          position: '',
          status: 'active',
        });
        accountCreated = true;
      }
    }

    return { resident, accountCreated };
  }

  async createResident(tenantId: Types.ObjectId, dto: CreateResidentDto) {
    let familyId: string;
    if (dto.isHouseholder) {
      familyId = await this.generateFamilyId(tenantId);
    } else {
      if (!dto.familyId) {
        throw new BadRequestException('Vui lòng nhập Mã hộ đã tồn tại cho thành viên không phải chủ hộ.');
      }
      const exists = await this.residentModel.exists({ tenantId, familyId: dto.familyId });
      if (!exists) {
        throw new BadRequestException(`Không tìm thấy hộ với mã "${dto.familyId}". Thành viên phải thuộc 1 hộ đã có sẵn.`);
      }
      familyId = dto.familyId;
    }

    const { resident, accountCreated } = await this.createResidentRecord(tenantId, familyId, dto);

    await this.auditService.log(
      tenantId,
      'Thêm cư dân mới',
      `Admin thêm nhân khẩu mới "${resident.name}" (${resident.relation}) vào hộ ${resident.familyId}.${
        accountCreated ? ' Đã tự động cấp tài khoản đăng nhập.' : ''
      }`,
      'Admin',
    );

    return { resident, accountCreated };
  }

  async getResidentInfo(tenantId: Types.ObjectId, residentId: string) {
    const resident = await this.residentModel.findOne({ _id: residentId, tenantId }).lean();
    if (!resident) throw new NotFoundException('Không tìm thấy nhân khẩu này.');
    return resident;
  }

  // Admin sửa trực tiếp thông tin nhân khẩu (khác Cư dân/Cán bộ Hội phải
  // gửi MemberEditRequest chờ duyệt) — cùng quyền với Trưởng thôn ở mục
  // "Quản lý Toàn Thôn".
  async editResidentInfo(tenantId: Types.ObjectId, residentId: string, dto: EditResidentInfoDto) {
    const resident = await this.residentModel.findOne({ _id: residentId, tenantId });
    if (!resident) throw new NotFoundException('Không tìm thấy nhân khẩu này.');

    Object.assign(resident, dto, {
      relation: dto.isHouseholder ? 'Chủ hộ' : dto.relation,
    });
    await resident.save();

    await this.auditService.log(
      tenantId,
      'Sửa thông tin cư dân',
      `Admin cập nhật thông tin nhân khẩu "${resident.name}".`,
      'Admin',
    );
    return resident;
  }

  // Admin xóa thẳng nhân khẩu + tài khoản liên quan, không cần qua bước
  // DeleteRequest chờ tự duyệt lại (Admin đã là cấp phê duyệt cao nhất).
  async deleteResident(tenantId: Types.ObjectId, residentId: string) {
    const resident = await this.residentModel.findOneAndDelete({ _id: residentId, tenantId });
    if (!resident) throw new NotFoundException('Không tìm thấy nhân khẩu này.');
    await this.accountModel.deleteOne({ tenantId, residentId: resident._id });

    await this.auditService.log(
      tenantId,
      'Xóa cư dân',
      `Admin xóa nhân khẩu "${resident.name}" khỏi hệ thống dữ liệu.`,
      'Admin',
    );
    return { deleted: true };
  }

  // Nhập cư dân hàng loạt từ file Excel (tab "Quản lý tài khoản"). Hộ được
  // nhóm qua groupKey (khớp cột "SỐ HỘ TỊCH" trong file mẫu sẵn có của
  // thôn) — mọi dòng cùng groupKey thuộc chung 1 hộ, hệ thống tự sinh mã
  // hộ thật FAM-xxx cho mỗi nhóm, không lưu lại giá trị groupKey gốc.
  async bulkImportResidents(tenantId: Types.ObjectId, rows: BulkResidentRowDto[]) {
    const CCCD_RE = /^\d{12}$/;
    const PHONE_RE = /^\d{10}$/;

    type Entry = { row: BulkResidentRowDto; index: number };
    const results: { row: number; name?: string; status: 'created' | 'skipped' | 'failed'; reason?: string }[] = [];
    const groups = new Map<string, Entry[]>();

    rows.forEach((row, index) => {
      const key = row.groupKey?.trim();
      if (!key) {
        results.push({ row: index + 1, name: row.name, status: 'failed', reason: 'Thiếu Số Hộ Tịch để xác định thuộc hộ nào.' });
        return;
      }
      const list = groups.get(key) || [];
      list.push({ row, index });
      groups.set(key, list);
    });

    for (const entries of groups.values()) {
      // Validate từng dòng trong hộ trước — 1 dòng lỗi không kéo cả hộ.
      const valid: Entry[] = [];
      // Nếu dòng chủ hộ bị bỏ qua vì CCCD đã tồn tại, dùng luôn mã hộ của
      // cư dân đã có sẵn đó cho các thành viên còn lại — coi như đang bổ
      // sung thêm người vào hộ cũ, thay vì tạo 1 hộ rỗng không ai làm chủ.
      let familyIdFromExistingHead: string | undefined;

      for (const { row, index } of entries) {
        if (!row.name?.trim()) {
          results.push({ row: index + 1, name: row.name, status: 'failed', reason: 'Thiếu Họ và tên.' });
          continue;
        }
        if (!row.dob?.trim()) {
          results.push({ row: index + 1, name: row.name, status: 'failed', reason: 'Thiếu Ngày sinh.' });
          continue;
        }
        if (row.cccd && !CCCD_RE.test(row.cccd)) {
          results.push({ row: index + 1, name: row.name, status: 'failed', reason: 'Số Căn Cước phải gồm đúng 12 chữ số.' });
          continue;
        }
        if (row.phone && !PHONE_RE.test(row.phone)) {
          results.push({ row: index + 1, name: row.name, status: 'failed', reason: 'Số điện thoại phải gồm đúng 10 chữ số.' });
          continue;
        }

        if (row.cccd) {
          const existing = await this.residentModel.findOne({ tenantId, cccd: row.cccd }).lean();
          if (existing) {
            if (row.isHouseholder) familyIdFromExistingHead = existing.familyId;
            results.push({
              row: index + 1,
              name: row.name,
              status: 'skipped',
              reason: `Đã tồn tại cư dân với Số Căn Cước "${row.cccd}" trong hệ thống, bỏ qua dòng này.`,
            });
            continue;
          }
        }

        valid.push({ row, index });
      }

      const heads = valid.filter(({ row }) => row.isHouseholder);
      let familyId: string;
      if (heads.length === 1) {
        familyId = await this.generateFamilyId(tenantId);
      } else if (heads.length === 0 && familyIdFromExistingHead) {
        familyId = familyIdFromExistingHead;
      } else if (heads.length === 0) {
        for (const { row, index } of valid) {
          results.push({
            row: index + 1,
            name: row.name,
            status: 'failed',
            reason: 'Hộ này không có dòng nào được đánh dấu là chủ hộ.',
          });
        }
        continue;
      } else {
        for (const { row, index } of valid) {
          results.push({
            row: index + 1,
            name: row.name,
            status: 'failed',
            reason: 'Hộ này có nhiều hơn 1 chủ hộ (cùng Số Hộ Tịch nhưng nhiều dòng đánh dấu chủ hộ).',
          });
        }
        continue;
      }

      for (const { row, index } of valid) {
        await this.createResidentRecord(tenantId, familyId, {
          ...row,
          name: row.name as string,
          dob: row.dob as string,
          relation: row.isHouseholder ? 'Chủ hộ' : row.relation || 'Thành viên',
        });
        results.push({ row: index + 1, name: row.name, status: 'created' });
      }
    }

    const created = results.filter((r) => r.status === 'created').length;
    const skipped = results.filter((r) => r.status === 'skipped').length;
    const failed = results.filter((r) => r.status === 'failed').length;

    await this.auditService.log(
      tenantId,
      'Nhập cư dân hàng loạt',
      `Admin nhập cư dân từ file Excel: tạo mới ${created} nhân khẩu, bỏ qua ${skipped} (CCCD đã tồn tại), ${failed} dòng lỗi.`,
      'Admin',
    );

    return { created, skipped, failed, results };
  }
}
