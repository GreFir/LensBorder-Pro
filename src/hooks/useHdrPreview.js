import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { renderFrame } from '../utils/canvasUtils';
import { encodeHdrJpeg } from '../utils/hdr/canvas.js';
import { photoSource } from '../utils/hdr/source.js';

const getHdrDisplay = () => typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' && window.matchMedia('(dynamic-range: high)').matches;
const subscribeHdrDisplay = (notify) => {
  if (typeof window === 'undefined' || !window.matchMedia) return () => {};
  const query = window.matchMedia('(dynamic-range: high)');
  if (query.addEventListener) {
    query.addEventListener('change', notify);
    return () => query.removeEventListener('change', notify);
  }
  query.addListener(notify);
  return () => query.removeListener(notify);
};

export default function useHdrPreview({ image, config, meta, mode = 'auto' }) {
  const hdrDisplay = useSyncExternalStore(subscribeHdrDisplay, getHdrDisplay, () => false);
  const source = photoSource(image);
  const wantsHdr = source?.status === 'hdr' && mode !== 'sdr';
  const enabled = wantsHdr && hdrDisplay;
  const [result, setResult] = useState(null);
  const queue = useRef(Promise.resolve());

  useEffect(() => {
    if (!enabled) return undefined;
    const controller = new AbortController();
    const { signal } = controller;
    let url;
    // Serialize work and cancel stale renders while sliders / photo selection change.
    const timer = setTimeout(() => {
      queue.current = queue.current.catch(() => {}).then(async () => {
        try {
          signal.throwIfAborted();
          const blob = await encodeHdrJpeg(renderFrame, image, config, meta, source, .95, {
            maxDimension: 1400, signal,
          });
          signal.throwIfAborted();
          url = URL.createObjectURL(blob);
          const decoded = new Image();
          decoded.src = url;
          await decoded.decode();
          signal.throwIfAborted();
          setResult({ image, config, meta, url });
        } catch (error) {
          if (url) URL.revokeObjectURL(url);
          if (!signal.aborted) setResult({ image, config, meta, error: error.message });
        }
      });
    }, 180);
    return () => {
      controller.abort();
      clearTimeout(timer);
      if (url) URL.revokeObjectURL(url);
    };
  }, [enabled, image, config, meta, source]);

  const current = enabled && result?.image === image && result.config === config && result.meta === meta ? result : null;
  const label = !image ? '' : !wantsHdr ? 'SDR 预览' : !hdrDisplay ?
    'SDR 预览 · 当前显示环境未启用 HDR' : current?.error ? 'SDR 预览 · HDR 预览不可用' :
    current?.url ? 'HDR 预览' : '正在生成 HDR 预览（暂显 SDR）';
  return { url: current?.url, label, error: current?.error };
}
