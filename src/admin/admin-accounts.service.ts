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

  async list(tenantId: Types.ObjectId) {
    const [accounts, residentCount] = await Promise.all([
      this.accountModel.find({ tenantId }).sort({ name: 1 }).lean(),
      this.residentModel.countDocuments({ tenantId }),
    ]);
    const accountedNames = new Set(accounts.map((a) => a.name));
    const unaccountedCount = await this.residentModel.countDocuments({
      tenantId,
      name: { $nin: [...accountedNames] },
    });
    return { accounts, residentCount, unaccountedCount };
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

    const resident = await this.residentModel.create({
      tenantId,
      name: dto.name,
      dob: dto.dob,
      gender: dto.gender || 'unknown',
      cccd: dto.cccd || '',
      phone: dto.phone || '',
      relation: dto.isHouseholder ? 'Chủ hộ' : dto.relation,
      isHouseholder: dto.isHouseholder || false,
      familyId,
      permanentAddress: dto.permanentAddress || '',
      temporaryAddress: dto.temporaryAddress || '',
      group: dto.group || 'Khác',
      fatherName: dto.fatherName || '',
      motherName: dto.motherName || '',
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

  // Cấp tài khoản "resident" cho mọi nhân khẩu chưa có, khớp
  // syncAllResidentAccounts() bản mẫu — bỏ qua nhân khẩu chưa có CCCD hợp lệ.
  async syncAllResidentAccounts(tenantId: Types.ObjectId) {
    const residents = await this.residentModel.find({ tenantId }).lean();
    const existingNames = new Set((await this.accountModel.find({ tenantId }).lean()).map((a) => a.name));

    let created = 0;
    let skipped = 0;
    for (const resident of residents) {
      if (existingNames.has(resident.name)) continue;
      if (!resident.cccd) {
        skipped++;
        continue;
      }
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
      created++;
    }

    await this.auditService.log(
      tenantId,
      'Đồng bộ tài khoản',
      `Admin đồng bộ tài khoản toàn bộ cư dân: tạo mới ${created} tài khoản, bỏ qua ${skipped} cư dân chưa có Căn Cước hợp lệ.`,
      'Admin',
    );
    return { created, skipped };
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
}
