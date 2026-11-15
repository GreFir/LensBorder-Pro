import { useRef, useState } from 'react';
import { renderFrame } from '../utils/canvasUtils';
import { encodeHdrJpeg, jpegBlob, releaseCanvas } from '../utils/hdr/canvas.js';
import { resolveExportMode } from '../utils/hdr/math.js';
import { photoSource } from '../utils/hdr/source.js';

// eslint-disable-next-line no-control-regex -- sanitize platform-invalid filename characters.
const safeName = (name) => (name || 'lensborder').replace(/\.[^.]+$/, '').replace(/[<>:"/\\|?*\x00-\x1f]/g, '_').slice(0, 80) || 'lensborder';
const outputName = (name, mode) => `${safeName(name)}_border${mode === 'hdr' ? '_hdr' : ''}.jpg`;

function download(blob, name) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url; link.download = name;
  document.body.appendChild(link); link.click(); link.remove();
  // Do not revoke synchronously: native WebViews may not have consumed the URL yet.
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

async function selectFile(name) {
  if (typeof window.showSaveFilePicker !== 'function') return null;
  try {
    return await window.showSaveFilePicker({ suggestedName: name,
      types: [{ description: 'JPEG image (SDR / HDR gain map)', accept: { 'image/jpeg': ['.jpg', '.jpeg'] } }],
    });
  } catch (error) {
    if (['SecurityError', 'NotSupportedError'].includes(error?.name)) return null;
    throw error;
  }
}
async function selectDirectory() {
  if (typeof window.showDirectoryPicker !== 'function') return null;
  try { return await window.showDirectoryPicker({ mode: 'readwrite' }); }
  catch (error) {
    if (['SecurityError', 'NotSupportedError'].includes(error?.name)) return null;
    throw error;
  }
}
async function writeBlob(handle, blob) {
  const stream = await handle.createWritable();
  try { await stream.write(blob); await stream.close(); }
  catch (error) { await stream.abort().catch(() => {}); throw error; }
}
async function availableName(directory, name, used) {
  const stem = name.replace(/\.jpg$/, '');
  for (let i = 0; i < 10_000; i++) {
    const candidate = `${stem}${i ? `_${i + 1}` : ''}.jpg`;
    if (used.has(candidate)) continue;
    if (directory) {
      try { await directory.getFileHandle(candidate); continue; }
      catch (error) { if (error?.name !== 'NotFoundError') throw error; }
    }
    used.add(candidate); return candidate;
  }
  throw new Error('同名文件过多，请更换导出目录');
}

async function renderEntry(entry, mode, quality) {
  if (mode === 'hdr') return encodeHdrJpeg(renderFrame, entry.image, entry.config, entry.meta, photoSource(entry.image), quality);
  // Keep the existing SDR renderer and quality behavior.
  const canvas = document.createElement('canvas');
  try {
    const ctx = canvas.getContext('2d', { colorSpace: 'srgb' }) || canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 不可用');
    if (document.fonts?.ready) await document.fonts.ready;
    renderFrame(ctx, entry.image, entry.config, entry.meta, { scale: 1, preview: false });
    return await jpegBlob(canvas, quality);
  } finally { releaseCanvas(canvas); }
}
const snapshot = (entry) => ({ ...entry, config: typeof structuredClone === 'function' ? structuredClone(entry.config) : JSON.parse(JSON.stringify(entry.config)), meta: { ...entry.meta } });

/** One shared export policy for current and batch exports; mode is not a photo style. */
export default function usePhotoExport({ images, currentImageId, image, imageInfo, config, meta, quality }) {
  const [mode, setMode] = useState('auto');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState(false);
  const running = useRef(false);
  const current = () => ({ id: currentImageId, name: imageInfo?.name, image, config, meta });
  const begin = () => {
    if (running.current) return false;
    running.current = true; setBusy(true); setError(false); setStatus('正在准备导出…'); return true;
  };
  const finish = () => { running.current = false; setBusy(false); };

  const exportCurrent = async () => {
    if (!image || !begin()) return;
    try {
      const entry = snapshot(current());
      const resolved = resolveExportMode(mode, photoSource(entry.image));
      const name = outputName(entry.name, resolved);
      // Invoke the picker in the click task, before expensive encoding loses user activation.
      const handle = await selectFile(name);
      setStatus(`正在生成 ${resolved === 'hdr' ? 'HDR 增益图' : 'SDR'} JPEG…`);
      const blob = await renderEntry(entry, resolved, quality);
      if (handle) await writeBlob(handle, blob); else download(blob, name);
      setStatus(`${handle ? '已保存' : '已生成并请求下载'}：${name}`);
    } catch (e) {
      if (e?.name === 'AbortError') setStatus('已取消导出');
      else { setError(true); setStatus(`导出失败：${e.message}`); }
    } finally { finish(); }
  };

  const exportAll = async () => {
    if (!images.length || !begin()) return;
    try {
      // Capture current edits synchronously; React's pending setImages is not a snapshot.
      const entries = images.map((entry) => snapshot(entry.id === currentImageId ? { ...entry, ...current() } : entry));
      const selectedMode = mode; const selectedQuality = quality;
      const directory = await selectDirectory();
      const failures = []; const used = new Set(); let count = 0;
      for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];
        setStatus(`正在导出 ${i + 1} / ${entries.length}：${entry.name}`);
        try {
          const resolved = resolveExportMode(selectedMode, photoSource(entry.image));
          const name = await availableName(directory, outputName(entry.name, resolved), used);
          const blob = await renderEntry(entry, resolved, selectedQuality);
          if (directory) await writeBlob(await directory.getFileHandle(name, { create: true }), blob);
          else download(blob, name);
          count++;
        } catch (e) { failures.push(`${entry.name}：${e.message}`); }
      }
      setError(failures.length > 0);
      setStatus(`${directory ? '已保存' : '已生成并请求下载'} ${count} / ${entries.length} 张。${directory ? '' : '浏览器可能要求允许多文件下载。'}${failures.length ? `未导出 ${failures.length} 张：${failures.join('；')}` : ''}`);
    } catch (e) {
      if (e?.name === 'AbortError') setStatus('已取消批量导出');
      else { setError(true); setStatus(`批量导出失败：${e.message}`); }
    } finally { finish(); }
  };
  return { mode, setMode, busy, status, error, exportCurrent, exportAll, source: photoSource(image) };
}
