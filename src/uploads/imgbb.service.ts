import { Injectable, InternalServerErrorException } from '@nestjs/common';

const IMGBB_UPLOAD_URL = 'https://api.imgbb.com/1/upload';

// Lưu ảnh qua imgbb.com thay vì tự host (Nextcloud) — đơn giản hơn nhiều
// (1 lệnh POST, không cần MKCOL/share link/dọn rác thủ công), imgbb tự lo
// lưu trữ + CDN. Trả thẳng URL ảnh gốc (data.url), dùng được ngay trong
// <img src>.
@Injectable()
export class ImgbbService {
  private readonly apiKey = process.env.IMGBB_API_KEY;

  async upload(buffer: Buffer, mimeType: string, fileName: string): Promise<string> {
    if (!this.apiKey) {
      throw new InternalServerErrorException('Chưa cấu hình IMGBB_API_KEY trong .env.');
    }

    const form = new FormData();
    // Buffer's ArrayBufferLike generic doesn't satisfy DOM lib's strict
    // BlobPart type (TS definition gap, not a real runtime mismatch — same
    // as the earlier fetch-body cast elsewhere in this codebase).
    form.append('image', new Blob([buffer as unknown as BlobPart], { type: mimeType }), fileName);

    const res = await fetch(`${IMGBB_UPLOAD_URL}?key=${this.apiKey}`, {
      method: 'POST',
      body: form,
    });
    const data = (await res.json().catch(() => ({}))) as {
      success?: boolean;
      data?: { url?: string };
      error?: { message?: string };
    };
    if (!res.ok || !data.success || !data.data?.url) {
      throw new InternalServerErrorException(
        `Tải ảnh lên imgbb thất bại${data.error?.message ? `: ${data.error.message}` : ` (status ${res.status})`}.`,
      );
    }
    return data.data.url;
  }
}
