export const OFFSET = 1 / 64;
export const srgbToLinear = (v) => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4;
export const linearToSrgb = (v) => v <= .0031308 ? v * 12.92 : 1.055 * v ** (1 / 2.4) - .055;
export const recoverLinear = (sdr, gain, channel, metadata) => Math.max(0,
  (sdr + metadata.offsetSdr[channel]) * 2 ** (metadata.min[channel] +
    (metadata.max[channel] - metadata.min[channel]) * gain ** (1 / metadata.gamma[channel])) - metadata.offsetHdr[channel]);
export const logGain = (sdr, hdr) => Math.log2((Math.max(0, hdr) + OFFSET) / (Math.max(0, sdr) + OFFSET));
export const encodeGain = (gain, min, max) => Math.round(255 * Math.max(0, Math.min(1, (gain - min) / (max - min))));

export function resolveExportMode(mode, source) {
  if (!['auto', 'sdr', 'hdr'].includes(mode)) throw new Error('无效导出模式');
  if (mode === 'sdr') return 'sdr';
  if (!source || source.status === 'unknown') throw new Error(source?.reason || '无法确认原图动态范围，请明确选择 SDR 导出');
  if (source.status === 'hdr') return 'hdr';
  if (mode === 'hdr') throw new Error('原图没有受支持的 HDR 数据；不会将 SDR 伪装成 HDR，请选择自动或 SDR');
  return 'sdr';
}

export function validateMetadata(m) {
  for (const key of ['min', 'max', 'gamma', 'offsetSdr', 'offsetHdr']) {
    if (!Array.isArray(m[key]) || m[key].length !== 3 || !m[key].every(Number.isFinite)) throw new Error(`无效 HDR 参数：${key}`);
  }
  for (let c = 0; c < 3; c++) {
    if (m.min[c] < -16 || m.max[c] > 16 || m.max[c] < m.min[c] || m.gamma[c] <= 0 || m.gamma[c] > 16 ||
      m.offsetSdr[c] < 0 || m.offsetSdr[c] > 1 || m.offsetHdr[c] < 0 || m.offsetHdr[c] > 1) throw new Error('HDR 参数超出支持范围');
  }
  if (!Number.isFinite(m.capacityMin) || !Number.isFinite(m.capacityMax) || m.capacityMin < 0 ||
    m.capacityMax <= m.capacityMin || m.capacityMax > 16) throw new Error('HDR 亮度范围无效');
  return m;
}

export function parseGainMapXmp(xml) {
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  if (doc.querySelector('parsererror') || doc.doctype) throw new Error('增益图 XMP 无效');
  const ns = 'http://ns.adobe.com/hdr-gain-map/1.0/';
  const rdf = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#';
  const read = (key, fallback) => {
    for (const node of doc.getElementsByTagName('*')) {
      if (node.hasAttributeNS(ns, key)) return node.getAttributeNS(ns, key).trim();
    }
    const node = doc.getElementsByTagNameNS(ns, key)[0];
    if (!node) return fallback;
    const items = Array.from(node.getElementsByTagNameNS(rdf, 'li'));
    return items.length ? items.map((item) => item.textContent.trim()) : node.textContent.trim();
  };
  const version = read('Version', '');
  if (!['1', '1.0'].includes(version)) throw new Error('暂不支持该增益图版本');
  const hdrBase = read('BaseRenditionIsHDR', 'False');
  if (!['false', '0'].includes(String(hdrBase).toLowerCase())) throw new Error('暂不支持 HDR 基底的增益图');
  const vector = (key, fallback) => {
    const raw = read(key, String(fallback));
    const list = (Array.isArray(raw) ? raw : [raw]);
    if (list.some((v) => v === '')) throw new Error(`HDR 参数为空：${key}`);
    const values = list.map(Number);
    return values.length === 1 ? [values[0], values[0], values[0]] : values;
  };
  return validateMetadata({
    min: vector('GainMapMin', 0), max: vector('GainMapMax', 1), gamma: vector('Gamma', 1),
    offsetSdr: vector('OffsetSDR', OFFSET), offsetHdr: vector('OffsetHDR', OFFSET),
    capacityMin: Number(read('HDRCapacityMin', '0')), capacityMax: Number(read('HDRCapacityMax', '1')),
  });
}
