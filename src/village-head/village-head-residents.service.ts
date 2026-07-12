import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Account, AccountDocument } from '../schemas/account.schema';
import { Resident, ResidentDocument } from '../schemas/resident.schema';
import { Household, HouseholdDocument } from '../schemas/household.schema';
import { DeleteRequest, DeleteRequestDocument } from '../schemas/requests.schema';
import { EditResidentDto } from './dto/edit-resident.dto';
import { CreateDeleteRequestDto } from './dto/create-delete-request.dto';
import { UpdateGpsDto } from './dto/update-gps.dto';

function nowDisplay(): string {
  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

@Injectable()
export class VillageHeadResidentsService {
  constructor(
    @InjectModel(Account.name) private accountModel: Model<AccountDocument>,
    @InjectModel(Resident.name) private residentModel: Model<ResidentDocument>,
    @InjectModel(Household.name) private householdModel: Model<HouseholdDocument>,
    @InjectModel(DeleteRequest.name) private deleteRequestModel: Model<DeleteRequestDocument>,
  ) {}

  // Danh bạ cư dân toàn thôn — lọc theo tên/CCCD/SĐT/mã hộ (khớp
  // filterTruongThonResidents() bản mẫu), kèm cờ đang chờ duyệt xóa để FE
  // vô hiệu hóa nút "Yêu cầu xóa" trùng lặp.
  async listResidents(
    tenantId: Types.ObjectId,
    query?: string,
  ): Promise<{ total: number; residents: (Resident & { _id: Types.ObjectId; hasPendingDeleteRequest: boolean })[] }> {
    const residents = await this.residentModel
      .find({ tenantId })
      .sort({ isHouseholder: -1, name: 1 })
      .lean();

    const q = (query || '').trim().toLowerCase();
    const filtered = !q
      ? residents
      : residents.filter((r) =>
          [r.name, r.cccd, r.phone, r.familyId, r.group].some((field) =>
            (field || '').toLowerCase().includes(q),
          ),
        );

    const pendingDeleteResidentIds = new Set(
      (
        await this.deleteRequestModel.find({ tenantId, status: 'pending' }).lean()
      ).map((r) => r.residentId),
    );

    return {
      total: residents.length,
      residents: filtered.map((r) => ({
        ...r,
        hasPendingDeleteRequest: pendingDeleteResidentIds.has(String(r._id)),
      })),
    };
  }

  async editResident(tenantId: Types.ObjectId, residentId: string, dto: EditResidentDto) {
    const resident = await this.residentModel.findOne({ _id: residentId, tenantId });
    if (!resident) throw new NotFoundException('Không tìm thấy nhân khẩu này.');

    Object.assign(resident, dto);
    await resident.save();
    return resident;
  }

  async createDeleteRequest(
    tenantId: Types.ObjectId,
    accountId: string,
    dto: CreateDeleteRequestDto,
  ) {
    const account = await this.accountModel.findOne({ _id: accountId, tenantId });
    if (!account) throw new NotFoundException('Không tìm thấy tài khoản.');

    const resident = await this.residentModel.findOne({ _id: dto.residentId, tenantId });
    if (!resident) throw new NotFoundException('Không tìm thấy nhân khẩu này.');

    const existingPending = await this.deleteRequestModel.findOne({
      tenantId,
      residentId: dto.residentId,
      status: 'pending',
    });
    if (existingPending) {
      throw new ConflictException('Nhân khẩu này đã có yêu cầu xóa đang chờ duyệt.');
    }

    return this.deleteRequestModel.create({
      tenantId,
      residentId: dto.residentId,
      residentName: resident.name,
      reason: dto.reason,
      submittedBy: account.name,
      status: 'pending',
      time: nowDisplay(),
    });
  }

  // Xem/cập nhật vị trí GPS của MỘT HỘ BẤT KỲ trong thôn (Trưởng thôn đi
  // thực địa) — khác GET/PATCH /households/me chỉ thao tác trên hộ của
  // chính người đăng nhập.
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
}
