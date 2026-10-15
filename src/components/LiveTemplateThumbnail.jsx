import { useEffect, useRef, useState } from 'react';
import { renderFrame } from '../utils/canvasUtils';
import { getTemplateConfig } from '../utils/templateConfig';
import { enqueueThumbnail } from '../utils/thumbnailQueue';
import './LiveTemplateThumbnail.css';

// This component is keyed by the photo in TemplateThumbnail: a new photo never
// briefly displays the previous photo's canvas while its job is still queued.
export default function LiveTemplateThumbnail({ id, image, config, meta }) {
  const wrapperRef = useRef(null);
  const canvasRef = useRef(null);
  const [visible, setVisible] = useState(() => typeof IntersectionObserver === 'undefined');
  const [status, setStatus] = useState('pending');

  useEffect(() => {
    const element = wrapperRef.current;
    if (!element || typeof IntersectionObserver === 'undefined') return undefined;
    const observer = new IntersectionObserver(([entry]) => {
      setVisible(entry.isIntersecting);
    }, { root: element.closest('.lb-sidebar-content'), rootMargin: '160px 0px' });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!visible) return undefined;
    let disposed = false;
    let cancelDraw = () => {};
    const schedule = () => {
      if (disposed) return;
      cancelDraw();
      cancelDraw = enqueueThumbnail(() => {
        if (disposed || !canvasRef.current) return;
        try {
          const ctx = canvasRef.current.getContext('2d', { colorSpace: 'srgb' });
          if (!ctx) throw new Error('Canvas 2D context unavailable');
          renderFrame(ctx, image, getTemplateConfig(config, id), meta, {
            maxDimension: 320, preview: true,
          });
          setStatus('ready');
        } catch (error) {
          console.warn(`Template preview failed (${id}):`, error);
          setStatus('error');
        }
      });
    };
    schedule();
    // Fonts and asynchronously decoded logos/stickers must also refresh cards.
    const fonts = document.fonts;
    fonts?.ready.then(schedule);
    fonts?.addEventListener('loadingdone', schedule);
    window.addEventListener('lensborder-overlay-ready', schedule);
    return () => {
      disposed = true;
      cancelDraw();
      fonts?.removeEventListener('loadingdone', schedule);
      window.removeEventListener('lensborder-overlay-ready', schedule);
    };
  }, [id, image, config, meta, visible]);

  return (
    <span ref={wrapperRef} className="lb-template-live" data-preview-state={status} aria-hidden="true">
      <canvas ref={canvasRef} width="1" height="1" className="lb-template-live-canvas" />
      {status === 'pending' && <span className="lb-thumbnail-message">生成预览…</span>}
      {status === 'error' && <>
        <img className="lb-thumbnail-fallback" src={image.src} alt="" />
        <span className="lb-thumbnail-message">模板预览暂不可用</span>
      </>}
    </span>
  );
}
