import { useEffect, useRef, useState } from 'react';
import { Icon, StudioIllustration } from '../themes/Icons';

const clampZoom = (value) => Math.min(3.5, Math.max(0.2, value));

export default function PreviewArea({ canvasRef, hasImage, zoom, onZoomChange, autoFit, imageInfo, supportsHdr }) {
  const viewportRef = useRef(null);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const dragRef = useRef({ active: false, startX: 0, startY: 0, originX: 0, originY: 0 });

  const handleWheel = (event) => {
    if (!hasImage) return;
    if (event.cancelable) event.preventDefault();
    onZoomChange(clampZoom(zoom + event.deltaY * -0.0015));
  };

  // Observe on image mount as well: the viewport does not exist in the empty state.
  useEffect(() => {
    const element = viewportRef.current;
    if (!element) return;
    const updateSize = () => {
      const rect = element.getBoundingClientRect();
      setViewportSize({ width: rect.width, height: rect.height });
    };
    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(element);
    return () => observer.disconnect();
  }, [hasImage]);

  useEffect(() => {
    if (!hasImage || !canvasRef.current) {
      queueMicrotask(() => setCanvasSize({ width: 0, height: 0 }));
      return;
    }
    const canvas = canvasRef.current;
    const updateCanvasSize = () => setCanvasSize({ width: canvas.width || 0, height: canvas.height || 0 });
    updateCanvasSize();
    const resizeObserver = new ResizeObserver(updateCanvasSize);
    resizeObserver.observe(canvas);
    const mutationObserver = new MutationObserver(updateCanvasSize);
    mutationObserver.observe(canvas, { attributes: true, attributeFilter: ['width', 'height'] });
    return () => { resizeObserver.disconnect(); mutationObserver.disconnect(); };
  }, [canvasRef, hasImage]);

  useEffect(() => {
    if (autoFit) queueMicrotask(() => setPan({ x: 0, y: 0 }));
  }, [autoFit, hasImage]);

  useEffect(() => {
    if (!autoFit || !hasImage || !canvasSize.width || !canvasSize.height || !viewportSize.width || !viewportSize.height) return;
    const availableWidth = Math.max(1, viewportSize.width - 56);
    const availableHeight = Math.max(1, viewportSize.height - 56);
    const fitZoom = clampZoom(Math.min(availableWidth / canvasSize.width, availableHeight / canvasSize.height));
    // Avoid repeatedly updating the parent when already fitted.
    if (Math.abs(fitZoom - zoom) > 0.001) onZoomChange(fitZoom, { auto: true });
  }, [autoFit, hasImage, canvasSize, viewportSize, onZoomChange, zoom]);

  useEffect(() => {
    if (!canvasSize.width || !canvasSize.height || !viewportSize.width || !viewportSize.height) return;
    const limitX = Math.max(0, (canvasSize.width * zoom - viewportSize.width) / 2);
    const limitY = Math.max(0, (canvasSize.height * zoom - viewportSize.height) / 2);
    queueMicrotask(() => setPan((prev) => {
      const next = { x: Math.max(-limitX, Math.min(limitX, prev.x)), y: Math.max(-limitY, Math.min(limitY, prev.y)) };
      return next.x === prev.x && next.y === prev.y ? prev : next;
    }));
  }, [canvasSize, viewportSize, zoom]);

  const handlePointerDown = (event) => {
    if (!hasImage) return;
    dragRef.current = { active: true, startX: event.clientX, startY: event.clientY, originX: pan.x, originY: pan.y };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const handlePointerMove = (event) => {
    if (!dragRef.current.active) return;
    setPan({ x: dragRef.current.originX + event.clientX - dragRef.current.startX, y: dragRef.current.originY + event.clientY - dragRef.current.startY });
  };
  const handlePointerUp = (event) => {
    if (!dragRef.current.active) return;
    dragRef.current.active = false;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };

  return (
    <main className="lb-workspace" aria-label="照片预览">
      <div className="lb-workspace-heading"><span><Icon name="image" size={15} />{hasImage ? '照片预览' : '你的创作空间'}</span><small>{hasImage && imageInfo ? `${imageInfo.width} × ${imageInfo.height}px` : 'READY WHEN YOU ARE'}{supportsHdr && ' · HDR'}</small></div>
      {hasImage ? (
        <div className="lb-viewport" ref={viewportRef}>
          <div className="lb-pan-area" onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onPointerCancel={handlePointerUp} onWheel={handleWheel}>
            <div className="lb-canvas-position" style={{ transform: `translate(-50%, -50%) translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: 'center' }}>
              <canvas ref={canvasRef} className="lb-photo-canvas" />
            </div>
          </div>
          <span className="lb-viewport-hint">滚轮缩放 · 拖动查看</span>
        </div>
      ) : (
        <div className="lb-empty-state">
          <span className="lb-empty-kicker">A LITTLE FRAME. A BIG DIFFERENCE.</span>
          <StudioIllustration />
          <h1>给照片，恰好的留白。</h1>
          <p>拖入照片，或从左侧导入<br />选择喜欢的边框，让故事留在画面里。</p>
          <div className="lb-empty-tags"><span><Icon name="lock" size={12} />本地处理</span><span><Icon name="stack" size={12} />批量导出</span><span><Icon name="aperture" size={12} />EXIF 识别</span></div>
        </div>
      )}
    </main>
  );
}
