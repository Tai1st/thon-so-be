import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AuditLog, AuditLogDocument } from '../schemas/audit-log.schema';

function nowDisplay(): string {
  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

// Nhật ký hệ thống — mọi thao tác Admin thực hiện (duyệt yêu cầu, sửa tài
// khoản, đổi phân quyền, sửa trang chủ) đều ghi 1 dòng, khớp addLog() bản mẫu.
@Injectable()
export class AdminAuditService {
  constructor(@InjectModel(AuditLog.name) private auditLogModel: Model<AuditLogDocument>) {}

  async log(tenantId: Types.ObjectId, action: string, detail: string, actor: string): Promise<void> {
    await this.auditLogModel.create({ tenantId, action, detail, actor, time: nowDisplay() });
  }

  async list(tenantId: Types.ObjectId, limit = 200) {
    return this.auditLogModel.find({ tenantId }).sort({ _id: -1 }).limit(limit).lean();
  }
}
