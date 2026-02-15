import { Upload, Camera, ZoomIn, ZoomOut, Download, Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { TEMPLATES } from '../constants/templates';
import { motion } from 'framer-motion';

const Section = ({ title, subtitle, children }) => (
  <div className="space-y-3">
    <div className="space-y-1">
      <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
        {title}
      </div>
      {subtitle && <div className="text-[11px] text-slate-400 dark:text-slate-500">{subtitle}</div>}
    </div>
    {children}
  </div>
);

const TemplatePreview = ({ id }) => {
  if (id === 'creator-signature') {
    return (
      <div className="relative h-14 w-20 rounded-lg border border-slate-200 bg-white">
        <div className="absolute inset-1 rounded-md bg-slate-900"></div>
        <div className="absolute left-2 top-2 h-3 w-3 rounded-full border border-white/60 bg-slate-300"></div>
        <div className="absolute left-6 top-2 h-1.5 w-6 rounded-full bg-white/80"></div>
        <div className="absolute bottom-3 left-1/2 h-2 w-10 -translate-x-1/2 rounded-full bg-white/90"></div>
      </div>
    );
  }
  if (id === 'postcard' || id === 'postcard-note') {
    return (
      <div className="relative h-14 w-20 rounded-lg border border-slate-200 bg-amber-50/70">
        <div className="absolute inset-2 rounded-sm border border-slate-200 bg-white"></div>
        <div className="absolute right-2 top-2 h-3 w-3 rounded-full border border-dashed border-slate-400"></div>
      </div>
    );
  }
  if (id === 'minimal') {
    return (
      <div className="relative h-14 w-20 rounded-lg border border-slate-800 bg-slate-900">
        <div className="absolute inset-1 rounded-md bg-gradient-to-br from-slate-700 to-slate-900"></div>
        <div className="absolute bottom-2 left-2 right-2 h-1.5 rounded-full bg-white/50"></div>
      </div>
    );
  }
  if (id === 'gallery' || id === 'museum') {
    return (
      <div className="relative h-14 w-20 rounded-lg border-4 border-stone-300 bg-stone-200">
        <div className="absolute inset-2 rounded-sm border border-stone-300 bg-white"></div>
      </div>
    );
  }
  if (id === 'cinema' || id === 'noir' || id === 'monolith') {
    return (
      <div className="relative h-14 w-20 rounded-lg border border-black bg-black">
        <div className="absolute inset-2 rounded-sm bg-slate-800"></div>
        <div className="absolute bottom-2 left-2 right-2 h-1 rounded-full bg-white/70"></div>
      </div>
    );
  }
  if (id === 'glassframe' || id === 'glass-brand') {
    return (
      <div className="relative h-14 w-20 rounded-lg border border-white/60 bg-gradient-to-br from-white/60 via-slate-100/40 to-slate-200/20">
        <div className={`absolute rounded-sm border border-white/60 ${id === 'glass-brand' ? 'inset-3' : 'inset-2'}`}></div>
      </div>
    );
  }
  if (id === 'lagoon') {
    return (
      <div className="relative h-14 w-20 rounded-lg border border-slate-200 bg-slate-900">
        <div className="absolute inset-2 rounded-sm bg-slate-200"></div>
        <div className="absolute bottom-2 left-1 right-1 h-3 rounded-sm bg-gradient-to-r from-emerald-500 to-slate-600"></div>
      </div>
    );
  }
  if (id === 'palette-card' || id === 'palette-poem') {
    return (
      <div className="relative h-14 w-20 rounded-lg border border-slate-200 bg-white">
        <div className={`absolute rounded-sm bg-slate-200 ${id === 'palette-poem' ? 'inset-x-2 top-3 bottom-5' : 'inset-2'}`}></div>
        {id === 'palette-poem' && <div className="absolute left-2 top-1.5 h-1 w-7 rounded-full bg-slate-700"></div>}
        <div className="absolute bottom-2 left-2 right-2 flex gap-1">
          <span className={`bg-slate-300 ${id === 'palette-poem' ? 'h-2.5 w-3.5 rounded-sm' : 'h-2 w-2 rounded-full'}`}></span>
          <span className={`bg-sky-300 ${id === 'palette-poem' ? 'h-2.5 w-3.5 rounded-sm' : 'h-2 w-2 rounded-full'}`}></span>
          <span className={`bg-amber-300 ${id === 'palette-poem' ? 'h-2.5 w-3.5 rounded-sm' : 'h-2 w-2 rounded-full'}`}></span>
          <span className={`bg-yellow-600 ${id === 'palette-poem' ? 'h-2.5 w-3.5 rounded-sm' : 'h-2 w-2 rounded-full'}`}></span>
        </div>
      </div>
    );
  }
  if (id === 'floating') {
    return (
      <div className="relative h-14 w-20 rounded-lg border border-slate-200 bg-slate-100">
        <div className="absolute inset-2 rounded-sm bg-white shadow-[0_8px_20px_rgba(15,23,42,0.2)]"></div>
      </div>
    );
  }
  if (id === 'airy' || id === 'borderline') {
    return (
      <div className="relative h-14 w-20 rounded-lg border border-slate-200 bg-white">
        <div className="absolute inset-2 rounded-sm border border-slate-200"></div>
        <div className="absolute bottom-2 left-2 right-2 h-1 rounded-full bg-slate-300"></div>
      </div>
    );
  }
  if (id === 'caption' || id === 'editorial' || id === 'atelier' || id === 'folio') {
    return (
      <div className="relative h-14 w-20 rounded-lg border border-slate-200 bg-white">
        <div className="absolute inset-2 rounded-sm bg-slate-200"></div>
        <div className="absolute bottom-3 left-2 right-2 h-px bg-slate-400"></div>
      </div>
    );
  }
  if (id === 'camera-brand-strip') {
    return (
      <div className="relative h-14 w-20 rounded-lg border border-slate-200 bg-white">
        <div className="absolute inset-2 rounded-sm bg-slate-200"></div>
        <div className="absolute bottom-1 left-0 right-0 h-4 border-t border-slate-200 bg-white">
          <div className="absolute left-2 top-1 h-1 w-6 rounded-full bg-slate-700"></div>
          <div className="absolute right-2 top-1 h-1 w-8 rounded-full bg-slate-700"></div>
          <div className="absolute right-8 top-0.5 h-2.5 w-px bg-slate-300"></div>
        </div>
      </div>
    );
  }
  if (id === 'mono') {
    return (
      <div className="relative h-14 w-20 rounded-lg border border-slate-200 bg-white">
        <div className="absolute inset-2 rounded-sm bg-slate-100"></div>
        <div className="absolute bottom-2 left-2 right-2 h-1.5 rounded-full bg-slate-400"></div>
      </div>
    );
  }
  return (
    <div className="relative h-14 w-20 rounded-lg border border-slate-200 bg-white">
      <div className="absolute inset-2 rounded-sm bg-slate-200"></div>
      <div className="absolute bottom-1 left-0 right-0 h-3 border-t border-slate-200 bg-white"></div>
    </div>
  );
};

const clampZoom = (value) => Math.min(3.5, Math.max(0.2, value));

export default function TemplatePanel({
  config,
  exifStatus,
  isProcessing,
  onUpload,
  onTemplateChange,
  zoom,
  onZoomChange,
  hasImage,
  onDownload,
  exportQuality,
  onExportQualityChange,
  themeMode,
  onThemeModeChange,
  isCollapsed,
  onToggleCollapse,
}) {
  const zoomPercent = Math.round(zoom * 100);
  const qualityPercent = Math.round(exportQuality * 100);
  const handleZoom = (value) => {
    onZoomChange(clampZoom(value));
  };

  if (isCollapsed) {
    return (
      <motion.aside
        initial={{ width: 340, opacity: 0.96 }}
        animate={{ width: 96, opacity: 1 }}
        transition={{ duration: 0.26, ease: [0.22, 0.61, 0.36, 1] }}
        className="flex h-screen flex-col overflow-hidden border-r border-slate-200/70 bg-white/88 backdrop-blur-xl shadow-[0_20px_60px_-40px_rgba(15,23,42,0.5)] dark:border-slate-800 dark:bg-slate-950/75"
      >
        <div className="flex flex-col items-center gap-2 border-b border-slate-200/70 px-2 py-3 dark:border-slate-800">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-900 text-white shadow-sm dark:bg-white dark:text-slate-900">
            <Camera size={15} />
          </div>
          <button
            type="button"
            onClick={onToggleCollapse}
            className="rounded-lg border border-slate-200 p-1.5 text-slate-600 transition hover:bg-slate-100 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900"
            aria-label="展开左侧面板"
          >
            <ChevronRight size={14} />
          </button>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="space-y-2 border-b border-slate-200/70 px-2 py-3 dark:border-slate-800"
        >
          <label className="flex cursor-pointer items-center justify-center rounded-xl border border-slate-200 bg-white/80 p-2 text-slate-700 transition hover:border-slate-300 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-200 dark:hover:bg-slate-900">
            <Plus size={16} />
            <input
              type="file"
              accept="image/*,.heic,.heif"
              multiple
              onChange={onUpload}
              className="hidden"
            />
          </label>

          <button
            type="button"
            disabled={!hasImage}
            onClick={onDownload}
            className="flex w-full items-center justify-center rounded-xl bg-slate-900 p-2 text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-slate-900"
            aria-label="导出当前图片"
          >
            <Download size={14} />
          </button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.22, delay: 0.04 }}
          className="flex-1 overflow-y-auto px-2 py-3 custom-scrollbar"
        >
          <div className="space-y-2">
            {TEMPLATES.map((template) => {
              const active = template.id === config.template;
              return (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => onTemplateChange(template.id)}
                  className={`w-full rounded-xl border p-1.5 transition ${
                    active
                      ? 'border-slate-900 bg-slate-900 text-white shadow-md shadow-slate-900/20'
                      : 'border-slate-200 bg-white/70 text-slate-700 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-200'
                  }`}
                  title={template.label}
                >
                  <div className="flex justify-center">
                    <div className="origin-center scale-[0.72]">
                      <TemplatePreview id={template.id} />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </motion.div>
      </motion.aside>
    );
  }

  return (
    <motion.aside
      initial={{ width: 96, opacity: 0.96 }}
      animate={{ width: 340, opacity: 1 }}
      transition={{ duration: 0.28, ease: [0.22, 0.61, 0.36, 1] }}
      className="flex h-screen flex-col overflow-hidden border-r border-slate-200/70 bg-white/80 backdrop-blur-xl shadow-[0_20px_60px_-40px_rgba(15,23,42,0.5)] dark:border-slate-800 dark:bg-slate-950/70"
    >
      <motion.div
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="border-b border-slate-200/70 px-6 py-5 dark:border-slate-800"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-md shadow-slate-900/30 dark:bg-white dark:text-slate-900">
              <Camera size={18} />
            </div>
            <div>
              <div className="text-lg font-semibold tracking-tight">LensBorder Pro</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">模板与素材</div>
            </div>
          </div>
          <button
            type="button"
            onClick={onToggleCollapse}
            className="rounded-xl border border-slate-200 p-2 text-slate-600 transition hover:bg-slate-100 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900"
            aria-label="收起左侧面板"
          >
            <ChevronLeft size={16} />
          </button>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.24, delay: 0.05 }}
        className="flex-1 space-y-8 overflow-y-auto px-6 py-6 custom-scrollbar"
      >
        <Section title="素材导入" subtitle="本地处理，不上传服务器">
          <div className="relative">
            <input
              type="file"
              accept="image/*,.heic,.heif"
              multiple
              onChange={onUpload}
              className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
            />
            <div className="rounded-2xl border border-dashed border-slate-300/80 bg-white/70 p-6 text-center transition hover:-translate-y-0.5 hover:border-slate-400 dark:border-slate-700 dark:bg-slate-900/60">
              <Upload className="mx-auto mb-3 h-6 w-6 text-slate-500" />
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">点击上传照片</p>
              <p className="mt-1 text-xs text-slate-400">支持 JPG / PNG / WebP，按住 Ctrl/Shift 可多选</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span
              className={`h-2 w-2 rounded-full ${
                exifStatus === 'ready'
                  ? 'bg-emerald-500'
                  : exifStatus === 'error'
                    ? 'bg-rose-500'
                    : 'bg-amber-400'
              }`}
            ></span>
            <span>
              {exifStatus === 'ready'
                ? 'EXIF 已就绪'
                : exifStatus === 'error'
                  ? 'EXIF 加载失败，可手动输入'
                  : 'EXIF 模块加载中'}
            </span>
            {isProcessing && <span className="text-amber-500">读取中...</span>}
          </div>

          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>预览缩放</span>
              <span className="font-mono text-slate-400">{zoomPercent}%</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleZoom(zoom - 0.1)}
                className="rounded-full border border-slate-200 p-1 text-slate-500 hover:bg-slate-100 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900"
              >
                <ZoomOut size={14} />
              </button>
              <input
                type="range"
                min="0.2"
                max="3.5"
                step="0.05"
                value={zoom}
                onChange={(event) => handleZoom(parseFloat(event.target.value))}
                className="h-1 w-full cursor-pointer accent-slate-900 dark:accent-slate-100"
              />
              <button
                type="button"
                onClick={() => handleZoom(zoom + 0.1)}
                className="rounded-full border border-slate-200 p-1 text-slate-500 hover:bg-slate-100 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900"
              >
                <ZoomIn size={14} />
              </button>
            </div>

            <div className="mt-3 space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>导出质量</span>
                <span className="font-mono text-slate-400">{qualityPercent}%</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="1"
                step="0.01"
                value={exportQuality}
                onChange={(event) => onExportQualityChange(parseFloat(event.target.value))}
                className="h-1 w-full cursor-pointer accent-slate-900 dark:accent-slate-100"
              />
            </div>

            <button
              type="button"
              disabled={!hasImage}
              onClick={onDownload}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-slate-900/20 transition hover:-translate-y-0.5 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-slate-900"
            >
              <Download size={14} />
              导出高清图
            </button>
          </div>
        </Section>

        <Section title="界面主题" subtitle="默认跟随系统，可手动覆盖">
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'system', label: '跟随系统' },
              { id: 'light', label: '浅色' },
              { id: 'dark', label: '深色' },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onThemeModeChange(item.id)}
                className={`rounded-xl border px-2 py-2 text-[11px] font-semibold transition ${
                  themeMode === item.id
                    ? 'border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-900'
                    : 'border-slate-200 bg-white/70 text-slate-700 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-200'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </Section>

        <Section title="模板库" subtitle="选择水印边框风格">
          <div className="grid grid-cols-2 gap-3">
            {TEMPLATES.map((template) => {
              const active = template.id === config.template;
              return (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => onTemplateChange(template.id)}
                  className={`flex flex-col items-start gap-2 rounded-2xl border px-3 py-3 text-left transition ${
                    active
                      ? 'border-slate-900 bg-slate-900 text-white shadow-lg shadow-slate-900/20'
                      : 'border-slate-200 bg-white/70 text-slate-700 hover:-translate-y-0.5 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-200'
                  }`}
                >
                  <TemplatePreview id={template.id} />
                  <div className="space-y-0.5">
                    <div className="text-sm font-semibold">{template.label}</div>
                    <div className={`text-[11px] ${active ? 'text-white/70' : 'text-slate-400'}`}>
                      {template.caption}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </Section>
      </motion.div>
    </motion.aside>
  );
}
