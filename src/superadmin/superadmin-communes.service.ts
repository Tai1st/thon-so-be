import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Commune, CommuneDocument } from '../schemas/commune.schema';
import { parseKmzVillages } from './kmz.util';
import { SuperAdminTenantsService } from './superadmin-tenants.service';
import { CreateTenantFromVillageDto } from './dto/create-tenant-from-village.dto';

@Injectable()
export class SuperAdminCommunesService {
  constructor(
    @InjectModel(Commune.name) private communeModel: Model<CommuneDocument>,
    private tenantsService: SuperAdminTenantsService,
  ) {}

  async importKmz(name: string, fileBuffer: Buffer) {
    let villages;
    try {
      villages = parseKmzVillages(fileBuffer);
    } catch (err) {
      throw new BadRequestException(err instanceof Error ? err.message : 'Không đọc được file KMZ/KML.');
    }
    return this.communeModel.create({ name, villages });
  }

  async findAll() {
    const communes = await this.communeModel.find().sort({ createdAt: -1 }).lean();
    return communes.map((c) => ({
      _id: c._id,
      name: c.name,
      createdAt: c.createdAt,
      totalVillages: c.villages.length,
      claimedVillages: c.villages.filter((v) => v.claimed).length,
    }));
  }

  async findOne(id: string) {
    const commune = await this.communeModel.findById(id).lean();
    if (!commune) throw new NotFoundException('Không tìm thấy xã này.');
    return commune;
  }

  async createTenantFromVillage(communeId: string, villageIndex: number, dto: CreateTenantFromVillageDto) {
    const commune = await this.communeModel.findById(communeId);
    if (!commune) throw new NotFoundException('Không tìm thấy xã này.');

    const village = commune.villages[villageIndex];
    if (!village) throw new NotFoundException('Không tìm thấy thôn này trong xã.');
    if (village.claimed) throw new ConflictException('Thôn này đã được tạo tenant rồi.');

    const result = await this.tenantsService.create({
      slug: dto.slug,
      name: dto.name || village.name,
      adminUsername: dto.adminUsername,
      adminPassword: dto.adminPassword,
      adminName: dto.adminName,
      lat: village.lat,
      lng: village.lng,
      boundary: village.boundary,
    });

    village.claimed = true;
    village.tenantId = result.tenant._id;
    await commune.save();

    await this.tenantsService.linkVillage(String(result.tenant._id), communeId, villageIndex);

    return result;
  }

  // Xóa hẳn 1 Commune (bản đồ xã đã nhập KMZ) — xóa cascade MỌI tenant đã
  // tạo từ xã này (cùng toàn bộ dữ liệu của từng tenant), rồi mới xóa bản
  // ghi Commune. Không thể hoàn tác.
  async remove(id: string) {
    const commune = await this.communeModel.findById(id);
    if (!commune) throw new NotFoundException('Không tìm thấy xã này.');
    await this.tenantsService.removeTenantsByCommune(id);
    await this.communeModel.deleteOne({ _id: id });
    return { deleted: true };
  }
}
