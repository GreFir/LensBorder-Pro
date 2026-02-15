import { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, Images, Layers, Download, X, Trash2, Check } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

const trayVariants = {
  hidden: { opacity: 0, y: 40, scale: 0.98 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.32, ease: [0.22, 0.61, 0.36, 1] },
  },
  exit: { opacity: 0, y: 28, scale: 0.97, transition: { duration: 0.22 } },
};

const thumbVariants = {
  hidden: { opacity: 0, y: 12 },
  show: (index) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.04 * index, duration: 0.18 },
  }),
};

export default function ImageTray({
  images,
  currentId,
  isOpen,
  onToggle,
  onSelect,
  onApplyToOthers,
  onExportAll,
  onRemove,
  onClearAll,
}) {
  const hasImages = images.length > 0;
  const canApplyToOthers = images.length > 1 && !!currentId;
  const [applyFeedback, setApplyFeedback] = useState('');

  useEffect(() => {
    if (!applyFeedback) return undefined;
    const timer = setTimeout(() => setApplyFeedback(''), 1800);
    return () => clearTimeout(timer);
  }, [applyFeedback]);

  const handleApplyToOthers = async () => {
    if (!canApplyToOthers || !onApplyToOthers) return;
    const appliedCount = await Promise.resolve(onApplyToOthers());
    if (appliedCount > 0) {
      setApplyFeedback(`已应用到 ${appliedCount} 张`);
    } else {
      setApplyFeedback('无可应用目标');
    }
  };

  return (
    <div className="pointer-events-none relative">
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            type="button"
            onClick={onToggle}
            className="pointer-events-auto fixed bottom-5 left-1/2 z-40 flex h-12 w-12 -translate-x-1/2 items-center justify-center rounded-full border border-white/70 bg-gradient-to-br from-white via-slate-50 to-slate-200 text-slate-700 shadow-[0_18px_40px_-22px_rgba(15,23,42,0.55)] ring-1 ring-slate-200/60 backdrop-blur dark:border-slate-700/70 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 dark:text-slate-200"
            aria-label="展开批量工作台"
            initial={{ opacity: 0, y: 12, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.94, transition: { duration: 0.18 } }}
            whileHover={{ y: -8, scale: 1.05, boxShadow: '0 22px 40px -24px rgba(15,23,42,0.6)' }}
          >
            <ChevronUp size={18} />
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="pointer-events-auto relative border-t border-slate-200/60 bg-white/92 backdrop-blur-xl shadow-[0_-20px_50px_-30px_rgba(15,23,42,0.5)] dark:border-slate-800/70 dark:bg-slate-950/88"
            variants={trayVariants}
            initial="hidden"
            animate="show"
            exit="exit"
          >
            <button
              type="button"
              onClick={onToggle}
              className="absolute left-1/2 top-2 z-20 flex -translate-x-1/2 items-center gap-1 rounded-full border border-slate-200 bg-white/90 px-3 py-1 text-[11px] font-semibold text-slate-600 shadow-sm transition hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900/90 dark:text-slate-300 dark:hover:bg-slate-900"
            >
              <ChevronDown size={12} />
              收起
            </button>
            <div className="flex items-center justify-between px-4 py-2 text-xs text-slate-600 dark:text-slate-300">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-white shadow-sm dark:bg-white dark:text-slate-900">
                  <Images size={14} />
                </div>
                <div className="leading-tight">
                  <div className="font-semibold">批量工作台</div>
                  <div className="text-[11px] text-slate-400 dark:text-slate-500">
                    {hasImages ? `共 ${images.length} 张，点击缩略图切换` : '导入多张图片后在此管理'}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={!canApplyToOthers}
                  onClick={handleApplyToOthers}
                  className="flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1.5 text-[11px] font-semibold text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900"
                >
                  <Layers size={12} />
                  应用到其他图片
                </button>
                {applyFeedback && (
                  <div className="flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300">
                    <Check size={12} />
                    {applyFeedback}
                  </div>
                )}
                <button
                  type="button"
                  disabled={!hasImages}
                  onClick={onClearAll}
                  className="flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1.5 text-[11px] font-semibold text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900"
                >
                  <Trash2 size={12} />
                  清空
                </button>
                <button
                  type="button"
                  disabled={!hasImages}
                  onClick={onExportAll}
                  className="flex items-center gap-1 rounded-full bg-slate-900 px-3 py-1.5 text-[11px] font-semibold text-white shadow-sm shadow-slate-900/20 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-slate-900"
                >
                  <Download size={12} />
                  导出全部
                </button>
              </div>
            </div>

            <div className="flex items-center gap-3 overflow-x-auto px-4 pb-4">
              {hasImages ? (
                images.map((item, index) => {
                  const active = item.id === currentId;
                  return (
                    <motion.button
                      key={item.id}
                      type="button"
                      onClick={() => onSelect(item.id)}
                      className={`group relative h-24 w-32 flex-shrink-0 overflow-hidden rounded-xl border transition ${
                        active
                          ? 'border-slate-900 ring-2 ring-slate-900/65 shadow-[0_12px_26px_-10px_rgba(15,23,42,0.62)] -translate-y-0.5 dark:border-white dark:ring-white/65'
                          : 'border-slate-200 hover:border-slate-400 dark:border-slate-800'
                      }`}
                      variants={thumbVariants}
                      initial="hidden"
                      animate="show"
                      custom={index}
                      whileHover={{ translateY: -4, boxShadow: '0 12px 24px -18px rgba(15,23,42,0.45)' }}
                    >
                      <img
                        src={item.url}
                        alt={item.name}
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-black/0 to-black/0"></div>
                      {active && (
                        <div className="absolute left-2 top-2 rounded-full bg-slate-900/90 px-2 py-0.5 text-[10px] font-semibold text-white shadow dark:bg-white/90 dark:text-slate-900">
                          当前
                        </div>
                      )}
                      {active && (
                        <div className="pointer-events-none absolute inset-1 rounded-lg border-2 border-white/75 dark:border-white/65"></div>
                      )}
                      <div className="absolute bottom-2 left-2 right-2 flex items-center gap-1 text-[11px] font-semibold text-white drop-shadow">
                        <Layers size={12} />
                        <span className="truncate">{item.name}</span>
                      </div>
                      <button
                        type="button"
                        className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-white opacity-0 transition hover:bg-black/90 group-hover:opacity-100"
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemove(item.id);
                        }}
                      >
                        <X size={12} />
                      </button>
                    </motion.button>
                  );
                })
              ) : (
                <div className="flex h-20 items-center gap-2 rounded-xl border border-dashed border-slate-300/70 px-4 text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400">
                  导入多张图片后，可在此切换并一次性导出全部。
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
