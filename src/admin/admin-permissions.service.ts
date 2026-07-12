import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { PermissionMatrix, PermissionMatrixDocument } from '../schemas/permission-matrix.schema';
import { UpdatePermissionDto } from './dto/update-permission.dto';
import { AdminAuditService } from './admin-audit.service';

const DEFAULT_ACCESS = { cccd: 'view', dob: 'view', villageFund: 'view', gpsAddress: 'view' };

@Injectable()
export class AdminPermissionsService {
  constructor(
    @InjectModel(PermissionMatrix.name) private permissionMatrixModel: Model<PermissionMatrixDocument>,
    private auditService: AdminAuditService,
  ) {}

  private async getOrCreate(tenantId: Types.ObjectId) {
    let doc = await this.permissionMatrixModel.findOne({ tenantId });
    if (!doc) {
      doc = await this.permissionMatrixModel.create({
        tenantId,
        resident: { ...DEFAULT_ACCESS },
        'association-officer': { ...DEFAULT_ACCESS },
        'village-head': { ...DEFAULT_ACCESS },
        'security-team': { ...DEFAULT_ACCESS },
        admin: { cccd: 'view-edit', dob: 'view-edit', villageFund: 'view-edit', gpsAddress: 'view-edit' },
      });
    }
    return doc;
  }

  async get(tenantId: Types.ObjectId) {
    return this.getOrCreate(tenantId);
  }

  async update(tenantId: Types.ObjectId, dto: UpdatePermissionDto) {
    const doc = await this.getOrCreate(tenantId);
    const asRecord = doc as unknown as Record<string, Record<string, string>>;
    asRecord[dto.role][dto.field] = dto.value;
    doc.markModified(dto.role);
    await doc.save();

    await this.auditService.log(
      tenantId,
      'Thay đổi phân quyền',
      `Thay đổi quyền truy cập trường ${dto.field} của nhóm ${dto.role} thành: ${dto.value}`,
      'Admin',
    );
    return doc;
  }
}
