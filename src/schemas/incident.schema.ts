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

  // Ảnh hiện trường cư dân đính kèm khi báo (tùy chọn) — URL trả về từ
  // POST /uploads, không lưu file trực tiếp trong DB.
  @Prop({ default: '' })
  imageUrl: string;
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

  // Ảnh 2 mặt Căn Cước của người lưu trú (tùy chọn) — giúp Tổ ANTT đối
  // chiếu khi duyệt, URL trả về từ POST /uploads.
  @Prop({ default: '' })
  guestCccdFrontUrl: string;

  @Prop({ default: '' })
  guestCccdBackUrl: string;

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

// Khớp thể thức mẫu "BIÊN BẢN TIẾP NHẬN VÀ XÁC MINH VỤ VIỆC" hành chính
// thật — mỗi sub-schema dưới đây ứng với đúng 1 mục La Mã trong mẫu giấy.

@Schema({ _id: false })
class AnttRepresentative {
  @Prop({ required: true })
  name: string;

  @Prop({ default: '' })
  position: string;
}

// I.2 — người trình báo, chỉ 1 người, đủ thông tin định danh (khác I.3 chỉ
// cần tên/địa chỉ/vai trò vì có thể là nhiều người phụ).
@Schema({ _id: false })
class Reporter {
  @Prop({ default: '' })
  name: string;

  @Prop({ default: '' })
  dob: string;

  @Prop({ default: '' })
  cccd: string;

  @Prop({ default: '' })
  address: string;

  @Prop({ default: '' })
  phone: string;
}

// I.3 — người liên quan khác (người làm chứng, cán bộ, Tổ ANTT...), có thể
// nhiều người, "role" là chữ tự do (không enum cứng) vì thực tế có nhiều
// vai trò khác nhau tùy vụ việc.
@Schema({ _id: false })
class OtherInvolvedPerson {
  @Prop({ required: true })
  name: string;

  @Prop({ default: '' })
  address: string;

  @Prop({ default: '' })
  role: string;
}

@Schema({ _id: false })
class Damage {
  @Prop({ default: '' })
  people: string;

  @Prop({ default: '' })
  property: string;

  @Prop({ default: '' })
  other: string;
}

@Schema({ _id: false })
class Opinions {
  @Prop({ default: '' })
  reporter: string;

  @Prop({ default: '' })
  involved: string;

  @Prop({ default: '' })
  witness: string;
}

// Biên bản sự việc — hồ sơ chính thức Tổ ANTT lập sau khi xử lý 1 vụ việc,
// tùy chọn liên kết ngược lại tin báo đã gây ra nó. Chỉ Tổ ANTT xem được
// (không hiện với cư dân), khác IncidentReport ở trên do cư dân gửi lên.
@Schema()
export class IncidentMinutes {
  @Prop({ type: SchemaTypes.ObjectId, ref: 'Tenant', required: true, index: true })
  tenantId: Types.ObjectId;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'IncidentReport', default: null })
  relatedReportId: Types.ObjectId | null;

  // "Số: ....../BB-......" — chữ tự do, Tổ ANTT tự đặt số theo quy ước
  // riêng của thôn, hệ thống không ép định dạng.
  @Prop({ default: '' })
  code: string;

  // Tiêu đề rút gọn hiển thị trong danh sách — không có trong mẫu giấy
  // gốc nhưng cần để phân biệt nhanh các biên bản trong bảng.
  @Prop({ required: true })
  title: string;

  // Thời gian/địa điểm LẬP biên bản (đoạn mở đầu "Hôm nay, vào hồi...")
  // — khác thời gian/địa điểm XẢY RA vụ việc ở mục II.
  @Prop({ default: '' })
  recordTime: string;

  @Prop({ default: '' })
  recordLocation: string;

  // I.1
  @Prop({ type: [AnttRepresentative], default: [] })
  anttRepresentatives: AnttRepresentative[];

  // I.2
  @Prop({ type: Reporter, default: {} })
  reporter: Reporter;

  // I.3
  @Prop({ type: [OtherInvolvedPerson], default: [] })
  involvedPeople: OtherInvolvedPerson[];

  // II
  @Prop({ default: '' })
  incidentTime: string;

  @Prop({ default: '' })
  incidentLocation: string;

  @Prop({ type: [String], default: [] })
  incidentTypes: string[];

  @Prop({ default: '' })
  incidentTypeOther: string;

  // III
  @Prop({ required: true })
  content: string;

  // IV
  @Prop({ type: Damage, default: {} })
  damage: Damage;

  // V
  @Prop({ default: '' })
  verificationResult: string;

  @Prop({ default: '' })
  verificationNote: string;

  // VI
  @Prop({ type: Opinions, default: {} })
  opinions: Opinions;

  // VII
  @Prop({ type: [String], default: [] })
  recommendations: string[];

  @Prop({ default: '' })
  recommendationOther: string;

  // VIII — số bản biên bản được lập (để in)
  @Prop({ default: 2 })
  copies: number;

  // Ảnh hiện trường/tang chứng — chỉ hiện trên web, KHÔNG in vào bản in
  // chính thức (theo đúng thể thức văn bản hành chính giấy).
  @Prop({ type: [String], default: [] })
  imageUrls: string[];

  @Prop({ required: true })
  createdBy: string;

  @Prop({ required: true })
  time: string;
}
export type IncidentMinutesDocument = IncidentMinutes & Document;
export const IncidentMinutesSchema = SchemaFactory.createForClass(IncidentMinutes);
