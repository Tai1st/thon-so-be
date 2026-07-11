// Tạo tài khoản superadmin đầu tiên (mục 8.6 tài liệu thiết kế) — không có
// UI đăng ký superadmin (đây là quyền cao nhất, chỉ tạo qua script chạy
// thủ công trên máy chủ/máy dev). Idempotent: nếu username đã tồn tại thì
// chỉ đổi lại mật khẩu, không tạo trùng.
//
// Chạy: npm run seed:superadmin  (dùng ts-node, KHÔNG dùng tsx)
import 'dotenv/config';
import mongoose from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { SuperAdmin, SuperAdminSchema } from '../src/schemas/tenant.schema';

const USERNAME = process.env.SUPERADMIN_USERNAME || 'superadmin';
const PASSWORD = process.env.SUPERADMIN_PASSWORD || 'superadmin';

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('Thiếu MONGODB_URI trong .env');
  await mongoose.connect(uri);
  console.log('Đã kết nối MongoDB:', uri);

  const SuperAdminModel = mongoose.model(SuperAdmin.name, SuperAdminSchema);
  const passwordHash = await bcrypt.hash(PASSWORD, 10);

  const existing = await SuperAdminModel.findOne({ username: USERNAME });
  if (existing) {
    existing.passwordHash = passwordHash;
    await existing.save();
    console.log(`✅ Đã cập nhật lại mật khẩu cho superadmin "${USERNAME}".`);
  } else {
    await SuperAdminModel.create({ username: USERNAME, passwordHash });
    console.log(`✅ Đã tạo tài khoản superadmin "${USERNAME}".`);
  }
  console.log(`   Đăng nhập: username="${USERNAME}", password="${PASSWORD}"`);

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
