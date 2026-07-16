import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaTypes, Types } from 'mongoose';

// GeoJSON Polygon — ranh giới thật của thôn, dùng cho bản đồ danh mục (mục 4.1 tài liệu thiết kế)
@Schema({ _id: false })
export class GeoPolygon {
  @Prop({ type: String, enum: ['Polygon'], default: 'Polygon' })
  type: string;

  @Prop({ type: [[[Number]]], required: true })
  coordinates: number[][][];
}

@Schema({ timestamps: { createdAt: true, updatedAt: false } })
export class Tenant {
  @Prop({ required: true, unique: true })
  slug: string;

  @Prop({ required: true })
  name: string;

  // Logo hiển thị ở trang chủ công khai + header mọi cổng dashboard (Admin
  // sửa qua "Quản lý Trang chủ" > Thương hiệu). Rỗng thì FE dùng ảnh mặc
  // định /logo.png trong thư mục public.
  @Prop({ default: '' })
  logoUrl?: string;

  @Prop()
  lat?: number;

  @Prop()
  lng?: number;

  @Prop({ type: GeoPolygon })
  boundary?: GeoPolygon;

  @Prop({ type: Date, default: null })
  archivedAt: Date | null;

  // Gán tenant vào đúng thôn của 1 Xã đã nhập KMZ (tùy chọn — tenant tạo
  // thủ công hoặc tạo trước khi có Commune vẫn hợp lệ khi chưa gán). Gán
  // qua PATCH /superadmin/tenants/:id/assign-village, xem
  // SuperAdminTenantsService.assignVillage().
  @Prop({ type: SchemaTypes.ObjectId, ref: 'Commune', default: null })
  communeId?: Types.ObjectId | null;

  @Prop({ type: Number, default: null })
  communeVillageIndex?: number | null;
}

export type TenantDocument = Tenant & Document;
export const TenantSchema = SchemaFactory.createForClass(Tenant);

// Danh mục cố định các loại địa danh hiển thị trên bản đồ danh mục — dùng
// chung giữa BE (validate DTO) và FE (dropdown chọn loại, icon/màu marker).
export const ADMINISTRATIVE_UNIT_CATEGORIES = [
  'dang-uy',
  'ubnd',
  'mttq',
  'cong-an',
  'truong-hoc',
  'y-te',
  'quan-an',
  'tap-hoa',
  'khac',
] as const;
export type AdministrativeUnitCategory = (typeof ADMINISTRATIVE_UNIT_CATEGORIES)[number];

// Địa danh trên bản đồ danh mục 1 xã — trụ sở cơ quan nhà nước (Đảng ủy/
// UBND/MTTQ/Công an) VÀ các địa điểm khác (quán ăn, tạp hóa, trường học,
// y tế...), phân biệt bằng `category`. KHÔNG có tenantId (không thuộc
// riêng 1 thôn nào) nhưng có `communeId` — gán theo TỪNG XÃ, vì 1 hệ thống
// có thể quản lý nhiều xã khác nhau qua nhiều Commune (mục 6 tài liệu
// thiết kế). `communeId` để trống (null) = chưa gán xã nào.
@Schema()
export class AdministrativeUnit {
  @Prop({ required: true })
  name: string;

  @Prop({ type: String, enum: ADMINISTRATIVE_UNIT_CATEGORIES, default: 'khac' })
  category: AdministrativeUnitCategory;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'Commune', default: null, index: true })
  communeId?: Types.ObjectId | null;

  @Prop()
  logoUrl?: string;

  @Prop({ required: true })
  lat: number;

  @Prop({ required: true })
  lng: number;

  @Prop()
  mapsUrl?: string;
}

export type AdministrativeUnitDocument = AdministrativeUnit & Document;
export const AdministrativeUnitSchema =
  SchemaFactory.createForClass(AdministrativeUnit);

@Schema()
export class SuperAdmin {
  @Prop({ required: true, unique: true })
  username: string;

  @Prop({ required: true })
  passwordHash: string;
}

export type SuperAdminDocument = SuperAdmin & Document;
export const SuperAdminSchema = SchemaFactory.createForClass(SuperAdmin);

// Re-exported here for convenience where a bare ObjectId type is needed.
export type TenantId = Types.ObjectId;
