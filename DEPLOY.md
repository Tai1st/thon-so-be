# Triển khai VPS — Cổng Thông Tin Điện Tử Thôn

Runbook triển khai hạ tầng cho hệ thống multi-tenant (FE Next.js + BE NestJS + MongoDB), mỗi thôn dùng 1 subdomain trỏ chung 1 mã nguồn.

**Stack**: Ubuntu 24.04 · Node.js 20 LTS · MongoDB 8 · Nginx · PM2 · Certbot (DNS-01) · GitHub Actions

Thay `dlieya.click` bằng domain thật ở các bước bên dưới.

---

## 1. Chuẩn bị VPS

Khuyến nghị ≥ 2 vCPU / 4GB RAM (Node + Mongo + Nginx chạy cùng lúc). SSH bằng user có quyền sudo, không dùng root trực tiếp cho lâu dài.

### Cập nhật & công cụ cơ bản

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git ufw build-essential
```

> **Lỗi thường gặp: `apt update`/`apt upgrade` báo `404 Not Found`**
>
> Nguyên nhân: VPS được cấu hình sẵn trỏ về mirror riêng của nhà cung cấp (vd `ubuntu.vpsttt.com`) thay vì mirror chính thức Ubuntu — mirror đó có danh sách package bị lệch/lỗi thời (vd `qemu-guest-agent` có tên trong danh sách nhưng file `.deb` thật đã không còn trên mirror).
>
> Cách xử lý — đổi lại mirror chính thức. Mở file bằng `nano` (không gõ thẳng đường dẫn như 1 lệnh — đây là **file cấu hình**, không phải file thực thi, gõ thẳng sẽ báo `Permission denied`):
>
> ```bash
> sudo nano /etc/apt/sources.list.d/ubuntu.sources
> ```
>
> Thay toàn bộ nội dung file bằng đúng mirror chính thức cho Ubuntu 24.04 (noble):
>
> ```
> Types: deb
> URIs: http://archive.ubuntu.com/ubuntu
> Suites: noble noble-updates noble-backports
> Components: main restricted universe multiverse
> Signed-By: /usr/share/keyrings/ubuntu-archive-keyring.gpg
>
> Types: deb
> URIs: http://security.ubuntu.com/ubuntu
> Suites: noble-security
> Components: main restricted universe multiverse
> Signed-By: /usr/share/keyrings/ubuntu-archive-keyring.gpg
> ```
>
> Lưu lại rồi xoá cache và update lại:
>
> ```bash
> sudo apt clean
> sudo rm -rf /var/lib/apt/lists/*
> sudo apt update
> ```

### Node.js 20 LTS (qua NodeSource)

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node -v   # v20.x
npm -v
```

### PM2 (process manager)

```bash
sudo npm install -g pm2
pm2 startup   # dán lệnh nó in ra để pm2 tự khởi động cùng VPS
```

### Nginx

```bash
sudo apt install -y nginx
sudo systemctl enable --now nginx
```

### Tường lửa

```bash
sudo ufw allow OpenSSH
sudo ufw allow "Nginx Full"   # mở 80 + 443
sudo ufw enable
```

> Cổng BE (`8000`) và FE (`3000`) **không** mở ra ngoài — chỉ Nginx (80/443) chạm được internet, nó reverse-proxy vào localhost. Không cần thêm rule ufw cho 2 cổng này.

---

## 2. MongoDB tự cài trên VPS

```bash
curl -fsSL https://pgp.mongodb.com/server-8.0.asc | sudo gpg -o /usr/share/keyrings/mongodb-server-8.0.gpg --dearmor
echo "deb [signed-by=/usr/share/keyrings/mongodb-server-8.0.gpg] https://repo.mongodb.org/apt/ubuntu noble/mongodb-org/8.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-8.0.list
sudo apt update
sudo apt install -y mongodb-org
sudo systemctl enable --now mongod
```

### Tạo user quản trị + user riêng cho app

```bash
mongosh
```

```js
use admin
db.createUser({
  user: "root",
  pwd: "<mật khẩu mạnh, tự sinh>",
  roles: [{ role: "root", db: "admin" }]
})

use thonso
db.createUser({
  user: "thonso",
  pwd: "<mật khẩu khác, tự sinh>",
  roles: [{ role: "readWrite", db: "thonso" }]
})
exit
```

### Bật xác thực

```bash
sudo nano /etc/mongod.conf
# thêm/sửa:
# security:
#   authorization: enabled
# net:
#   bindIp: 127.0.0.1   (giữ nguyên — không đổi thành 0.0.0.0)
sudo systemctl restart mongod
```

> **Quan trọng**: `bindIp` phải giữ `127.0.0.1` — Mongo không bao giờ cần nghe từ internet vì BE chạy cùng VPS, gọi qua localhost. Đây là điểm dễ để lộ toàn bộ dữ liệu nhân khẩu nếu set nhầm `0.0.0.0`.

### Chuỗi kết nối dùng trong `.env` của BE

```
MONGODB_URI=mongodb://thonso:<mật khẩu>@127.0.0.1:27017/thonso
```

---

## 3. Clone & deploy lần đầu (thủ công)

Lần đầu deploy làm tay để chắc chắn chạy được, các lần sau GitHub Actions tự làm (mục 6).

### Tạo Deploy Key cho VPS (làm 1 lần)

VPS cần quyền `git clone`/`git pull` 2 repo private qua SSH — dùng Deploy Key riêng (chỉ đọc, giới hạn đúng 1 repo/key), an toàn hơn add key cá nhân vào tài khoản GitHub.

```bash
# tạo keypair riêng cho việc kéo code từ GitHub
ssh-keygen -t ed25519 -C "vps-dlieya" -f ~/.ssh/id_ed25519_github -N ""
cat ~/.ssh/id_ed25519_github.pub   # copy dòng này

# ép SSH luôn dùng đúng key này khi kết nối github.com
cat >> ~/.ssh/config << 'EOF'
Host github.com
  HostName github.com
  User git
  IdentityFile ~/.ssh/id_ed25519_github
  IdentitiesOnly yes
EOF
chmod 600 ~/.ssh/config

# thêm sẵn fingerprint GitHub vào known_hosts — tránh bị hỏi xác nhận
# tương tác lúc clone (dễ fail nếu terminal không nhận input đúng)
ssh-keyscan -t ed25519 github.com >> ~/.ssh/known_hosts
chmod 600 ~/.ssh/known_hosts
```

Add public key vừa copy vào **cả 2 repo** trên GitHub — mỗi repo: *Settings → Deploy keys → Add deploy key*, dán key vào, đặt tên (vd `vps-metus`), **không tick "Allow write access"** (VPS chỉ cần đọc để pull).

Kiểm tra trước khi clone:

```bash
ssh -T git@github.com
# thấy dòng "Hi Tai1st/<repo>! You've successfully authenticated..." là đúng
```

### Backend

```bash
sudo mkdir -p /var/www && sudo chown $USER:$USER /var/www
cd /var/www
git clone git@github.com:Tai1st/thon-so-be.git dlieya-be
cd dlieya-be
cp .env.example .env
nano .env   # điền MONGODB_URI, JWT_ACCESS_SECRET, PORT=8000

npm ci
npm run build
pm2 start dist/src/main.js --name dlieya-api
pm2 save
```

> Đường dẫn build là `dist/src/main.js` (không phải `dist/main.js`) — cấu trúc `tsconfig.json` hiện tại giữ nguyên thư mục `src/` bên trong `dist/`.

### Frontend

```bash
cd /var/www
git clone git@github.com:Tai1st/thon-so-fe.git dlieya-fe
cd dlieya-fe
nano .env.local
# nội dung .env.local:
# BE_API_BASE_URL=http://127.0.0.1:8000/api

npm ci
npm run build
pm2 start npm --name dlieya-web -- start
pm2 save
```

### Biến môi trường

| Biến | Nơi dùng | Giá trị VPS |
|---|---|---|
| `MONGODB_URI` | BE | `mongodb://thonso:***@127.0.0.1:27017/thonso` |
| `JWT_ACCESS_SECRET` | BE | chuỗi ngẫu nhiên dài, tự sinh 1 lần |
| `PORT` | BE | `8000` |
| `BE_API_BASE_URL` | FE | `http://127.0.0.1:8000/api` |
| `IMGBB_API_KEY` | BE | API key lấy tại https://api.imgbb.com/ (dùng chung upload ảnh: logo, hero, avatar, gallery...) |

---

## 4. Gắn tên miền & Nginx wildcard

Mỗi thôn dùng 1 subdomain (`slug.dlieya.click`) trỏ về cùng 1 tiến trình Next.js — middleware trong FE tự tách slug từ subdomain, không cần cấu hình riêng cho từng thôn ở Nginx.

### DNS — tại nhà cung cấp domain

| Loại | Giá trị |
|---|---|
| A record | `@ → <IP VPS>` (cho `dlieya.click`) |
| A record (wildcard) | `* → <IP VPS>` (cho `*.dlieya.click`) |

### Nginx — 1 file duy nhất xử lý mọi subdomain

```bash
sudo nano /etc/nginx/sites-available/dlieya
```

```nginx
# /etc/nginx/sites-available/dlieya
copyy từ đây :
server {
    listen 80;
    server_name dlieya.click *.dlieya.click;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/dlieya /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

> BE không cần block riêng trong Nginx — FE (route handler `/api/backend/...`) gọi BE server-to-server qua `127.0.0.1:8000`, trình duyệt không bao giờ gọi thẳng BE.

---

## 5. SSL cho wildcard domain

Chứng chỉ wildcard (`*.dlieya.click`) bắt buộc phải xác thực qua **DNS-01** — thử thách HTTP-01 thông thường không cấp được cho wildcard.

### Cài Certbot + plugin DNS của nhà cung cấp domain

```bash
# ví dụ nếu domain quản lý qua Cloudflare
sudo apt install -y certbot python3-certbot-dns-cloudflare
```

```bash
sudo nano /etc/letsencrypt/cloudflare.ini
```

```
dns_cloudflare_api_token = <API token chỉ có quyền Edit DNS cho domain này>
```

```bash
sudo chmod 600 /etc/letsencrypt/cloudflare.ini
```

### Xin chứng chỉ

```bash
sudo certbot certonly \
  --dns-cloudflare \
  --dns-cloudflare-credentials /etc/letsencrypt/cloudflare.ini \
  -d dlieya.click -d "*.dlieya.click"
```
Enter email address → gõ email bạn dùng để nhận cảnh báo hết hạn chứng chỉ, vd metusvietnam@gmail.com.
Tiếp theo sẽ hỏi đồng ý điều khoản dịch vụ (Terms of Service) → gõ Y (Enter).
Có thể hỏi thêm "chia sẻ email với EFF" (tổ chức đứng sau Let's Encrypt) → tuỳ bạn, gõ Y hoặc N đều được, không ảnh hưởng việc cấp chứng chỉ.
### Bật HTTPS trong Nginx

Mở lại đúng file đã tạo ở mục 4 (thay nội dung cũ bằng bản có HTTPS này):

```bash
sudo nano /etc/nginx/sites-available/dlieya
```

Dán đè toàn bộ nội dung file bằng:

```nginx
server {
    listen 443 ssl;
    server_name dlieya.click *.dlieya.click;

    ssl_certificate     /etc/letsencrypt/live/dlieya.click/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/dlieya.click/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

server {
    listen 80;
    server_name dlieya.click *.dlieya.click;
    return 301 https://$host$request_uri;
}
```

```bash
sudo nginx -t && sudo systemctl reload nginx
sudo certbot renew --dry-run   # xác nhận auto-gia hạn hoạt động
```

Nhà cung cấp domain khác Cloudflare (Namecheap, GoDaddy, PA Vietnam, Nhân Hòa...) thường không có plugin certbot sẵn — dùng chế độ `--manual`, Certbot sẽ in ra 1 bản ghi TXT để bạn tự thêm vào DNS mỗi lần gia hạn (90 ngày/lần), hoặc chuyển DNS domain sang Cloudflare (miễn phí) để tự động hoá.

### Đổi sang domain khác (VPS đang chạy sẵn)

`proxy.ts` (middleware) tách tenant slug hoàn toàn tổng quát theo số nhãn hostname — **không cần sửa code nào cả**, chỉ đổi hạ tầng, theo đúng thứ tự sau (tránh downtime):

1. **DNS trước** — tại nhà cung cấp domain mới, thêm A record `@ → <IP VPS>` và A record wildcard `* → <IP VPS>`. Đợi lan truyền, kiểm tra bằng `nslookup <domain-moi>` và `nslookup <slug-bat-ky>.<domain-moi>` — cả 2 phải trả về đúng IP VPS (hoặc IP proxy Cloudflare nếu bật proxy).
2. **Xin SSL wildcard cho domain mới** (không dùng lại cert cũ được) — lặp lại lệnh `certbot certonly --dns-cloudflare ...` ở trên nhưng đổi `-d` sang domain mới.
3. **Sửa file Nginx** (`/etc/nginx/sites-available/dlieya`) — đổi `server_name` (cả 2 block 80 và 443) và 2 dòng `ssl_certificate`/`ssl_certificate_key` sang domain mới, giữ nguyên phần còn lại. Chạy `sudo nginx -t && sudo systemctl reload nginx`.
4. **Kiểm tra** — `curl -I https://<domain-moi>` và `curl -I https://<slug-bat-ky>.<domain-moi>` phải trả về response bình thường từ Next.js (không phải lỗi SSL/connection refused).
5. **Xóa domain cũ** khi đã chắc chắn ổn — xóa A record cũ tại nhà cung cấp domain cũ, và tùy chọn dọn cert không dùng nữa: `sudo certbot delete --cert-name <domain-cu>`.

Domain cũ vẫn chạy song song cho tới khi bạn tự xóa A record ở bước 5 — có thể thử domain mới trước khi tắt hẳn domain cũ.

---

## 6. Auto-deploy khi push GitHub

Mỗi lần push nhánh `master`, GitHub Actions tự SSH vào VPS, `git pull`, build, và restart PM2 — không cần đăng nhập VPS thủ công nữa.

### Tạo SSH key riêng cho việc deploy

```bash
# chạy trên VPS, tạo keypair KHÔNG passphrase, chỉ dùng để deploy
ssh-keygen -t ed25519 -f ~/.ssh/dlieya_deploy -N ""
cat ~/.ssh/dlieya_deploy.pub >> ~/.ssh/authorized_keys
cat ~/.ssh/dlieya_deploy   # copy private key, dán vào GitHub Secrets
```

### Thêm Secrets — trên GitHub, làm cho **cả 2 repo** (thon-so-fe, thon-so-be)

*Settings → Secrets and variables → Actions → New repository secret*

| Secret | Giá trị |
|---|---|
| `VPS_HOST` | IP hoặc domain VPS |
| `VPS_USER` | user SSH (không dùng root) |
| `VPS_SSH_KEY` | toàn bộ nội dung `dlieya_deploy` (private key) |

### Workflow đã có sẵn trong repo

File `.github/workflows/deploy.yml` đã có sẵn ở cả 2 repo (BE deploy vào `/var/www/dlieya-be`, FE vào `/var/www/dlieya-fe`) — chỉ cần add 3 secrets ở trên rồi push code là chạy.

> Lần đầu SSH từ Actions vào VPS có thể fail vì host key chưa được biết — action `appleboy/ssh-action` tự xử lý việc này, nhưng nếu vẫn lỗi `host key verification failed`, thêm SSH fingerprint của VPS vào `known_hosts` trên chính VPS trước.

---

## 7. Thêm 1 thôn mới sau khi hạ tầng đã chạy

Không cần đụng gì tới Nginx/DNS/deploy nữa — wildcard đã phủ mọi subdomain. Chỉ cần tạo tenant qua giao diện Superadmin.

1. Vào `https://dlieya.click/superadmin`, đăng nhập tài khoản superadmin.
2. Vào *Quản lý Xã* → nhập KMZ ranh giới các thôn trong xã (nếu chưa có).
3. Trên bản đồ, bấm vào thôn (màu vàng = chưa có tenant) → điền slug + thông tin admin đầu tiên → *Tạo tenant*.
4. Thôn mới lập tức truy cập được ở `https://<slug>.dlieya.click` — không cần restart gì trên VPS.

---

## 8. Đưa dữ liệu từ local lên VPS

Dùng đúng bộ công cụ MongoDB chuẩn (`mongodump`/`mongorestore`) — sao chép toàn bộ database local (mọi tenant, resident, account, home-content...) lên VPS trong 1 lần, giữ nguyên cấu trúc.

### Cài Database Tools (nếu máy local chưa có)

MongoDB Database Tools là gói riêng, không đi kèm `mongod` từ bản 4.4 trở lên.

```powershell
# Windows — PowerShell
winget install MongoDB.DatabaseTools
```

```bash
# VPS — Ubuntu
sudo apt install -y mongodb-database-tools
```

Kiểm tra: `mongodump --version` chạy được là ổn.

### Bước 1 — Dump từ máy local

```bash
mongodump --uri="mongodb://127.0.0.1:27017/cong-thong-tin-thon" --out="./mongo-dump"
```

Lệnh này tạo thư mục `./mongo-dump/cong-thong-tin-thon/` chứa toàn bộ collection (`.bson` + `.json` metadata) — có thể mở thử xem danh sách file để chắc chắn đủ dữ liệu (`tenants.bson`, `residents.bson`, `accounts.bson`, `homecontents.bson`, ...).

### Bước 2 — Chuyển thư mục dump lên VPS

```bash
# chạy từ máy local (Git Bash), nén lại cho gọn trước khi truyền
tar -czf mongo-dump.tar.gz -C mongo-dump .
scp mongo-dump.tar.gz <user>@<VPS_HOST>:/tmp/
```

Trên VPS, giải nén:

```bash
mkdir -p /tmp/mongo-dump
tar -xzf /tmp/mongo-dump.tar.gz -C /tmp/mongo-dump
```

### Bước 3 — Restore vào MongoDB trên VPS

VPS đã bật xác thực (mục 2), restore bằng đúng user app đã tạo. Tên database local là `cong-thong-tin-thon` nhưng database thật trên VPS đặt tên `thonso` — dùng `--nsFrom`/`--nsTo` để đổi tên ngay khi restore, không cần sửa gì trong thư mục dump:

```bash
mongorestore \
  --uri="mongodb://thonso:<mật khẩu>@127.0.0.1:27017/thonso" \
  --nsFrom="cong-thong-tin-thon.*" \
  --nsTo="thonso.*" \
  --drop \
  /tmp/mongo-dump
```

- `--drop`: xoá sạch collection trùng tên trước khi restore, tránh dữ liệu cũ trên VPS (nếu có, ví dụ tenant demo đã tạo thử) lẫn với dữ liệu thật vừa đưa lên. **Bỏ cờ này** nếu VPS đã có dữ liệu thật khác muốn giữ lại.
- Restore xong, xoá file tạm: `rm -rf /tmp/mongo-dump /tmp/mongo-dump.tar.gz`

### Bước 4 — Xác minh

```bash
mongosh "mongodb://thonso:<mật khẩu>@127.0.0.1:27017/thonso"
```

```js
db.tenants.countDocuments()
db.residents.countDocuments()
db.accounts.countDocuments()
```

So khớp số lượng với dữ liệu local trước khi dump — nếu khớp, khởi động lại BE để nạp lại kết nối (`pm2 restart dlieya-api`) rồi thử đăng nhập thật trên domain.

> Chỉ chạy bước này **1 lần khi đưa hệ thống lên production lần đầu**. Sau đó dữ liệu trên VPS là dữ liệu thật — không dump/restore đè lên nữa, chỉ backup định kỳ theo chiều ngược lại (mục 9).

---

## 9. Việc nên làm ngay sau khi lên production

- [ ] **Backup MongoDB tự động** — cron job `mongodump` hằng ngày, đẩy ra nơi khác VPS (S3/Backblaze), vì dữ liệu nhân khẩu là dữ liệu thật của người dân.
- [ ] **Đổi mật khẩu mặc định** — mọi tài khoản mới tạo dùng slug tenant làm mật khẩu, admin từng thôn nên đổi ngay lần đăng nhập đầu.
- [ ] **`pm2 save` + `pm2 startup`** đã chạy đúng — test bằng `sudo reboot` rồi kiểm tra `pm2 list` tự khởi động lại.
- [ ] **Giới hạn SSH** — tắt đăng nhập bằng mật khẩu (`PasswordAuthentication no`), chỉ cho SSH key.
- [ ] **Theo dõi log** — `pm2 logs dlieya-api` / `pm2 logs dlieya-web`, cân nhắc `pm2 install pm2-logrotate` để log không phình ổ đĩa.
