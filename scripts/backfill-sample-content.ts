// Backfill KHÔNG PHÁ HỦY: điền nội dung mẫu (tin tức/sản vật/lịch công tác/
// thư viện ảnh) cho các tenant đã tạo TRƯỚC khi defaultHomeContent() được
// mở rộng đầy đủ — chỉ điền vào mảng đang RỖNG, không đụng tới tenant nào
// Admin đã tự nhập nội dung thật.
//
// Chạy: npx ts-node scripts/backfill-sample-content.ts <slug>
import 'dotenv/config';
import mongoose from 'mongoose';
import { Tenant, TenantSchema } from '../src/schemas/tenant.schema';
import { HomeContent, HomeContentSchema } from '../src/schemas/home-content.schema';

function randomId(prefix: string): string {
  return `${prefix}-${Math.floor(1000 + Math.random() * 9000)}`;
}
function todayDisplay(): string {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

function sampleNews() {
  const today = todayDisplay();
  return [
    {
      id: randomId('NEWS'),
      categorySlug: 'san-xuat',
      category: 'Sản xuất',
      colorClass: 'bg-emerald-100 text-emerald-600',
      date: today,
      title: 'Chương trình tập huấn kỹ thuật canh tác nông nghiệp',
      summary: 'Hội Nông dân phối hợp tổ chức các lớp tập huấn nâng cao kỹ thuật canh tác cho bà con trong thôn.',
      content:
        'Nhằm nâng cao năng suất và chất lượng nông sản, Hội Nông dân phối hợp cùng các kỹ sư nông nghiệp tổ chức chương trình tập huấn kỹ thuật canh tác cho bà con trong thôn.\n\nThông tin chi tiết về thời gian, địa điểm sẽ được Ban quản lý thôn cập nhật cụ thể.',
      createdBy: 'Admin',
    },
    {
      id: randomId('NEWS'),
      categorySlug: 'doan-the',
      category: 'Đoàn thể',
      colorClass: 'bg-amber-100 text-amber-600',
      date: today,
      title: 'Phát động phong trào "Ngày Chủ Nhật Xanh"',
      summary: 'Chi đoàn Thanh niên và Hội Phụ nữ phát động toàn dân tham gia dọn dẹp vệ sinh đường làng.',
      content:
        'Thực hiện tiêu chí Xanh - Sạch - Đẹp trong xây dựng Nông thôn mới, Chi đoàn Thanh niên phối hợp Hội Liên hiệp Phụ nữ phát động phong trào ra quân vệ sinh môi trường, trồng cây xanh dọc các tuyến đường trong thôn.\n\nKính mời bà con nhân dân cùng tham gia đóng góp ngày công.',
      createdBy: 'Admin',
    },
  ];
}

function sampleProducts() {
  return [
    {
      id: randomId('PRD'),
      name: 'Cà Phê Robusta',
      badge: 'Chủ Lực',
      image: 'https://placehold.co/400x260/dcfce7/15803d?text=Ca+Phe+Robusta',
      desc: 'Hạt cà phê Robusta đậm đà đặc sản Tây Nguyên, trồng hữu cơ cho hương thơm thuần khiết và vị đậm mạnh mẽ.',
      footerLabel: 'Sản lượng năm:',
      footerValue: 'Chưa cập nhật',
    },
    {
      id: randomId('PRD'),
      name: 'Sầu Riêng Ri6',
      badge: 'Giá Trị Cao',
      image: 'https://placehold.co/400x260/fef3c7/b45309?text=Sau+Rieng+Ri6',
      desc: 'Cơm vàng hạt lép, dẻo ngọt đậm hương thơm, thu hoạch theo quy trình xuất khẩu sạch, an toàn cho người tiêu dùng.',
      footerLabel: 'Diện tích:',
      footerValue: 'Chưa cập nhật',
    },
    {
      id: randomId('PRD'),
      name: 'Hồ Tiêu Đen',
      badge: 'Truyền Thống',
      image: 'https://placehold.co/400x260/fee2e2/b91c1c?text=Ho+Tieu+Den',
      desc: 'Hạt chắc, độ cay nồng sâu và thơm tự nhiên đặc trưng. Là mặt hàng thế mạnh lâu đời của bà con trong thôn.',
      footerLabel: 'Tiêu chuẩn:',
      footerValue: 'VietGAP',
    },
    {
      id: randomId('PRD'),
      name: 'Hạt Mắc Ca',
      badge: 'Kinh Tế Mới',
      image: 'https://placehold.co/400x260/e0e7ff/4338ca?text=Mac+Ca',
      desc: 'Nữ hoàng các loại hạt, hạt to tròn đều, chứa hàm lượng dinh dưỡng cao, béo ngậy được thị trường ưa chuộng.',
      footerLabel: 'Sản xuất:',
      footerValue: 'Sấy nứt vỏ',
    },
    {
      id: randomId('PRD'),
      name: 'Chanh Dây Tím',
      badge: 'Dài Hạn',
      image: 'https://placehold.co/400x260/fae8ff/86198f?text=Chanh+Day',
      desc: 'Sản vật mọng nước, vị chua ngọt dạt dào sảng khoái, nguồn nguyên liệu hoàn hảo xuất khẩu đi các nước EU.',
      footerLabel: 'Nguồn gốc:',
      footerValue: 'Chuẩn xuất khẩu',
    },
  ];
}

function sampleSchedule() {
  return [
    { id: randomId('SCH'), day: '25', month: 'Tháng 5', title: 'Hội nghị nhân dân quý II', location: 'Nhà văn hóa thôn', time: '07:30' },
    { id: randomId('SCH'), day: '28', month: 'Tháng 5', title: 'Tập huấn kỹ thuật canh tác nông nghiệp', location: 'Vườn mẫu thôn', time: '08:00' },
    { id: randomId('SCH'), day: '05', month: 'Tháng 6', title: 'Ngày Chủ nhật xanh', location: 'Toàn thôn', time: '07:00' },
  ];
}

function sampleGallery() {
  return [
    { id: randomId('GAL'), image: 'https://placehold.co/400x260/dcfce7/15803d?text=Hop+trien+khai', caption: 'Họp triển khai kế hoạch sản xuất' },
    { id: randomId('GAL'), image: 'https://placehold.co/400x260/fef3c7/b45309?text=Thu+hoach', caption: 'Bà con thu hoạch nông sản đầu vụ' },
    { id: randomId('GAL'), image: 'https://placehold.co/400x260/dbeafe/1e40af?text=Ra+quan+ve+sinh', caption: 'Ra quân vệ sinh môi trường, trồng cây xanh' },
  ];
}

async function main() {
  const slug = process.argv[2];
  if (!slug) throw new Error('Dùng: npx ts-node scripts/backfill-sample-content.ts <slug>');

  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('Thiếu MONGODB_URI trong .env');
  await mongoose.connect(uri);

  const TenantModel = mongoose.model(Tenant.name, TenantSchema);
  const HomeContentModel = mongoose.model(HomeContent.name, HomeContentSchema);

  const tenant = await TenantModel.findOne({ slug });
  if (!tenant) throw new Error(`Không tìm thấy tenant slug="${slug}".`);

  const doc = await HomeContentModel.findOne({ tenantId: tenant._id });
  if (!doc) throw new Error('Chưa có HomeContent cho tenant này.');

  const filled: string[] = [];
  if (doc.news.length <= 1) {
    doc.news.push(...(sampleNews() as never[]));
    filled.push('news');
  }
  if (doc.products.length === 0) {
    doc.products = sampleProducts() as never;
    filled.push('products');
  }
  if (doc.schedule.length === 0) {
    doc.schedule = sampleSchedule() as never;
    filled.push('schedule');
  }
  if (doc.gallery.length === 0) {
    doc.gallery = sampleGallery() as never;
    filled.push('gallery');
  }
  if (!doc.security.slogan) {
    doc.security.slogan = 'Đoàn kết - Chủ động - Kỷ cương - An toàn';
    filled.push('security.slogan');
  }

  if (filled.length === 0) {
    console.log('Tenant đã có đủ nội dung mẫu, không cần điền thêm.');
  } else {
    doc.markModified('news');
    doc.markModified('security');
    await doc.save();
    console.log(`Đã điền nội dung mẫu cho: ${filled.join(', ')}.`);
  }

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
