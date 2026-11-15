import { extractSdrJpeg, inspectJpeg, isJpeg, jpegColorSpace, normalizeOrientation } from './jpeg.js';
import { parseGainMapXmp } from './math.js';

const sources = new WeakMap();
const MAX_FILE_BYTES = 128 * 1024 * 1024;
export const rememberPhotoSource = (image, source) => sources.set(image, source);
export const photoSource = (image) => sources.get(image);

function otherImageStatus(bytes) {
  const text = new TextDecoder('latin1').decode(bytes.subarray(0, 32));
  if (text.slice(4, 8) === 'ftyp') return { status: 'unknown', reason: 'HEIC / AVIF 的 HDR 暂不支持保留，请转换为带 XMP 增益图的 JPEG，或明确选择 SDR 导出' };
  if (bytes[0] === 137 && text.slice(1, 4) === 'PNG') {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    let p = 8;
    while (p + 12 <= bytes.length) {
      const size = view.getUint32(p);
      if (p + 12 + size > bytes.length) return { status: 'unknown', reason: 'PNG 文件被截断，无法确认动态范围' };
      const type = new TextDecoder().decode(bytes.subarray(p + 4, p + 8));
      if (type === 'cICP' && size >= 4 && [16, 18].includes(bytes[p + 9])) return { status: 'unknown', reason: '检测到 PQ / HLG PNG，当前 HDR 导出仅支持 JPEG 增益图' };
      if (type === 'IEND') break;
      p += size + 12;
    }
    return { status: 'sdr' }; // A 16-bit PNG alone is not HDR.
  }
  if (text.startsWith('GIF8') || text.startsWith('BM') || (text.startsWith('RIFF') && text.slice(8, 12) === 'WEBP')) return { status: 'sdr' };
  return { status: 'unknown', reason: '尚不能确认该格式的 HDR 数据，请明确选择 SDR 导出' };
}

/** Inspect original bytes BEFORE any HEIC conversion; keep the original File for export. */
export async function preparePhotoSource(file) {
  if (file.size > MAX_FILE_BYTES) return { file, status: 'unknown', reason: '原图超过 128 MiB，未进行 HDR 检测；请明确选择 SDR 导出' };
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!isJpeg(bytes)) return { file, ...otherImageStatus(bytes) };
  try {
    const info = inspectJpeg(bytes);
    const previewBlob = new Blob([extractSdrJpeg(bytes, info.primary)], { type: 'image/jpeg' });
    if (info.status !== 'hdr') return { file, status: info.status, reason: info.reason, previewBlob };
    const metadata = parseGainMapXmp(info.xml);
    const colorSpace = jpegColorSpace(bytes, info.primary);
    const { orientation } = normalizeOrientation(bytes.subarray(0, info.primary.end));
    return { file, status: 'hdr', metadata, colorSpace, orientation, previewBlob };
  } catch (error) {
    return { file, status: 'unknown', reason: `HDR 检测未通过：${error.message}。请明确选择 SDR 导出` };
  }
}
