# Tiến độ triển khai BE — `thon-so-be`

Theo lộ trình mục 11 của `du-an-quan-ly-thon.md` (`E:\Dev\cong-thong-tin-thon`). File này chỉ theo dõi phần **BE (NestJS)**. Xem tiến độ FE tại `E:\Dev\thon-so-fe\PROGRESS.md`.

## Giai đoạn 1 — Khởi tạo BE NestJS ✅ HOÀN THÀNH

- [x] Project NestJS + MongoDB local (`127.0.0.1:27017`, MongoDB Server 8.0.12, đã có sẵn qua winget)
- [x] Dependencies: `@nestjs/mongoose`, `mongoose@8.24.1` (**không dùng v9**, xem vướng mắc bên dưới), `@nestjs/jwt`, `bcryptjs`, `@nestjs/config`, `@nestjs/throttler`, `class-validator`, `class-transformer`, `dotenv`, `ts-node`
- [x] Mongoose schemas theo ERD (mục 6) — `src/schemas/*.schema.ts`: `Tenant`/`AdministrativeUnit`/`SuperAdmin`, `Account`, `Resident`, `Household`/`VillageFund`, `AssociationQuota`, `HomeContent`, `PermissionMatrix`, `AuditLog`, 3 loại Request, `IncidentReport`/`ResidenceRegistration`, `Commune`
- [x] `TenantModule` — `TenantGuard` đọc `x-tenant-slug`, `GET /tenants/public`
- [x] `AuthModule` — `POST /auth/login`, `GET /auth/me`, `JwtAuthGuard`, `RolesGuard`
- [x] Script migrate (`scripts/migrate-seed.ts`, chạy bằng `ts-node`) — import dữ liệu thật từ `js/data.js` prototype (qua Node `vm` sandbox) + GeoJSON thật từ `tracuudlieya.io.vn` → tenant "doanket" đầy đủ (20 nhân khẩu, 21 tài khoản, GPS hộ, quỹ thôn, 5 chi hội, home content, phân quyền, audit log, 4 trụ sở cơ quan xã)
- [x] `.env`/`.env.example`, build sạch, **đã test thật end-to-end**
- [x] **Script sinh thêm hộ/nhân khẩu GIẢ** (`scripts/generate-fake-households.ts`, `npm run generate:fake-households`) — `js/data.js` gốc chỉ có dữ liệu chi tiết cho 15 hộ mẫu dù `villageFund.totalHouseholds` ghi sẵn 363 hộ. Script **bịa thêm** (tên/CCCD/SĐT/ngày sinh ngẫu nhiên hợp lệ, không phải người thật) để đủ 363 hộ: dựng đầy đủ 4 hộ vốn chỉ có tên "đại diện" trong `unpaidHouseholdsList` (FAM-014/027/033/041), sinh thêm 344 hộ hoàn toàn giả (FAM-100..FAM-443, GPS rải ngẫu nhiên có kiểm tra nằm trong ranh giới thật bằng ray-casting point-in-polygon). Idempotent. **Không** tạo Account cho hộ giả. **Rủi ro đã biết:** ~48 cặp trùng tên hoàn toàn giữa các hộ giả (không trùng tên tài khoản thật). **Phụ thuộc thứ tự chạy:** phải chạy sau `migrate:seed`; chạy lại `migrate:seed` sẽ xóa sạch hộ giả, cần chạy lại `generate:fake-households`.

### Vướng mắc kỹ thuật đã gặp (đọc trước khi động vào schema/script — tránh lặp lại)

1. **Bug nghiêm trọng đã sửa: `type: Types.ObjectId` sai, phải dùng `type: SchemaTypes.ObjectId`.**
   `import { Types } from 'mongoose'` rồi viết `@Prop({ type: Types.ObjectId, ref: 'Tenant' })` **build được, không lỗi**, nhưng mọi query lọc theo field đó (vd `findOne({ tenantId: '...' })`) luôn trả `null` — vì `@nestjs/mongoose` hiểu nhầm `Types.ObjectId` (class BSON driver) là 1 class con lồng nhau, biến field đó thành `Mixed` rỗng. **Đã sửa toàn bộ file schema liên quan**: import thêm `SchemaTypes` từ `'mongoose'`, dùng `type: SchemaTypes.ObjectId` thay vì `type: Types.ObjectId` (giữ nguyên `Types.ObjectId` cho phần khai báo kiểu TS của property, chỉ đổi trong option `type:`).
2. **`tsx` không chạy được với `@nestjs/mongoose`** (lỗi `CannotDetermineTypeError`) — luôn dùng `ts-node` cho mọi script độc lập trong repo này, không dùng `tsx`. `nest build`/`nest start` không bị ảnh hưởng.
3. Cookie `secure: true` (khi `NODE_ENV=production`) không được trình duyệt/curl gửi lại qua `http://` — chỉ hoạt động qua `https://` thật hoặc `next dev`.
4. `TenantDocument` dùng làm type tham số trong method có decorator phải `import type` (TS1272).
5. `JwtModule.registerAsync` cần ép kiểu `expiresIn` (package `ms`, không nhận `string` trần).
6. `categorySlug` tin tức trong `js/data.js` **thật** là `"hanh-chinh"/"san-xuat"/"doan-the"`.
7. Role/field/level trong `js/data.js` là nhãn tiếng Việt — migration script có `ROLE_MAP`/`FIELD_MAP`/`LEVEL_MAP` để đổi sang slug tiếng Anh.
8. **Leaflet `className` style option chỉ áp dụng lúc TẠO layer** (`_initPath`), gọi `setStyle({className})` sau đó KHÔNG có tác dụng trên polygon đã tồn tại — phải tự thêm/bỏ class trực tiếp qua `layer.getElement().classList.toggle(...)`.

## Giai đoạn 2 — Module nghiệp vụ cho dashboard Cư dân ✅ (1 role xong)

- [x] `HomeContentModule` — `GET /home-content` (public qua `TenantGuard`), `GET /home-content/public-roster` (Ban Tự Quản/Tổ ANTT sinh động từ `Account.position`/`role` + số điện thoại từ `Resident` cùng tên, đúng logic `renderHomeLeadership()`/`renderHomeSecurity()` bản mẫu)
- [x] `HouseholdsModule` (`src/households/`) — `GET /households/me` (familyId, thành viên, gpsCoord, houseNumber, fundObligations), `PATCH /households/me/gps`, `PATCH /households/me/house-number`. Tự resolve "hộ của người đăng nhập" qua `Account.residentId → Resident.familyId`.
- [x] `RequestsModule` (`src/requests/`) — `POST /requests/member-edit`, `POST /requests/new-member`, `GET /requests/mine`. Trạng thái lưu bằng slug tiếng Anh (`pending`/`approved`/`rejected`).
- [x] **Bổ sung đủ trường cho request sửa/thêm thành viên** — `Resident` schema đổi `address` → `permanentAddress` + thêm `temporaryAddress`; `EditableMemberFields`/`NewMemberRequest` + DTO thêm `fatherName`, `motherName`, `group`, `permanentAddress`, `temporaryAddress`.
- [x] **Validate bắt buộc/định dạng** — CCCD đúng 12 chữ số (`@Matches(/^\d{12}$/)`), SĐT không bắt buộc nhưng nếu có phải đúng 10 chữ số (`@Matches(/^$|^\d{10}$/)`), giới tính bắt buộc chọn `male`/`female` khi gửi request (`@IsIn`). **Phát hiện lỗi**: DTO `CreateMemberEditRequestDto.newValues` thiếu `@ValidateNested()` + `@Type(() => EditableMemberFieldsDto)` nên `class-validator` không hề validate field lồng bên trong — đã sửa.
- [x] **Quỹ Thôn** — thêm vào `HouseholdsModule`: `GET /households/village-fund` (đọc doc `VillageFund` 1/tenant — Thu/Chi công khai), `PATCH /households/me/fund-obligations/:id/pay` (cư dân báo đã chuyển khoản 1 khoản đóng góp nghĩa vụ của hộ mình → chuyển `status` sang `"Chờ duyệt"`, khớp hành vi `confirmSimulatedResidentPayment()` bản mẫu; duyệt thật bởi Trưởng thôn chưa làm).
- [x] **Báo ANTT + Đăng Ký Lưu Trú** — module mới `src/incidents/` (`IncidentsModule`, gộp chung vì cùng thuộc `schemas/incident.schema.ts`): `POST /incident-reports`, `GET /incident-reports/mine`, `POST /residence-registrations`, `GET /residence-registrations/mine`. Resolve familyId qua `Account.residentId → Resident.familyId` (cùng pattern `HouseholdsService`/`RequestsService`). Duyệt/xử lý bởi Tổ ANTT chưa làm.
- [x] **Dashboard Trưởng thôn (role thứ 2)** — module mới `src/village-head/` (2 controller dùng chung 1 module), gated bởi `@Roles('village-head')` + `RolesGuard` (đã có sẵn từ trước, giờ mới dùng lần đầu):
  - `VillageHeadResidentsController` (`/village-head/...`) — "Quản lý Toàn Thôn": `GET residents?q=` (danh bạ + lọc + cờ `hasPendingDeleteRequest`), `PATCH residents/:id` (Trưởng thôn sửa TRỰC TIẾP, không qua duyệt — khác Cư dân/Cán bộ Hội), `POST delete-requests` (tạo `DeleteRequest`, chặn trùng lặp nếu đã có 1 cái đang `pending` cho cùng resident — 409), `GET/PATCH households/:familyId/location|gps` (xem/cập nhật GPS CỦA HỘ BẤT KỲ trong thôn, khác `/households/me` chỉ thao tác hộ của chính người đăng nhập).
  - `VillageHeadFundController` (`/village-head/village-fund`) — "Quản lý Quỹ Thôn": `GET` (tổng hợp thu/chi/số dư/bankInfo/danh mục khoản thu/danh sách chờ duyệt/danh sách hộ chưa đóng — tính TOÀN BỘ động từ `Household.fundObligations` mỗi lần gọi, không dùng lại `VillageFund.unpaidHouseholds/totalHouseholds` tĩnh từ seed), `POST/PATCH/DELETE obligations/:id` (tạo/sửa/xóa 1 khoản thu áp dụng cho MỌI hộ — xem thay đổi schema bên dưới), `PATCH bank-info`, `POST transactions` (ghi Thu chọn hộ+khoản áp dụng hoặc Chi nhập tay), `DELETE transactions/:type/:id`, `POST payments/:familyId/:obligationId/approve|reject` (duyệt/từ chối xác nhận chuyển khoản của cư dân — nối tiếp `PATCH /households/me/fund-obligations/:id/pay` ở mục Cư dân).
  - **Thay đổi schema** (`household.schema.ts`): thêm `VillageFund.obligationCatalog: FundObligationDef[]` (danh mục khoản thu DÙNG CHUNG, tách khỏi bản sao trạng thái riêng từng hộ trong `Household.fundObligations`) và thêm `id?`/`date?` vào `VillageFundEntry`/`VillageFundExpense` (phục vụ xóa giao dịch nhập sai — **các bản ghi thu/chi có sẵn từ trước khi thêm 2 field này sẽ không xóa được qua API mới, chỉ xem được**, không ảnh hưởng chức năng khác).
- [x] **Dashboard Admin (role thứ 3)** — module mới `src/admin/` (5 controller dùng chung 1 module), gated bởi `@Roles('admin')`. Thêm `AdminAuditService` DÙNG CHUNG (`log(tenantId, action, detail, actor)` + `list()`) — lần đầu tiên `AuditLog` schema (đã có sẵn từ Giai đoạn 1 nhưng chưa ai ghi) được ghi thật; mọi service Admin đều gọi log sau khi ghi.
  - `AdminRequestsController` (`/admin/requests`) — "Duyệt Yêu Cầu" gộp cả 3 loại (khớp `renderAdminDuyệtXóa()` bản mẫu xử lý cả 3 trong 1 tab): `GET pending` (3 mảng), `POST delete|member-edit|new-member/:id/approve|reject`. Duyệt xóa → xóa luôn `Resident` + `Account` gắn với resident đó; duyệt thêm thành viên → tạo `Resident` mới + tự cấp `Account` role `resident` (username = CCCD, mật khẩu mặc định "doanket") nếu có CCCD hợp lệ và chưa trùng username — khớp `createResidentAccount()` bản mẫu; duyệt sửa thông tin → ghi đè field vào `Resident` theo `newValues`.
  - `AdminAccountsController` (`/admin/accounts`) — danh sách tài khoản + đếm cư dân chưa có tài khoản, `PATCH :id` (đổi role/position/assoc — chặn đổi role của Admin, bắt buộc `assoc` hợp lệ khi role là `association-officer`), `POST :id/reset-password` (reset về mật khẩu mặc định "doanket", hash lại bằng bcrypt thật chứ không phải no-op), `POST :id/lock|unlock` (chặn khóa Admin), `POST sync` (tạo tài khoản hàng loạt cho mọi cư dân chưa có, bỏ qua ai chưa có CCCD hợp lệ), `GET associations` (danh sách tên hội cho dropdown FE).
  - `AdminPermissionsController` (`/admin/permissions`) — `GET`/`PATCH` `PermissionMatrix` (tự tạo doc mặc định nếu tenant chưa có, role `admin` mặc định `view-edit` mọi trường).
  - `AdminHomeContentController` (`/admin/home-content`) — CRUD từng mảng con của `HomeContent` (`news`/`products`/`schedule`/`gallery`/`stats`) qua 1 cặp helper `addItem`/`updateItem`/`deleteItem` dùng chung (generic theo tên field), cộng `PUT security` (hotline/khẩu hiệu). Trường `leadership` KHÔNG có trong CMS này vì đã chuyển sang sinh động từ `Account.position` (`GET /home-content/public-roster`), không còn là nội dung soạn tay.
  - `AdminLogsController` (`/admin/logs`) — đọc `AuditLog`, giới hạn 200 dòng gần nhất.
  - Route mới `PUT` được thêm vào proxy FE (`route.ts`) + `clientApi()` — cần cho `PUT /admin/home-content/security` (trước đó chỉ có GET/POST/PATCH/DELETE).
  - Đăng nhập demo: username `admin` / mật khẩu `doanket`.
- [ ] 2 dashboard role còn lại (association-officer/security-team) — hội phí `AssociationQuota` (Cán bộ Hội), duyệt tin báo/lưu trú + danh bạ/biên bản (Tổ ANTT) chưa làm.

## Giai đoạn 3 — Superadmin ✅ HOÀN THÀNH (phần CRUD tenant + KMZ)

- [x] `SuperAdminGuard` — JWT riêng biệt, không gắn tenant, phân biệt bằng `payload.scope === 'superadmin'`
- [x] `SuperAdminModule` (`src/superadmin/`):
  - `POST /superadmin/auth/login` (JWT riêng scope `superadmin`)
  - `GET /superadmin/tenants` (kèm `accountCount`/`residentCount`), `GET /superadmin/tenants/:id`
  - `POST /superadmin/tenants` (tạo `Tenant` + 1 Account admin đầu tiên, slug trùng → 409)
  - `PATCH /superadmin/tenants/:id` (đổi tên, hoặc khóa/mở `{archived: true/false}` → set/xóa `Tenant.archivedAt`, đã xác nhận `TenantGuard` trả 404 khi khóa, không xóa dữ liệu)
- [x] Script `scripts/seed-superadmin.ts` (`npm run seed:superadmin`) — tạo tài khoản superadmin đầu tiên (`superadmin`/`superadmin` mặc định), idempotent.
- [x] **Nhập KMZ theo Xã + tạo tenant bằng cách chọn thôn trên bản đồ**:
  - `Commune` schema — 1 bản ghi = 1 lần nhập KMZ của 1 xã, mảng `villages[]` (mỗi Placemark polygon = 1 thôn: tên, slug gợi ý, tọa độ tâm, ranh giới GeoJSON, `claimed`/`tenantId`). `src/superadmin/kmz.util.ts` tự giải nén KMZ (`adm-zip`) + trích xuất polygon/tên bằng regex, tự bỏ qua Placemark chỉ có 1-2 tọa độ (điểm mốc).
  - API: `POST /superadmin/communes` (multipart), `GET /superadmin/communes`, `GET /superadmin/communes/:id`, `POST /superadmin/communes/:id/villages/:index/create-tenant` (409 nếu thôn đã claimed).
  - **Quyết định kiến trúc**: bỏ ý định `Commune.rootDomain` (mỗi xã 1 domain riêng) — BE/superadmin vốn không gắn domain nào, 1 superadmin quản lý nhiều xã/nhiều domain bình thường. Chỉ cần tổng quát hóa middleware phía FE (xem PROGRESS.md của FE).
- [x] **Gán/bỏ gán Xã-Thôn cho tenant ĐÃ CÓ SẴN** — `Tenant` schema thêm `communeId`/`communeVillageIndex`; `PATCH /superadmin/tenants/:id/assign-village` (đồng bộ `lat/lng/boundary`, tự bỏ claimed thôn cũ khi đổi thôn, chặn gán trùng thôn đã có tenant khác — 409, hỗ trợ bỏ gán hoàn toàn `communeId: null`).
- [x] **`GET /administrative-units`** (public, trong `TenantModule`) — trụ sở cơ quan cấp xã (Đảng ủy/UBND/MTTQ/Công an), không có `tenantId`, hiển thị chung trên bản đồ danh mục.
- [x] CRUD `AdministrativeUnit` qua route superadmin (`src/superadmin/superadmin-administrative-units.{controller,service}.ts`) — `GET/POST /superadmin/administrative-units`, `PATCH/DELETE /superadmin/administrative-units/:id` (404 nếu không tồn tại). Đã kiểm thử end-to-end bằng curl (login superadmin → create → patch → delete → delete lại trả 404).

## Giai đoạn 4 — Trang danh mục công khai (`GET /communes/public`) ✅

- [x] Module `src/communes/` (public, tách biệt `src/superadmin/`) — `GET /communes/public` trả mọi Commune kèm danh sách thôn, mỗi thôn kèm `tenantSlug`/`tenantName` NẾU đã gán tenant **và** tenant chưa bị khóa (`archivedAt: null`), kèm mảng `households[]` (tọa độ GPS + tên hộ, resolve từ `Household` + `Resident.isHouseholder` cùng `familyId`).
- [x] `GET /administrative-units` — dùng chung cho bản đồ danh mục (marker cơ quan nhà nước, kèm `logoUrl` ảnh riêng từng cơ quan).
- [x] Đã kiểm thử end-to-end bằng curl + Puppeteer (xem chi tiết trong lịch sử — tạo commune, gán tenant, xác nhận claimed/unclaimed, xác nhận trang danh mục FE nhận đúng dữ liệu).

## Giai đoạn 5 — Hạ tầng VPS (chưa bắt đầu)

- [ ] nginx, wildcard SSL, PM2, MongoDB backup

---
**Cách chạy lại từ đầu:**
```
cd E:\Dev\thon-so-be
npm run start:dev                  # port 3000
npm run migrate:seed               # reset dữ liệu tenant "doanket"
npm run generate:fake-households   # sinh thêm hộ giả cho đủ 363 hộ
npm run seed:superadmin            # tạo superadmin/superadmin
```
**Lưu ý slug:** tenant thật dùng slug `"doanket"` (không gạch nối) — từng có lệch dữ liệu do đổi hằng số `TENANT_SLUG` sau khi đã seed, đã dọn sạch, luôn kiểm tra bằng `db.tenants.find()` nếu nghi ngờ.
