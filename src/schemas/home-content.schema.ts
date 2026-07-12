import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaTypes, Types } from 'mongoose';

@Schema({ _id: false })
class Stat {
  @Prop() id: string;
  @Prop() icon: string;
  @Prop() label: string;
  @Prop() value: string;
  @Prop() unit: string;
  @Prop({ type: [Object], default: [] }) breakdown: { label: string; value: string }[];
}

@Schema({ _id: false })
class NewsItem {
  @Prop() id: string;
  @Prop({ enum: ['hanh-chinh', 'san-xuat', 'doan-the'] }) categorySlug: string;
  @Prop() category: string;
  @Prop() colorClass: string;
  @Prop() date: string;
  @Prop() title: string;
  @Prop() summary: string;
  @Prop() content: string;
  @Prop() createdBy: string;
}

@Schema({ _id: false })
class Product {
  @Prop() id: string;
  @Prop() name: string;
  @Prop() badge: string;
  @Prop() image: string;
  @Prop() desc: string;
  @Prop() footerLabel: string;
  @Prop() footerValue: string;
}

@Schema({ _id: false })
class LeadershipMember {
  @Prop() id: string;
  @Prop() initials: string;
  @Prop() colorTheme: string;
  @Prop() role: string;
  @Prop() name: string;
  @Prop() desc: string;
  @Prop({ enum: ['phone', 'tag'] }) actionType: string;
  @Prop() phone?: string;
  @Prop() phoneDisplay?: string;
  @Prop() tagIcon?: string;
  @Prop() tagLabel?: string;
  @Prop() decorIcon: string;
}

@Schema({ _id: false })
class SecurityMember {
  @Prop() id: string;
  @Prop() title: string;
  @Prop() name: string;
  @Prop() phone: string;
  @Prop() phoneDisplay: string;
}

@Schema({ _id: false })
class SecurityInfo {
  @Prop() hotline: string;
  @Prop() hotlineDisplay: string;
  @Prop() slogan: string;
  @Prop({ type: [SecurityMember], default: [] }) members: SecurityMember[];
}

@Schema({ _id: false })
class ScheduleItem {
  @Prop() id: string;
  @Prop() day: string;
  @Prop() month: string;
  @Prop() title: string;
  @Prop() location: string;
  @Prop() time: string;
}

@Schema({ _id: false })
class GalleryItem {
  @Prop() id: string;
  @Prop() image: string;
  @Prop() caption: string;
}

@Schema()
export class HomeContent {
  @Prop({ type: SchemaTypes.ObjectId, ref: 'Tenant', required: true, unique: true })
  tenantId: Types.ObjectId;

  @Prop({ type: [Stat], default: [] })
  stats: Stat[];

  @Prop({ type: [NewsItem], default: [] })
  news: NewsItem[];

  @Prop({ type: [Product], default: [] })
  products: Product[];

  @Prop({ type: [LeadershipMember], default: [] })
  leadership: LeadershipMember[];

  @Prop({ type: SecurityInfo, default: {} })
  security: SecurityInfo;

  @Prop({ type: [ScheduleItem], default: [] })
  schedule: ScheduleItem[];

  @Prop({ type: [GalleryItem], default: [] })
  gallery: GalleryItem[];

  // Ảnh nền khối hero trang chủ (Admin sửa qua "Quản lý Trang chủ" >
  // Thương hiệu). Rỗng thì FE dùng ảnh Unsplash mặc định.
  @Prop({ default: '' })
  heroImage: string;

  // Danh sách "thôn cũ" trước khi sáp nhập (vd "Đoàn Kết cũ", "Yên Khánh
  // cũ") — Admin tự định nghĩa qua "Quản lý Trang chủ", dùng làm: (1) lựa
  // chọn cho trường Resident.group khi thêm/sửa nhân khẩu, (2) nhãn dòng
  // breakdown của các chỉ số thống kê (Stat.breakdown) trên trang chủ.
  @Prop({ type: [String], default: [] })
  oldVillages: string[];
}

export type HomeContentDocument = HomeContent & Document;
export const HomeContentSchema = SchemaFactory.createForClass(HomeContent);
