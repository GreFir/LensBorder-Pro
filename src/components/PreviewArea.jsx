import { useEffect, useMemo, useRef, useState } from 'react';
import { FileImage } from 'lucide-react';

const clampZoom = (value) => Math.min(3.5, Math.max(0.2, value));

export default function PreviewArea({
  canvasRef,
  hasImage,
  zoom,
  onZoomChange,
  autoFit,
  imageInfo,
}) {
  const containerRef = useRef(null);
  const viewportRef = useRef(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const dragRef = useRef({ active: false, startX: 0, startY: 0, originX: 0, originY: 0 });
  const handleZoom = (value) => {
    onZoomChange(clampZoom(value));
  };

  const handleWheel = (event) => {
    if (!hasImage) return;
    event.preventDefault();
    const delta = event.deltaY * -0.0015;
    handleZoom(zoom + delta);
  };

  useEffect(() => {
    if (!containerRef.current) return;
    const element = containerRef.current;

    const updateSize = () => {
      const rect = element.getBoundingClientRect();
      setContainerSize({ width: rect.width, height: rect.height });
    };

    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!viewportRef.current) return;
    const element = viewportRef.current;

    const updateSize = () => {
      const rect = element.getBoundingClientRect();
      setViewportSize({ width: rect.width, height: rect.height });
    };

    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (autoFit) {
      setPan({ x: 0, y: 0 });
    }
  }, [autoFit, hasImage]);

  useEffect(() => {
    if (!autoFit || !hasImage) return;
    const canvas = canvasRef.current;
    if (!canvas || !viewportSize.width || !viewportSize.height) return;

    const padding = 56;
    const availableWidth = Math.max(1, viewportSize.width - padding);
    const availableHeight = Math.max(1, viewportSize.height - padding);
    const scaleX = availableWidth / canvas.width;
    const scaleY = availableHeight / canvas.height;
    const fitZoom = clampZoom(Math.min(scaleX, scaleY));

    onZoomChange(fitZoom, { auto: true });
  }, [autoFit, hasImage, viewportSize, canvasRef, onZoomChange]);

  const clampedPan = useMemo(() => {
    const canvas = canvasRef.current;
    if (!canvas || !viewportSize.width || !viewportSize.height) return pan;
    const scaledWidth = canvas.width * zoom;
    const scaledHeight = canvas.height * zoom;
    const limitX = Math.max(0, (scaledWidth - viewportSize.width) / 2);
    const limitY = Math.max(0, (scaledHeight - viewportSize.height) / 2);
    return {
      x: Math.max(-limitX, Math.min(limitX, pan.x)),
      y: Math.max(-limitY, Math.min(limitY, pan.y)),
    };
  }, [pan, zoom, viewportSize, canvasRef]);

  useEffect(() => {
    setPan(clampedPan);
  }, [clampedPan.x, clampedPan.y]);

  const handlePointerDown = (event) => {
    if (!hasImage) return;
    dragRef.current = {
      active: true,
      startX: event.clientX,
      startY: event.clientY,
      originX: pan.x,
      originY: pan.y,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event) => {
    if (!dragRef.current.active) return;
    const dx = event.clientX - dragRef.current.startX;
    const dy = event.clientY - dragRef.current.startY;
    setPan({ x: dragRef.current.originX + dx, y: dragRef.current.originY + dy });
  };

  const handlePointerUp = (event) => {
    if (!dragRef.current.active) return;
    dragRef.current.active = false;
    event.currentTarget.releasePointerCapture(event.pointerId);
  };

  return (
    <div className="flex-1 relative overflow-hidden min-h-0">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(15,23,42,0.08),_transparent_55%)] dark:bg-[radial-gradient(circle_at_top,_rgba(148,163,184,0.12),_transparent_60%)]"></div>

      {hasImage && imageInfo && (
        <div className="absolute top-4 left-4 z-20 rounded-full border border-slate-200/60 bg-white/80 px-3 py-1 text-xs font-medium text-slate-600 shadow-sm backdrop-blur dark:border-slate-700/60 dark:bg-slate-900/70 dark:text-slate-300">
          {imageInfo.width} × {imageInfo.height}px
        </div>
      )}

      <div ref={containerRef} className="relative z-10 flex h-full w-full flex-col min-h-0">
        {hasImage ? (
          <div className="flex-1 px-6 py-8 min-h-0">
            <div className="h-full w-full">
              <div
                ref={viewportRef}
                className="h-full w-full rounded-2xl border border-slate-200/70 bg-white/95 p-4 shadow-2xl shadow-slate-900/10 backdrop-blur dark:border-slate-800/70 dark:bg-slate-950/80"
              >
                <div
                  className="relative h-full w-full overflow-hidden"
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onPointerLeave={handlePointerUp}
                  onWheel={handleWheel}
                  style={{ cursor: 'grab', touchAction: 'none' }}
                >
                  <div
                    className="absolute left-1/2 top-1/2 transform-gpu transition-transform duration-300"
                    style={{
                      transform: `translate(-50%, -50%) translate(${clampedPan.x}px, ${clampedPan.y}px) scale(${zoom})`,
                      transformOrigin: 'center',
                    }}
                  >
                    <canvas ref={canvasRef} className="block" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-1 items-center justify-center px-6">
            <div className="text-center text-slate-500 dark:text-slate-400 animate-float-in">
              <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-3xl bg-white/80 shadow-md shadow-slate-200/80 backdrop-blur dark:bg-slate-900/80 dark:shadow-none">
                <FileImage size={36} />
              </div>
              <p className="text-lg font-semibold">拖入或上传照片开始预览</p>
              <p className="mt-1 text-sm text-slate-400">所有处理均在本地完成</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

