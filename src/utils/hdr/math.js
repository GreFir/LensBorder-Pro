export const OFFSET = 1 / 64;
// Signed extended sRGB transfer functions also retain out-of-gamut P3 components.
export const srgbToLinear = (v) => Math.abs(v) <= .04045 ? v / 12.92 : Math.sign(v) * ((Math.abs(v) + .055) / 1.055) ** 2.4;
export const linearToSrgb = (v) => Math.abs(v) <= .0031308 ? v * 12.92 : Math.sign(v) * (1.055 * Math.abs(v) ** (1 / 2.4) - .055);
export const recoverLinear = (sdr, gain, channel, metadata) => Math.max(0,
  (sdr + metadata.offsetSdr[channel]) * 2 ** (metadata.min[channel] +
    (metadata.max[channel] - metadata.min[channel]) * gain ** (1 / metadata.gamma[channel])) - metadata.offsetHdr[channel]);
export const logGain = (sdr, hdr) => Math.log2((Math.max(0, hdr) + OFFSET) / (Math.max(0, sdr) + OFFSET));
export const encodeGain = (gain, min, max) => Math.round(255 * Math.max(0, Math.min(1, (gain - min) / (max - min))));

// D65 sRGB / Display P3 primary conversion, in linear light. Keep extended and
// negative components: clamping here would destroy HDR or wide-gamut colors.
export function convertLinearRgb(rgb, from, to) {
  if (from === to) return rgb;
  const [r, g, b] = rgb;
  if (from === 'display-p3' && to === 'srgb') {
    rgb[0] = 1.2249401762805598 * r - 0.22494017628055987 * g;
    rgb[1] = -0.04205695470968818 * r + 1.0420569547096883 * g;
    rgb[2] = -0.019637554590334432 * r - 0.07863604555063182 * g + 1.0982736001409663 * b;
  } else if (from === 'srgb' && to === 'display-p3') {
    rgb[0] = 0.8224619687143624 * r + 0.1775380312856376 * g;
    rgb[1] = 0.03319419885096167 * r + 0.9668058011490384 * g;
    rgb[2] = 0.017082630721120037 * r + 0.07239744066396346 * g + 0.9105199286149165 * b;
  } else throw new Error('不支持的 HDR 工作色彩空间');
  return rgb;
}

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
