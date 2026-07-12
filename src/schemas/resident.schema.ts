import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaTypes, Types } from 'mongoose';

@Schema()
export class Resident {
  @Prop({ type: SchemaTypes.ObjectId, ref: 'Tenant', required: true, index: true })
  tenantId: Types.ObjectId;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  dob: string; // "DD/MM/YYYY" — giữ đúng format hiển thị của prototype

  @Prop({ enum: ['male', 'female', 'unknown'], default: 'unknown' })
  gender: string;

  @Prop({ default: '' })
  cccd: string;

  @Prop({ default: '' })
  phone: string;

  @Prop({ required: true })
  relation: string;

  @Prop({ default: false })
  isHouseholder: boolean;

  @Prop({ required: true, index: true })
  familyId: string;

  @Prop({ default: '' })
  headName: string;

  @Prop({ default: '' })
  permanentAddress: string;

  @Prop({ default: '' })
  temporaryAddress: string;

  @Prop({ default: 'Khác' })
  group: string;

  @Prop({ default: '' })
  fatherName: string;

  @Prop({ default: '' })
  motherName: string;

  // Tên hội/đoàn thể nhân khẩu này tham gia (vd "Hội Nông dân"), khớp
  // AssociationQuota.name — "None" nghĩa là không tham gia hội nào, khớp
  // đúng giá trị mặc định của bản mẫu (mục "Cán bộ Hội" tài liệu thiết kế).
  @Prop({ default: 'None' })
  association: string;
}

export type ResidentDocument = Resident & Document;
export const ResidentSchema = SchemaFactory.createForClass(Resident);
ResidentSchema.index({ tenantId: 1, familyId: 1 });
