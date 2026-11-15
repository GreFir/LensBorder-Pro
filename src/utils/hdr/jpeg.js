// JPEG/R container I/O. Pixel decoding/encoding remains in the browser.
// Format reference: https://developer.android.com/media/platform/hdr-image-format
const utf8 = new TextEncoder();
const text = new TextDecoder();
const XMP = 'http://ns.adobe.com/xap/1.0/\0';
const HDR_NS = 'http://ns.adobe.com/hdr-gain-map/1.0/';
const ISO = 'urn:iso:std:iso:ts:21496:-1';
const concat = (...parts) => {
  const out = new Uint8Array(parts.reduce((size, part) => size + part.length, 0));
  let offset = 0;
  for (const part of parts) { out.set(part, offset); offset += part.length; }
  return out;
};
const startsWith = (bytes, value) => value.split('').every((char, i) => bytes[i] === char.charCodeAt(0));
export const isJpeg = (bytes) => bytes[0] === 0xff && bytes[1] === 0xd8;

/** Walk markers, not byte-pattern matches (APP payloads and entropy may contain FF D9). */
export function readJpeg(bytes, start = 0) {
  if (bytes[start] !== 0xff || bytes[start + 1] !== 0xd8) throw new Error('无效 JPEG 文件');
  const segments = [];
  let pos = start + 2;
  let inScan = false;
  let width = 0;
  let height = 0;
  while (pos < bytes.length) {
    if (inScan && bytes[pos] !== 0xff) { pos++; continue; }
    const begin = pos;
    if (bytes[pos++] !== 0xff) throw new Error('JPEG 标记损坏');
    while (bytes[pos] === 0xff) pos++;
    const marker = bytes[pos++];
    if (inScan && (marker === 0 || (marker >= 0xd0 && marker <= 0xd7))) continue;
    if (marker === 0xd9) return { start, end: pos, segments, width, height };
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
    if (marker === 0 || marker === 0xd8 || pos + 2 > bytes.length) throw new Error('JPEG 标记损坏');
    const length = bytes[pos] * 256 + bytes[pos + 1];
    if (length < 2 || pos + length > bytes.length) throw new Error('JPEG 数据被截断');
    const segment = { marker, start: begin, end: pos + length, dataStart: pos + 2 };
    const data = bytes.subarray(segment.dataStart, segment.end);
    segments.push(segment);
    if ([0xc0, 0xc1, 0xc2].includes(marker)) {
      if (data.length < 6) throw new Error('JPEG 尺寸缺失');
      height = data[1] * 256 + data[2]; width = data[3] * 256 + data[4];
    }
    pos += length;
    inScan = marker === 0xda;
  }
  throw new Error('JPEG 缺少结束标记');
}

function payload(bytes, segment) { return bytes.subarray(segment.dataStart, segment.end); }
function hdrSegment(bytes, segment) {
  const data = payload(bytes, segment);
  return (segment.marker === 0xe2 && (startsWith(data, 'MPF\0') || startsWith(data, ISO))) ||
    (segment.marker === 0xe1 && startsWith(data, XMP) && text.decode(data).includes(HDR_NS));
}
export function extractSdrJpeg(bytes, jpeg = readJpeg(bytes)) {
  const parts = [];
  let pos = jpeg.start;
  for (const segment of jpeg.segments) {
    if (hdrSegment(bytes, segment)) {
      parts.push(bytes.subarray(pos, segment.start)); pos = segment.end;
    }
  }
  parts.push(bytes.subarray(pos, jpeg.end));
  return concat(...parts);
}

/** Read MPF TIFF offsets with bounds checks. Offsets are relative to the TIFF header. */
function readMpf(bytes, primary) {
  const segment = primary.segments.find((s) => s.marker === 0xe2 && startsWith(payload(bytes, s), 'MPF\0'));
  if (!segment) return [];
  const tiff = segment.dataStart + 4;
  const view = new DataView(bytes.buffer, bytes.byteOffset + tiff, segment.end - tiff);
  const little = view.getUint16(0) === 0x4949;
  if (!little && view.getUint16(0) !== 0x4d4d) throw new Error('无效 MPF 字节序');
  if (view.getUint16(2, little) !== 42) throw new Error('无效 MPF TIFF');
  const ifd = view.getUint32(4, little);
  const count = view.getUint16(ifd, little);
  if (count > 32) throw new Error('MPF 目录过大');
  let entries = null;
  let images = 0;
  for (let i = 0; i < count; i++) {
    const p = ifd + 2 + i * 12;
    const tag = view.getUint16(p, little);
    if (tag === 0xb001) images = view.getUint32(p + 8, little);
    if (tag === 0xb002) entries = { count: view.getUint32(p + 4, little), offset: view.getUint32(p + 8, little) };
  }
  if (!entries || images < 2 || images > 64 || entries.count !== images * 16) throw new Error('无效 MPF 图像目录');
  const result = [];
  for (let i = 1; i < images; i++) {
    const p = entries.offset + i * 16;
    const length = view.getUint32(p + 4, little);
    const start = tiff + view.getUint32(p + 8, little);
    if (start < primary.end || length < 4 || start + length > bytes.length) throw new Error('MPF 图像越界');
    const jpeg = readJpeg(bytes, start);
    if (jpeg.end !== start + length) throw new Error('MPF 图像长度不一致');
    result.push(jpeg);
  }
  return result;
}

function xmpPackets(bytes, jpeg) {
  return jpeg.segments.filter((s) => s.marker === 0xe1 && startsWith(payload(bytes, s), XMP))
    .map((s) => text.decode(payload(bytes, s).subarray(XMP.length)));
}

export function inspectJpeg(bytes) {
  const primary = readJpeg(bytes);
  const packets = xmpPackets(bytes, primary);
  const hasHdrTag = packets.some((xml) => xml.includes(HDR_NS)) || primary.segments.some((s) =>
    (s.marker === 0xe2 && startsWith(payload(bytes, s), ISO)) ||
    (s.marker === 0xe1 && text.decode(payload(bytes, s)).includes('urn:com:apple:photo:2020:aux:hdrgainmap')));
  let secondary;
  try { secondary = readMpf(bytes, primary); }
  catch (error) { return { status: 'unknown', reason: `增益图目录损坏：${error.message}`, primary }; }
  for (const jpeg of secondary) {
    const xml = xmpPackets(bytes, jpeg).find((packet) => packet.includes(HDR_NS));
    if (xml) return { status: 'hdr', primary, gainMap: jpeg, xml };
  }
  if (hasHdrTag || secondary.length) return { status: 'unknown', reason: '检测到 HDR 标记，但不是受支持的 SDR 基底 + XMP 增益图 JPEG', primary };
  return { status: 'sdr', primary };
}

function app(marker, data) {
  const length = data.length + 2;
  if (length > 65535) throw new Error('JPEG 元数据过大');
  return concat(new Uint8Array([0xff, marker, length >> 8, length & 255]), data);
}
const xmpApp = (xml) => app(0xe1, concat(utf8.encode(XMP), utf8.encode(xml)));
const xmpWrap = (body) => `<x:xmpmeta xmlns:x="adobe:ns:meta/"><rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">${body}</rdf:RDF></x:xmpmeta>`;

function mpf(primarySize, secondarySize, secondaryOffset) {
  const data = new Uint8Array(86);
  data.set(utf8.encode('MPF\0MM'));
  const v = new DataView(data.buffer, 4);
  v.setUint16(2, 42); v.setUint32(4, 8); v.setUint16(8, 3);
  // MPFVersion (UNDEFINED), NumberOfImages (LONG), MPEntry (UNDEFINED).
  v.setUint16(10, 0xb000); v.setUint16(12, 7); v.setUint32(14, 4); v.setUint32(18, 0x30313030);
  v.setUint16(22, 0xb001); v.setUint16(24, 4); v.setUint32(26, 1); v.setUint32(30, 2);
  v.setUint16(34, 0xb002); v.setUint16(36, 7); v.setUint32(38, 32); v.setUint32(42, 50);
  v.setUint32(50, 0x030000); v.setUint32(54, primarySize); v.setUint32(58, 0);
  v.setUint32(66, 0); v.setUint32(70, secondarySize); v.setUint32(74, secondaryOffset);
  return app(0xe2, data);
}

/** RGB gain coefficients share a single range/gamma; their pixel values remain RGB. */
export function packGainMap(sdr, gainMap, { min, max, capacity }) {
  if (![min, max, capacity].every(Number.isFinite) || min > 0 || max <= min || capacity <= 0 || capacity > 16) {
    throw new Error('无效增益图范围');
  }
  const base = extractSdrJpeg(sdr);
  const gm = extractSdrJpeg(gainMap);
  const secondaryXmp = xmpApp(xmpWrap(`<rdf:Description xmlns:hdrgm="${HDR_NS}" hdrgm:Version="1.0" hdrgm:BaseRenditionIsHDR="False" hdrgm:GainMapMin="${min}" hdrgm:GainMapMax="${max}" hdrgm:Gamma="1" hdrgm:OffsetSDR="0.015625" hdrgm:OffsetHDR="0.015625" hdrgm:HDRCapacityMin="0" hdrgm:HDRCapacityMax="${capacity}"/>`));
  const secondary = concat(gm.subarray(0, 2), secondaryXmp, gm.subarray(2));
  const primaryXmp = xmpApp(xmpWrap(`<rdf:Description xmlns:hdrgm="${HDR_NS}" hdrgm:Version="1.0" xmlns:Container="http://ns.google.com/photos/1.0/container/" xmlns:Item="http://ns.google.com/photos/1.0/container/item/"><Container:Directory><rdf:Seq><rdf:li rdf:parseType="Resource"><Container:Item Item:Semantic="Primary" Item:Mime="image/jpeg"/></rdf:li><rdf:li rdf:parseType="Resource"><Container:Item Item:Semantic="GainMap" Item:Mime="image/jpeg" Item:Length="${secondary.length}"/></rdf:li></rdf:Seq></Container:Directory></rdf:Description>`));
  const mpfLength = 90;
  const primarySize = base.length + primaryXmp.length + mpfLength;
  const tiffOffset = 2 + primaryXmp.length + 8;
  return concat(base.subarray(0, 2), primaryXmp, mpf(primarySize, secondary.length, primarySize - tiffOffset), base.subarray(2), secondary);
}

/** Neutralize EXIF orientation before reconstruction; apply it once to both planes. */
export function normalizeOrientation(input) {
  const bytes = input.slice();
  let orientation = 1;
  const jpeg = readJpeg(bytes);
  for (const s of jpeg.segments) {
    const data = payload(bytes, s);
    if (s.marker !== 0xe1 || !startsWith(data, 'Exif\0\0')) continue;
    const v = new DataView(data.buffer, data.byteOffset + 6, data.length - 6);
    const le = v.getUint16(0) === 0x4949;
    if ((!le && v.getUint16(0) !== 0x4d4d) || v.getUint16(2, le) !== 42) throw new Error('EXIF 损坏');
    const ifd = v.getUint32(4, le);
    const count = v.getUint16(ifd, le);
    if (count > 1024) throw new Error('EXIF 目录过大');
    for (let i = 0; i < count; i++) {
      const p = ifd + 2 + i * 12;
      if (v.getUint16(p, le) === 0x112) {
        if (v.getUint16(p + 2, le) !== 3 || v.getUint32(p + 4, le) !== 1) throw new Error('EXIF 方向无效');
        orientation = v.getUint16(p + 8, le);
        if (orientation < 1 || orientation > 8) throw new Error('EXIF 方向无效');
        v.setUint16(p + 8, 1, le);
      }
    }
  }
  return { bytes, orientation };
}

export function stripGainMapProfile(bytes) {
  const jpeg = readJpeg(bytes);
  const parts = [];
  let pos = 0;
  for (const s of jpeg.segments) {
    if (s.marker === 0xe2 && startsWith(payload(bytes, s), 'ICC_PROFILE\0')) {
      parts.push(bytes.subarray(pos, s.start)); pos = s.end;
    }
  }
  parts.push(bytes.subarray(pos, jpeg.end));
  return normalizeOrientation(concat(...parts)).bytes;
}

/** Accept only the two color encodings Canvas can reconstruct without a gamut guess. */
export function jpegColorSpace(bytes, jpeg = readJpeg(bytes)) {
  const chunks = jpeg.segments.filter((s) => s.marker === 0xe2 && startsWith(payload(bytes, s), 'ICC_PROFILE\0'))
    .map((s) => payload(bytes, s));
  if (!chunks.length) return 'srgb';
  chunks.sort((a, b) => a[12] - b[12]);
  if (chunks.some((c, i) => c.length < 14 || c[12] !== i + 1 || c[13] !== chunks.length)) throw new Error('ICC 配置不完整');
  const icc = concat(...chunks.map((c) => c.subarray(14)));
  if (icc.length < 132 || icc.length > 4 * 1024 * 1024 || text.decode(icc.subarray(16, 24)) !== 'RGB XYZ ') {
    throw new Error('暂不支持该 HDR 色彩配置');
  }
  const v = new DataView(icc.buffer);
  if (v.getUint32(0) !== icc.length || text.decode(icc.subarray(36, 40)) !== 'acsp') throw new Error('ICC 配置无效');
  const count = v.getUint32(128);
  if (count > 128 || 132 + count * 12 > icc.length) throw new Error('ICC 标签无效');
  const tags = new Map();
  for (let i = 0; i < count; i++) {
    const p = 132 + i * 12;
    const start = v.getUint32(p + 4); const size = v.getUint32(p + 8);
    if (start + size > icc.length || size < 8) throw new Error('ICC 标签越界');
    tags.set(text.decode(icc.subarray(p, p + 4)), { start, size });
  }
  const fixed = (p) => v.getInt32(p) / 65536;
  const xyz = ['rXYZ', 'gXYZ', 'bXYZ'].flatMap((key) => {
    const tag = tags.get(key);
    if (!tag || tag.size < 20 || text.decode(icc.subarray(tag.start, tag.start + 4)) !== 'XYZ ') throw new Error('不支持非矩阵 ICC 配置');
    return [fixed(tag.start + 8), fixed(tag.start + 12), fixed(tag.start + 16)];
  });
  const primaries = {
    srgb: [.4360747, .2225045, .0139322, .3850649, .7168786, .0971045, .1430804, .0606169, .7141733],
    'display-p3': [.515102, .241182, -.001049, .291965, .692236, .041882, .157153, .066582, .784378],
  };
  const space = Object.keys(primaries).find((key) => xyz.every((x, i) => Math.abs(x - primaries[key][i]) < .003));
  if (!space) throw new Error('HDR 目前仅支持 sRGB / Display P3 配置');
  for (const channel of ['rTRC', 'gTRC', 'bTRC']) {
    const tag = tags.get(channel);
    if (!tag) throw new Error('ICC 缺少传递函数');
    const p = tag.start;
    const signature = text.decode(icc.subarray(p, p + 4));
    let curve;
    if (signature === 'para') {
      const type = v.getUint16(p + 8);
      const lengths = [16, 24, 28, 32, 40];
      if (type > 4 || tag.size < lengths[type]) throw new Error('ICC 传递函数无效');
      const g = fixed(p + 12);
      const a = type ? fixed(p + 16) : 1;
      const b = type ? fixed(p + 20) : 0;
      const c = type >= 2 ? fixed(p + 24) : 0;
      const d = type >= 3 ? fixed(p + 28) : -b / a;
      const e = type === 4 ? fixed(p + 32) : 0;
      const f = type === 4 ? fixed(p + 36) : 0;
      curve = (x) => type === 0 ? x ** g : type <= 2 ? (x >= d ? (a * x + b) ** g : 0) + c :
        x >= d ? (a * x + b) ** g + e : c * x + f;
    } else if (signature === 'curv') {
      const n = v.getUint32(p + 8);
      if (tag.size < 12 + n * 2) throw new Error('ICC 曲线被截断');
      curve = (x) => {
        if (!n) return x;
        if (n === 1) return x ** (v.getUint16(p + 12) / 256);
        const at = x * (n - 1); const lo = Math.floor(at); const hi = Math.min(n - 1, lo + 1);
        return (v.getUint16(p + 12 + lo * 2) * (1 - at + lo) + v.getUint16(p + 12 + hi * 2) * (at - lo)) / 65535;
      };
    } else throw new Error('不支持该 ICC 传递函数');
    for (const x of [.01, .04, .1, .25, .5, .75, 1]) {
      const expected = x <= .04045 ? x / 12.92 : ((x + .055) / 1.055) ** 2.4;
      if (!Number.isFinite(curve(x)) || Math.abs(curve(x) - expected) > .001) throw new Error('HDR 需要 sRGB 传递函数');
    }
  }
  return space;
}
