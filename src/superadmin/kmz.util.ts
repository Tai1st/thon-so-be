import AdmZip from 'adm-zip';

export interface ParsedVillage {
  name: string;
  slugSuggestion: string;
  lat: number;
  lng: number;
  boundary: { type: 'Polygon'; coordinates: number[][][] };
}

// KMZ chỉ là file KML nén zip (Google Earth/Google My Maps export ranh
// giới xã, mỗi Placemark ứng với 1 thôn) — không cần parser XML đầy đủ,
// chỉ cần lấy tên + khối <coordinates> của polygon trong từng Placemark.
function extractKmlText(buffer: Buffer): string {
  try {
    const zip = new AdmZip(buffer);
    const kmlEntry = zip.getEntries().find((e) => e.entryName.toLowerCase().endsWith('.kml'));
    if (kmlEntry) return kmlEntry.getData().toString('utf8');
  } catch {
    // Không phải file zip hợp lệ — có thể người dùng tải thẳng .kml (không nén)
  }
  return buffer.toString('utf8');
}

function parseCoordinatesBlock(raw: string): number[][] {
  return raw
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((tuple) => {
      const [lng, lat] = tuple.split(',').map(Number);
      return [lng, lat];
    })
    .filter(([lng, lat]) => Number.isFinite(lng) && Number.isFinite(lat));
}

// Bỏ dấu tiếng Việt + chuẩn hóa thành slug (vd "Thôn Đoàn Kết" -> "thon-doan-ket").
function toSlug(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function closeRing(ring: number[][]): number[][] {
  const [firstLng, firstLat] = ring[0];
  const [lastLng, lastLat] = ring[ring.length - 1];
  return firstLng === lastLng && firstLat === lastLat ? ring : [...ring, ring[0]];
}

export function parseKmzVillages(buffer: Buffer): ParsedVillage[] {
  const kml = extractKmlText(buffer);
  const placemarkBlocks = [...kml.matchAll(/<Placemark[\s\S]*?<\/Placemark>/gi)].map((m) => m[0]);

  if (!placemarkBlocks.length) {
    throw new Error('Không tìm thấy Placemark nào trong file KML/KMZ.');
  }

  const villages: ParsedVillage[] = [];
  let unnamedCounter = 0;

  for (const block of placemarkBlocks) {
    const coordMatches = [...block.matchAll(/<coordinates>([\s\S]*?)<\/coordinates>/gi)].map((m) =>
      parseCoordinatesBlock(m[1]),
    );
    if (!coordMatches.length) continue;

    // Placemark điểm mốc/nhãn chỉ có 1-2 tọa độ — bỏ qua, chỉ giữ polygon thật.
    const ring = coordMatches.reduce((a, b) => (b.length > a.length ? b : a));
    if (ring.length < 3) continue;

    const nameMatch = block.match(/<name>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/name>/i);
    const name = nameMatch ? nameMatch[1].trim() : `Khu vực ${++unnamedCounter}`;

    const closedRing = closeRing(ring);
    const lat = ring.reduce((sum, [, y]) => sum + y, 0) / ring.length;
    const lng = ring.reduce((sum, [x]) => sum + x, 0) / ring.length;

    villages.push({
      name,
      slugSuggestion: toSlug(name),
      lat,
      lng,
      boundary: { type: 'Polygon', coordinates: [closedRing] },
    });
  }

  if (!villages.length) {
    throw new Error('Không tìm thấy polygon ranh giới nào (chỉ thấy điểm mốc/nhãn) trong file KML/KMZ.');
  }

  return villages;
}
