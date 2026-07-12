import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaTypes, Types } from 'mongoose';

@Schema({ _id: false })
export class GpsCoord {
  @Prop({ required: true })
  lat: number;

  @Prop({ required: true })
  lng: number;
}
export const GpsCoordSchema = SchemaFactory.createForClass(GpsCoord);

@Schema({ _id: false })
export class FundObligation {
  @Prop({ required: true })
  id: string;

  @Prop({ required: true })
  name: string;

  @Prop({ default: '' })
  memo: string;

  @Prop({ required: true })
  period: string;

  @Prop({ required: true })
  amount: number;

  @Prop({ enum: ['Đã đóng', 'Chưa đóng', 'Chờ duyệt'], default: 'Chưa đóng' })
  status: string;

  @Prop({ default: '' })
  date: string;
}
export const FundObligationSchema = SchemaFactory.createForClass(FundObligation);

@Schema()
export class Household {
  @Prop({ type: SchemaTypes.ObjectId, ref: 'Tenant', required: true, index: true })
  tenantId: Types.ObjectId;

  @Prop({ required: true })
  familyId: string;

  @Prop({ type: GpsCoordSchema })
  gpsCoord?: GpsCoord;

  @Prop({ default: '' })
  houseNumber: string;

  @Prop({ type: [FundObligationSchema], default: [] })
  fundObligations: FundObligation[];
}

export type HouseholdDocument = Household & Document;
export const HouseholdSchema = SchemaFactory.createForClass(Household);
HouseholdSchema.index({ tenantId: 1, familyId: 1 }, { unique: true });

// Quỹ thôn công khai (Thu/Chi toàn thôn) — 1 doc/tenant, độc lập với
// fundObligations theo từng hộ ở trên. `id`/`date` phục vụ Sửa/Xóa giao
// dịch nhập sai qua API.
@Schema({ _id: false })
export class VillageFundEntry {
  @Prop() id?: string;

  @Prop({ required: true })
  household: string;

  @Prop({ required: true })
  amount: number;

  @Prop() date?: string;
}
@Schema({ _id: false })
export class VillageFundExpense {
  @Prop() id?: string;

  @Prop({ required: true })
  desc: string;

  @Prop({ required: true })
  amount: number;

  @Prop() date?: string;
}
@Schema({ _id: false })
export class BankInfo {
  @Prop({ default: '' })
  bankName: string;

  @Prop({ default: '' })
  accountNumber: string;

  @Prop({ default: '' })
  accountHolder: string;
}

// Danh mục khoản thu quỹ thôn do Trưởng thôn định nghĩa (vd "Quỹ Nông thôn
// mới 2026") — áp dụng cho MỌI hộ, mỗi hộ có 1 bản sao trạng thái riêng
// trong Household.fundObligations (xem lớp FundObligation ở trên).
@Schema({ _id: false })
export class FundObligationDef {
  @Prop({ required: true })
  id: string;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  amount: number;

  @Prop({ required: true })
  period: string;
}

@Schema()
export class VillageFund {
  @Prop({ type: SchemaTypes.ObjectId, ref: 'Tenant', required: true, unique: true })
  tenantId: Types.ObjectId;

  @Prop({ type: [VillageFundEntry], default: [] })
  thu: VillageFundEntry[];

  @Prop({ type: [VillageFundExpense], default: [] })
  chi: VillageFundExpense[];

  @Prop({ default: 0 })
  unpaidHouseholds: number;

  @Prop({ default: 0 })
  totalHouseholds: number;

  @Prop({ type: BankInfo, default: {} })
  bankInfo: BankInfo;

  @Prop({ type: [FundObligationDef], default: [] })
  obligationCatalog: FundObligationDef[];
}

export type VillageFundDocument = VillageFund & Document;
export const VillageFundSchema = SchemaFactory.createForClass(VillageFund);
