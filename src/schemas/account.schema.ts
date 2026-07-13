import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaTypes, Types } from 'mongoose';

export type Role =
  | 'resident'
  | 'association-officer'
  | 'village-head'
  | 'security-team'
  | 'admin';

@Schema({ timestamps: { createdAt: false, updatedAt: true } })
export class Account {
  @Prop({ type: SchemaTypes.ObjectId, ref: 'Tenant', required: true, index: true })
  tenantId: Types.ObjectId;

  // Tham chiếu ID thật tới Resident (mục 6.2 tài liệu thiết kế) — thay cho
  // join fragile theo username/CCCD như bản prototype.
  @Prop({ type: SchemaTypes.ObjectId, ref: 'Resident' })
  residentId?: Types.ObjectId;

  @Prop({ required: true })
  username: string; // CCCD — chỉ dùng để đăng nhập, không dùng để join dữ liệu

  @Prop({ required: true })
  passwordHash: string;

  @Prop({ required: true })
  name: string;

  @Prop({
    required: true,
    enum: [
      'resident',
      'association-officer',
      'village-head',
      'security-team',
      'admin',
    ],
  })
  role: Role;

  @Prop({ default: '' })
  position: string;

  @Prop({ default: 'Chưa đăng nhập' })
  lastActive: string;

  @Prop({ enum: ['active', 'locked'], default: 'active' })
  status: 'active' | 'locked';

  @Prop()
  assoc?: string; // chỉ set khi role === 'association-officer'

  // Ảnh đại diện — chủ tài khoản tự đặt qua "auth/me" (mục Sửa hồ sơ),
  // không phải trường admin quản lý.
  @Prop({ default: '' })
  avatarUrl: string;
}

export type AccountDocument = Account & Document;
export const AccountSchema = SchemaFactory.createForClass(Account);
// username chỉ cần unique TRONG 1 tenant, không unique toàn hệ thống.
AccountSchema.index({ tenantId: 1, username: 1 }, { unique: true });
