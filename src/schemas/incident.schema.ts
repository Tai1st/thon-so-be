import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaTypes, Types } from 'mongoose';

@Schema()
export class IncidentReport {
  @Prop({ type: SchemaTypes.ObjectId, ref: 'Tenant', required: true, index: true })
  tenantId: Types.ObjectId;

  @Prop({ required: true })
  familyId: string;

  @Prop({ required: true })
  reporterName: string;

  @Prop({ required: true })
  content: string;

  @Prop({ default: '' })
  locationText: string;

  @Prop({ type: Number, default: null })
  lat: number | null;

  @Prop({ type: Number, default: null })
  lng: number | null;

  @Prop({ enum: ['Mới', 'Đã tiếp nhận', 'Đã xử lý'], default: 'Mới' })
  status: string;

  @Prop({ required: true })
  time: string;
}
export type IncidentReportDocument = IncidentReport & Document;
export const IncidentReportSchema = SchemaFactory.createForClass(IncidentReport);

@Schema()
export class ResidenceRegistration {
  @Prop({ type: SchemaTypes.ObjectId, ref: 'Tenant', required: true, index: true })
  tenantId: Types.ObjectId;

  @Prop({ required: true })
  familyId: string;

  @Prop({ required: true })
  hostName: string;

  @Prop({ required: true })
  guestName: string;

  @Prop({ default: '' })
  guestCccd: string;

  @Prop({ required: true })
  relationship: string;

  @Prop({ default: '' })
  reason: string;

  @Prop({ required: true })
  fromDate: string;

  @Prop({ required: true })
  toDate: string;

  @Prop({ enum: ['Chờ duyệt', 'Đã duyệt', 'Từ chối'], default: 'Chờ duyệt' })
  status: string;

  @Prop({ required: true })
  submittedBy: string;

  @Prop({ required: true })
  time: string;
}
export type ResidenceRegistrationDocument = ResidenceRegistration & Document;
export const ResidenceRegistrationSchema = SchemaFactory.createForClass(
  ResidenceRegistration,
);

// Biên bản sự việc — hồ sơ chính thức Tổ ANTT lập sau khi xử lý 1 vụ việc,
// tùy chọn liên kết ngược lại tin báo đã gây ra nó. Chỉ Tổ ANTT xem được
// (không hiện với cư dân), khác IncidentReport ở trên do cư dân gửi lên.
@Schema()
export class IncidentMinutes {
  @Prop({ type: SchemaTypes.ObjectId, ref: 'Tenant', required: true, index: true })
  tenantId: Types.ObjectId;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'IncidentReport', default: null })
  relatedReportId: Types.ObjectId | null;

  @Prop({ required: true })
  title: string;

  @Prop({ default: '' })
  location: string;

  @Prop({ default: '' })
  involvedPeople: string;

  @Prop({ required: true })
  content: string;

  @Prop({ required: true })
  createdBy: string;

  @Prop({ required: true })
  time: string;
}
export type IncidentMinutesDocument = IncidentMinutes & Document;
export const IncidentMinutesSchema = SchemaFactory.createForClass(IncidentMinutes);
