import { extractSdrJpeg, inspectJpeg, normalizeOrientation, packGainMap, stripGainMapProfile } from './jpeg.js';
import { encodeGain, linearToSrgb, logGain, recoverLinear, srgbToLinear } from './math.js';

const TILE_ROWS = 128;
const MAX_PIXELS = 48_000_000;
const MAX_DIMENSION = 16384;
const yieldToUI = () => new Promise((resolve) => setTimeout(resolve, 0));
export const releaseCanvas = (canvas) => { if (canvas) { canvas.width = 1; canvas.height = 1; } };
export function assertSize(width, height) {
  if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height) || width <= 0 || height <= 0 ||
    width > MAX_DIMENSION || height > MAX_DIMENSION || width * height > MAX_PIXELS) {
    throw new Error('HDR 图像过大：单边最多 16384 像素、总像素最多 4800 万，请先缩小原图');
  }
}
export function makeCanvas(width, height, colorSpace = 'srgb', hdr = false) {
  assertSize(width, height);
  if (hdr && typeof globalThis.Float16Array === 'undefined') throw new Error('当前浏览器 / WebView 不支持 HDR 浮点处理，请更新或选择 SDR');
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  const ctx = canvas.getContext('2d', { colorSpace, colorType: hdr ? 'float16' : 'unorm8', willReadFrequently: true });
  if (!ctx || ctx.getContextAttributes?.().colorSpace !== colorSpace || (hdr && ctx.getContextAttributes?.().colorType !== 'float16')) {
    releaseCanvas(canvas);
    throw new Error('当前运行环境不能保留所需的 HDR 像素 / 色彩空间，请更新或选择 SDR');
  }
  return canvas;
}

export async function jpegBlob(canvas, quality) {
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
  if (!blob || blob.type !== 'image/jpeg') throw new Error('JPEG 编码失败');
  return blob;
}
export async function loadBitmap(blob) {
  const url = URL.createObjectURL(blob);
  const image = new Image();
  try { image.src = url; await image.decode(); return image; }
  catch { throw new Error('JPEG 图像解码失败'); }
  finally { URL.revokeObjectURL(url); }
}

export function orientCanvas(source, orientation, colorSpace) {
  if (orientation === 1) return source;
  const swap = orientation >= 5;
  const out = makeCanvas(swap ? source.height : source.width, swap ? source.width : source.height, colorSpace, true);
  const w = source.width; const h = source.height;
  const matrices = { 2: [-1, 0, 0, 1, w, 0], 3: [-1, 0, 0, -1, w, h], 4: [1, 0, 0, -1, 0, h],
    5: [0, 1, 1, 0, 0, 0], 6: [0, 1, -1, 0, h, 0], 7: [0, -1, -1, 0, h, w], 8: [0, -1, 1, 0, 0, w] };
  const ctx = out.getContext('2d');
  ctx.setTransform(...matrices[orientation]); ctx.drawImage(source, 0, 0);
  releaseCanvas(source);
  return out;
}

/** Reconstruct full HDR explicitly, independent of the screen's HDR headroom. */
export async function reconstructSource(source) {
  const bytes = new Uint8Array(await source.file.arrayBuffer());
  const info = inspectJpeg(bytes);
  if (info.status !== 'hdr') throw new Error('原始 HDR 增益图不可用');
  assertSize(info.primary.width, info.primary.height);
  assertSize(info.gainMap.width, info.gainMap.height);
  const baseBytes = normalizeOrientation(extractSdrJpeg(bytes, info.primary)).bytes;
  const gainBytes = stripGainMapProfile(bytes.subarray(info.gainMap.start, info.gainMap.end));
  const [base, gain] = await Promise.all([loadBitmap(new Blob([baseBytes], { type: 'image/jpeg' })), loadBitmap(new Blob([gainBytes], { type: 'image/jpeg' }))]);
  const width = base.width; const height = base.height;
  const space = source.colorSpace;
  const baseCanvas = makeCanvas(width, height, space);
  const gainCanvas = makeCanvas(width, height);
  let out;
  try {
    out = makeCanvas(width, height, space, true);
    const bctx = baseCanvas.getContext('2d'); const gctx = gainCanvas.getContext('2d'); const octx = out.getContext('2d');
    bctx.drawImage(base, 0, 0);
    gctx.drawImage(gain, 0, 0, width, height);
    for (let y = 0; y < height; y += TILE_ROWS) {
      const rows = Math.min(TILE_ROWS, height - y);
      const b = bctx.getImageData(0, y, width, rows, { colorSpace: space }).data;
      const g = gctx.getImageData(0, y, width, rows).data;
      const pixels = new globalThis.Float16Array(b.length);
      for (let i = 0; i < b.length; i += 4) {
        for (let c = 0; c < 3; c++) {
          pixels[i + c] = linearToSrgb(recoverLinear(srgbToLinear(b[i + c] / 255), g[i + c] / 255, c, source.metadata));
          if (!Number.isFinite(pixels[i + c])) throw new Error('HDR 像素超出浮点范围');
        }
        pixels[i + 3] = 1;
      }
      octx.putImageData(new ImageData(pixels, width, rows, { colorSpace: space, pixelFormat: 'rgba-float16' }), 0, y);
      await yieldToUI();
    }
    return orientCanvas(out, source.orientation, space);
  } catch (error) { releaseCanvas(out); throw error; }
  finally { releaseCanvas(baseCanvas); releaseCanvas(gainCanvas); base.src = ''; gain.src = ''; }
}

// Keep this list aligned with canvasUtils.js. A regression test enforces equality.
// Pre-rotate here because its legacy rotation scratch canvas is 8-bit SDR.
export const RIGHT_TEXT_TEMPLATES = new Set(['classic', 'postcard', 'postcard-note', 'gallery', 'cinema', 'noir', 'airy', 'mono', 'caption', 'borderline', 'editorial', 'museum', 'floating', 'atelier', 'monolith', 'folio', 'lagoon']);

/** Reuses every existing template, including crop, blur, masks, text and overlays. */
export function renderPhotoFrame(renderFrame, image, config, meta, space, hdr) {
  let rotated;
  let out;
  let drawImage = image;
  let drawConfig = config;
  const probe = makeCanvas(1, 1, space);
  try {
    if (config.textPosition === 'right' && RIGHT_TEXT_TEMPLATES.has(config.template)) {
      rotated = makeCanvas(image.height, image.width, space, hdr);
      const rctx = rotated.getContext('2d');
      rctx.translate(rotated.width / 2, rotated.height / 2); rctx.rotate(Math.PI / 2);
      rctx.drawImage(image, -image.width / 2, -image.height / 2);
      drawImage = rotated; drawConfig = { ...config, textPosition: 'bottom' };
    }
    // Run layout against a 1px scratch surface, recording sizes without allocating them.
    const dimensions = { width: 1, height: 1 };
    const ctx = probe.getContext('2d');
    const measure = new Proxy(ctx, { get(target, key) {
      if (key === 'canvas') return dimensions;
      const value = Reflect.get(target, key, target);
      return typeof value === 'function' ? value.bind(target) : value;
    }, set(target, key, value) { return Reflect.set(target, key, value, target); } });
    renderFrame(measure, drawImage, drawConfig, meta, { scale: 1, preview: false });
    out = makeCanvas(dimensions.width, dimensions.height, space, hdr);
    renderFrame(out.getContext('2d'), drawImage, drawConfig, meta, { scale: 1, preview: false });
    return out;
  } catch (error) { releaseCanvas(out); throw error; }
  finally { releaseCanvas(probe); releaseCanvas(rotated); }
}

/** Encode the finished image, not an intermediate TIFF/EXR. */
export async function encodeHdrJpeg(renderFrame, image, config, meta, source, quality) {
  let sdrFrame; let hdrSource; let hdrFrame; let reference; let gainCanvas;
  const space = source.colorSpace;
  try {
    // Check float storage with actual >1 values; successful getContext alone is insufficient.
    const test = makeCanvas(1, 1, space, true);
    try {
      const ctx = test.getContext('2d');
      ctx.putImageData(new ImageData(new globalThis.Float16Array([2, 2, 2, 1]), 1, 1, { colorSpace: space, pixelFormat: 'rgba-float16' }), 0, 0);
      if (ctx.getImageData(0, 0, 1, 1, { colorSpace: space, pixelFormat: 'rgba-float16' }).data[0] < 1.9) throw new Error('当前运行环境会裁掉 HDR 高光，请选择 SDR');
    } finally { releaseCanvas(test); }
    if (document.fonts?.ready) await document.fonts.ready;
    hdrSource = await reconstructSource(source);
    // No await between the two renders: async overlay-cache events cannot make them disagree.
    hdrFrame = renderPhotoFrame(renderFrame, hdrSource, config, meta, space, true);
    releaseCanvas(hdrSource); hdrSource = null;
    sdrFrame = renderPhotoFrame(renderFrame, image, config, meta, space, false);
    const width = sdrFrame.width; const height = sdrFrame.height;
    if (hdrFrame.width !== width || hdrFrame.height !== height) throw new Error('HDR / SDR 图层尺寸不一致');
    const sdr = await jpegBlob(sdrFrame, quality);
    releaseCanvas(sdrFrame); sdrFrame = null;
    // Base gains on the JPEG that is actually shipped, not its pre-compression pixels.
    const decodedBase = await loadBitmap(sdr);
    reference = makeCanvas(width, height, space);
    const sctx = reference.getContext('2d'); sctx.drawImage(decodedBase, 0, 0); decodedBase.src = '';
    const hctx = hdrFrame.getContext('2d');
    let min = 0; let max = 0.0001;
    const readTile = (y, rows) => ({
      s: sctx.getImageData(0, y, width, rows, { colorSpace: space }).data,
      h: hctx.getImageData(0, y, width, rows, { colorSpace: space, pixelFormat: 'rgba-float16' }).data,
    });
    for (let y = 0; y < height; y += TILE_ROWS) {
      const { s, h } = readTile(y, Math.min(TILE_ROWS, height - y));
      for (let i = 0; i < s.length; i += 4) for (let c = 0; c < 3; c++) {
        const gain = logGain(srgbToLinear(s[i + c] / 255), srgbToLinear(h[i + c]));
        if (!Number.isFinite(gain) || Math.abs(gain) > 16) throw new Error('合成后的 HDR 亮度超出支持范围');
        min = Math.min(min, gain); max = Math.max(max, gain);
      }
      await yieldToUI();
    }
    gainCanvas = makeCanvas(width, height);
    const gctx = gainCanvas.getContext('2d');
    for (let y = 0; y < height; y += TILE_ROWS) {
      const rows = Math.min(TILE_ROWS, height - y);
      const { s, h } = readTile(y, rows);
      const pixels = new Uint8ClampedArray(s.length);
      for (let i = 0; i < s.length; i += 4) {
        for (let c = 0; c < 3; c++) pixels[i + c] = encodeGain(logGain(srgbToLinear(s[i + c] / 255), srgbToLinear(h[i + c])), min, max);
        pixels[i + 3] = 255;
      }
      gctx.putImageData(new ImageData(pixels, width, rows), 0, y);
      await yieldToUI();
    }
    const gain = await jpegBlob(gainCanvas, 1);
    const output = packGainMap(new Uint8Array(await sdr.arrayBuffer()), new Uint8Array(await gain.arrayBuffer()), { min, max, capacity: source.metadata.capacityMax });
    return new Blob([output], { type: 'image/jpeg' });
  } finally {
    for (const canvas of [sdrFrame, hdrSource, hdrFrame, reference, gainCanvas]) releaseCanvas(canvas);
  }
}
