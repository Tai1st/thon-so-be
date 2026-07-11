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

// Trụ sở cơ quan cấp xã — KHÔNG có tenantId, hiển thị chung cho mọi tenant
// cùng 1 xã trên bản đồ danh mục (mục 6 tài liệu thiết kế).
@Schema()
export class AdministrativeUnit {
  @Prop({ required: true })
  name: string;

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
