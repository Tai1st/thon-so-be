import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AdministrativeUnit, AdministrativeUnitDocument } from '../schemas/tenant.schema';
import { CreateAdministrativeUnitDto, UpdateAdministrativeUnitDto } from './dto/administrative-unit.dto';

@Injectable()
export class SuperAdminAdministrativeUnitsService {
  constructor(
    @InjectModel(AdministrativeUnit.name) private administrativeUnitModel: Model<AdministrativeUnitDocument>,
  ) {}

  async findAll(communeId?: string) {
    const filter = communeId ? { communeId } : {};
    return this.administrativeUnitModel.find(filter).sort({ name: 1 }).lean();
  }

  // Dùng khi 1 Commune bị xóa hẳn — xóa luôn mọi địa danh đã gán vào xã đó
  // (không còn xã nào để thuộc về nữa).
  async removeByCommune(communeId: string) {
    await this.administrativeUnitModel.deleteMany({ communeId });
  }

  async create(dto: CreateAdministrativeUnitDto) {
    return this.administrativeUnitModel.create(dto);
  }

  async update(id: string, dto: UpdateAdministrativeUnitDto) {
    const unit = await this.administrativeUnitModel.findByIdAndUpdate(id, { $set: dto }, { new: true });
    if (!unit) throw new NotFoundException('Không tìm thấy cơ quan này.');
    return unit;
  }

  async remove(id: string) {
    const unit = await this.administrativeUnitModel.findByIdAndDelete(id);
    if (!unit) throw new NotFoundException('Không tìm thấy cơ quan này.');
    return { deleted: true };
  }
}
