import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaTypes, Types } from 'mongoose';
import { GeoPolygon } from './tenant.schema';

// 1 lần nhập KMZ = 1 Xã, chứa danh sách thôn (mỗi Placemark polygon trong
// KMZ là 1 thôn) — độc lập hoàn toàn với các Xã khác (mục superadmin quản
// lý nhiều xã, mỗi xã 1 bộ dữ liệu bản đồ riêng, không ràng buộc domain).
@Schema({ _id: false })
export class CommuneVillage {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  slugSuggestion: string;

  @Prop({ required: true })
  lat: number;

  @Prop({ required: true })
  lng: number;

  @Prop({ type: GeoPolygon, required: true })
  boundary: GeoPolygon;

  @Prop({ default: false })
  claimed: boolean;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'Tenant' })
  tenantId?: Types.ObjectId;
}
export const CommuneVillageSchema = SchemaFactory.createForClass(CommuneVillage);

@Schema({ timestamps: { createdAt: true, updatedAt: false } })
export class Commune {
  @Prop({ required: true })
  name: string;

  @Prop({ type: [CommuneVillageSchema], default: [] })
  villages: CommuneVillage[];

  // Không có @Prop() — Mongoose tự thêm field này lúc runtime nhờ
  // `timestamps: { createdAt: true }` ở trên, khai báo ở đây chỉ để TS biết type.
  createdAt?: Date;
}

export type CommuneDocument = Commune & Document;
export const CommuneSchema = SchemaFactory.createForClass(Commune);
