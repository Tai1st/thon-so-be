import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Account, AccountDocument } from '../schemas/account.schema';
import { Resident, ResidentDocument } from '../schemas/resident.schema';
import { Household, HouseholdDocument } from '../schemas/household.schema';
import { UpdateGpsDto } from './dto/update-gps.dto';

const TITLE_RANK: Record<string, number> = { 'Tổ Trưởng': 0, 'Tổ Phó': 1 };

function toPhoneDisplay(phone: string): string {
  return phone ? phone.replace(/(\d{3,4})(\d{3})(\d{3,4})/, '$1.$2.$3') : '';
}

@Injectable()
export class SecurityTeamResidentsService {
  constructor(
    @InjectModel(Account.name) private accountModel: Model<AccountDocument>,
    @InjectModel(Resident.name) private residentModel: Model<ResidentDocument>,
    @InjectModel(Household.name) private householdModel: Model<HouseholdDocument>,
  ) {}

  // Danh bạ cư dân toàn thôn — chỉ xem, không có quyền sửa/xóa (khác
  // Trưởng thôn), khớp renderAnttDanCu() bản mẫu.
  async listResidents(tenantId: Types.ObjectId, query?: string) {
    const residents = await this.residentModel.find({ tenantId }).sort({ isHouseholder: -1, name: 1 }).lean();
    const q = (query || '').trim().toLowerCase();
    if (!q) return { total: residents.length, residents };
    const filtered = residents.filter((r) =>
      [r.name, r.cccd, r.phone, r.familyId, r.group].some((field) => (field || '').toLowerCase().includes(q)),
    );
    return { total: residents.length, residents: filtered };
  }

  async getHouseholdLocation(tenantId: Types.ObjectId, familyId: string) {
    const head =
      (await this.residentModel.findOne({ tenantId, familyId, isHouseholder: true }).lean()) ||
      (await this.residentModel.findOne({ tenantId, familyId }).lean());
    if (!head) throw new NotFoundException('Không tìm thấy hộ gia đình này.');

    const household = await this.householdModel.findOne({ tenantId, familyId }).lean();
    return {
      familyId,
      headName: head.name,
      houseNumber: household?.houseNumber ?? '',
      gpsCoord: household?.gpsCoord ?? null,
    };
  }

  async updateHouseholdGps(tenantId: Types.ObjectId, familyId: string, dto: UpdateGpsDto) {
    const household = await this.householdModel.findOneAndUpdate(
      { tenantId, familyId },
      { $set: { gpsCoord: { lat: dto.lat, lng: dto.lng } } },
      { upsert: true, new: true },
    );
    return { familyId, gpsCoord: household.gpsCoord };
  }

  // Toàn bộ thành viên Tổ ANTT (không phải toàn thôn) — mọi Account role
  // 'security-team', kèm Căn Cước/ngày sinh/mã hộ/địa bàn từ Resident cùng
  // tên, sắp theo Tổ Trưởng → Tổ Phó → Tổ Viên, khớp renderAnttToDoi() bản mẫu.
  async listRoster(tenantId: Types.ObjectId) {
    const accounts = await this.accountModel.find({ tenantId, role: 'security-team', status: 'active' }).lean();
    const residents = await this.residentModel.find({ tenantId }).lean();
    const residentByName = new Map(residents.map((r) => [r.name, r]));

    return accounts
      .map((a) => {
        const res = residentByName.get(a.name);
        const title = (a.position && a.position.trim()) || 'Tổ Viên';
        const phone = res?.phone || '';
        return {
          name: a.name,
          title,
          phone,
          phoneDisplay: toPhoneDisplay(phone),
          cccd: res?.cccd || '',
          dob: res?.dob || '',
          familyId: res?.familyId || '',
          group: res?.group || '',
        };
      })
      .sort((a, b) => (TITLE_RANK[a.title] ?? 2) - (TITLE_RANK[b.title] ?? 2));
  }
}
