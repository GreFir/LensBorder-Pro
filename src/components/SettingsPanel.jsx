import { Info, SlidersHorizontal, X } from 'lucide-react';
import { PALETTES } from '../constants/palettes';
import { METADATA_FIELDS, METADATA_GROUPS } from '../constants/metadataFields';

const fieldMap = METADATA_FIELDS.reduce((acc, field) => {
  acc[field.key] = field;
  return acc;
}, {});

const fullWidthKeys = new Set(['model', 'lens', 'artist']);

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

const Toggle = ({ active, label, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    role="switch"
    aria-checked={active}
    className="flex items-center justify-between rounded-xl border border-slate-200/80 bg-white/70 px-3 py-2 text-xs font-medium text-slate-700 transition hover:-translate-y-0.5 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-200"
  >
    <span>{label}</span>
    <span
      className={`flex h-5 w-9 items-center rounded-full px-1 transition ${
        active ? 'bg-slate-900' : 'bg-slate-300'
      }`}
    >
      <span
        className={`h-4 w-4 rounded-full bg-white transition ${
          active ? 'translate-x-4' : 'translate-x-0'
        }`}
      />
    </span>
  </button>
);

const FieldInput = ({ label, value, placeholder, onChange }) => (
  <label className="space-y-1 text-[10px] uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
    <span>{label}</span>
    <input
      type="text"
      value={value}
      placeholder={placeholder}
      onChange={(event) => onChange(event.target.value)}
      className="w-full rounded-lg border border-slate-200/80 bg-white/70 px-3 py-2 text-xs text-slate-700 outline-none transition focus:border-slate-400 focus:bg-white dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-200"
    />
  </label>
);

export default function SettingsPanel({
  isOpen,
  onToggle,
  config,
  meta,
  updateConfig,
  updateColors,
  updateVisibility,
  updateMeta,
  onResetAll,
  onAddTextOverlay,
  onAddStickerOverlay,
  onUpdateOverlays,
}) {
  const isPostcardNote = config.template === 'postcard-note';
  const showPostcardStampControls = ['postcard', 'postcard-note'].includes(config.template);
  const showFloatingControls = config.template === 'floating';
  const showGlassControls = ['glassframe', 'glass-brand'].includes(config.template);
  const showNoirControls = config.template === 'noir';
  const showMuseumControls = config.template === 'museum';
  const showMonolithControls = config.template === 'monolith';
  const showPaletteControls = ['palette-card', 'palette-poem'].includes(config.template);
  const showCreatorSignatureControls = config.template === 'creator-signature';
  const showMetaOffsetControls = ['creator-signature', 'glass-brand'].includes(config.template);
  const showPalettePoemControls = config.template === 'palette-poem';

  const baseClass =
    'absolute z-30 flex flex-col border border-slate-200/70 bg-white/85 shadow-2xl shadow-slate-900/20 backdrop-blur transition-all duration-300 dark:border-slate-800/80 dark:bg-slate-950/80';
  const openClass = 'right-4 top-4 bottom-4 w-[340px] rounded-3xl';
  const closedClass =
    'right-4 top-6 h-12 w-12 items-center justify-center rounded-full shadow-xl shadow-slate-900/30';

  return (
    <aside
      aria-expanded={isOpen}
      className={`${baseClass} ${isOpen ? openClass : closedClass}`}
    >
      <div
        className={`${
          isOpen
            ? 'flex items-center justify-between border-b border-slate-200/70 px-4 py-3 dark:border-slate-800/80'
            : 'flex h-full items-center justify-center'
        }`}
      >
        {isOpen ? (
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
            <SlidersHorizontal size={16} />
            <span>参数设置</span>
          </div>
        ) : (
          <SlidersHorizontal size={16} className="text-slate-600 dark:text-slate-200" />
        )}

        <button
          type="button"
          onClick={onToggle}
          className={`rounded-full p-1 text-slate-500 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-900 ${
            isOpen ? '' : 'absolute inset-0'
          }`}
          aria-label={isOpen ? '收起参数面板' : '展开参数面板'}
        >
          {isOpen ? <X size={16} /> : null}
        </button>
      </div>

      <div className={`flex-1 space-y-8 overflow-y-auto px-4 py-5 custom-scrollbar ${isOpen ? '' : 'hidden'}`}>
        <button
          type="button"
          onClick={onResetAll}
          className="w-full rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-600 transition hover:border-rose-300 hover:bg-rose-100 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300"
        >
          重置所有参数
        </button>


        {showPostcardStampControls && (
          <Section title="明信片邮票" subtitle="上传图片替换右上角圆形印章">
            <div className="space-y-3">
              <label className="flex cursor-pointer items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white/70 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-slate-400 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-300">
                上传邮票图像
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files && event.target.files[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = () => {
                      const nextSrc = typeof reader.result === 'string' ? reader.result : '';
                      updateConfig('postcardStampSrc', nextSrc);
                      setTimeout(() => updateConfig('postcardStampSrc', nextSrc), 80);
                    };
                    reader.readAsDataURL(file);
                    event.target.value = '';
                  }}
                />
              </label>

              {config.postcardStampSrc ? (
                <>
                  <div className="rounded-xl border border-slate-200/80 bg-white/70 p-2 dark:border-slate-800 dark:bg-slate-900/60">
                    <img
                      src={config.postcardStampSrc}
                      alt="stamp preview"
                      className="mx-auto h-16 w-16 rounded-full border border-slate-200 object-cover dark:border-slate-700"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => updateConfig('postcardStampSrc', '')}
                    className="w-full rounded-xl border border-slate-200 bg-white/70 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300"
                  >
                    移除邮票图像
                  </button>
                </>
              ) : (
                <div className="rounded-xl border border-dashed border-slate-300 px-3 py-2 text-xs text-slate-400 dark:border-slate-700">
                  未上传时将显示默认 STAMP 圆章
                </div>
              )}
            </div>
          </Section>
        )}

        {showCreatorSignatureControls && (
          <Section title="作者信息" subtitle="上传头像并设置作者展示信息">
            <div className="space-y-3">
              <FieldInput
                label="作者名称"
                value={meta.artist || ''}
                placeholder="输入作者名"
                onChange={(value) => updateMeta('artist', value)}
              />

              <FieldInput
                label="作者说明"
                value={config.authorBio || ''}
                placeholder="例如 Travel Photographer"
                onChange={(value) => updateConfig('authorBio', value)}
              />

              <label className="flex cursor-pointer items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white/70 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-slate-400 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-300">
                上传作者头像
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files && event.target.files[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = () => {
                      const nextSrc = typeof reader.result === 'string' ? reader.result : '';
                      updateConfig('authorAvatarSrc', nextSrc);
                      setTimeout(() => updateConfig('authorAvatarSrc', nextSrc), 80);
                    };
                    reader.readAsDataURL(file);
                    event.target.value = '';
                  }}
                />
              </label>

              <div className="space-y-3">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                    <span>头像大小</span>
                    <span className="font-mono text-slate-400">{(config.creatorAvatarScale || 1).toFixed(2)}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.6"
                    max="2"
                    step="0.05"
                    value={config.creatorAvatarScale || 1}
                    onChange={(event) => updateConfig('creatorAvatarScale', parseFloat(event.target.value))}
                    className="h-1.5 w-full cursor-pointer accent-slate-900 dark:accent-slate-100"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                    <span>顶部信息位置</span>
                    <span className="font-mono text-slate-400">{Math.round(config.creatorHeaderOffset || 0)}px</span>
                  </div>
                  <input
                    type="range"
                    min="-120"
                    max="160"
                    step="1"
                    value={config.creatorHeaderOffset || 0}
                    onChange={(event) => updateConfig('creatorHeaderOffset', parseFloat(event.target.value))}
                    className="h-1.5 w-full cursor-pointer accent-slate-900 dark:accent-slate-100"
                  />
                </div>
              </div>

              {config.authorAvatarSrc ? (
                <>
                  <div className="rounded-xl border border-slate-200/80 bg-white/70 p-2 dark:border-slate-800 dark:bg-slate-900/60">
                    <img
                      src={config.authorAvatarSrc}
                      alt="author avatar"
                      className="mx-auto h-16 w-16 rounded-full border border-slate-200 object-cover dark:border-slate-700"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => updateConfig('authorAvatarSrc', '')}
                    className="w-full rounded-xl border border-slate-200 bg-white/70 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300"
                  >
                    移除头像
                  </button>
                </>
              ) : (
                <div className="rounded-xl border border-dashed border-slate-300 px-3 py-2 text-xs text-slate-400 dark:border-slate-700">
                  未上传时会显示默认圆形头像占位
                </div>
              )}
            </div>
          </Section>
        )}

        {isPostcardNote && (
          <Section title="明信片文案" subtitle="支持自定义内容">
            <textarea
              rows={3}
              value={config.copyText}
              onChange={(event) => updateConfig('copyText', event.target.value)}
              className="w-full rounded-2xl border border-slate-200/80 bg-white/70 px-3 py-2 text-xs text-slate-700 outline-none transition focus:border-slate-400 focus:bg-white dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-200"
              placeholder="写一句明信片风格的短句"
            />
          </Section>
        )}

        {showFloatingControls && (
          <Section title="悬浮卡片" subtitle="调整阴影层次">
            <div className="space-y-3">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                  <span>阴影模糊</span>
                  <span className="font-mono text-slate-400">{config.shadowBlur}px</span>
                </div>
                <input
                  type="range"
                  min="6"
                  max="60"
                  step="1"
                  value={config.shadowBlur}
                  onChange={(event) => updateConfig('shadowBlur', parseFloat(event.target.value))}
                  className="h-1.5 w-full cursor-pointer accent-slate-900 dark:accent-slate-100"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                  <span>阴影偏移</span>
                  <span className="font-mono text-slate-400">{config.shadowOffset}px</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="30"
                  step="1"
                  value={config.shadowOffset}
                  onChange={(event) => updateConfig('shadowOffset', parseFloat(event.target.value))}
                  className="h-1.5 w-full cursor-pointer accent-slate-900 dark:accent-slate-100"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                  <span>阴影强度</span>
                  <span className="font-mono text-slate-400">{config.shadowOpacity}</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="0.8"
                  step="0.05"
                  value={config.shadowOpacity}
                  onChange={(event) => updateConfig('shadowOpacity', parseFloat(event.target.value))}
                  className="h-1.5 w-full cursor-pointer accent-slate-900 dark:accent-slate-100"
                />
              </div>
            </div>
          </Section>
        )}

        <Section title="全局阴影" subtitle="应用于所有模板">
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => updateConfig('shadowEnabled', !config.shadowEnabled)}
              className={`w-full rounded-xl border px-3 py-2 text-xs font-semibold transition ${
                config.shadowEnabled
                  ? 'border-slate-900 bg-slate-900 text-white'
                  : 'border-slate-200 bg-white/70 text-slate-700 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-200'
              }`}
            >
              {config.shadowEnabled ? '阴影已开启' : '阴影已关闭'}
            </button>
            {config.shadowEnabled && (
              <>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                    <span>阴影模糊</span>
                    <span className="font-mono text-slate-400">{config.shadowBlur}px</span>
                  </div>
                  <input
                    type="range"
                    min="6"
                    max="60"
                    step="1"
                    value={config.shadowBlur}
                    onChange={(event) => updateConfig('shadowBlur', parseFloat(event.target.value))}
                    className="h-1.5 w-full cursor-pointer accent-slate-900 dark:accent-slate-100"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                    <span>阴影偏移</span>
                    <span className="font-mono text-slate-400">{config.shadowOffset}px</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="30"
                    step="1"
                    value={config.shadowOffset}
                    onChange={(event) => updateConfig('shadowOffset', parseFloat(event.target.value))}
                    className="h-1.5 w-full cursor-pointer accent-slate-900 dark:accent-slate-100"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                    <span>阴影强度</span>
                    <span className="font-mono text-slate-400">{config.shadowOpacity}</span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="0.8"
                    step="0.05"
                    value={config.shadowOpacity}
                    onChange={(event) => updateConfig('shadowOpacity', parseFloat(event.target.value))}
                    className="h-1.5 w-full cursor-pointer accent-slate-900 dark:accent-slate-100"
                  />
                </div>
              </>
            )}
          </div>
        </Section>

        {showGlassControls && (
          <Section title="磨砂玻璃" subtitle="调整透明度">
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                  <span>玻璃模糊</span>
                  <span className="font-mono text-slate-400">{config.glassBlur}px</span>
                </div>
                <input
                  type="range"
                  min="6"
                  max="40"
                  step="1"
                  value={config.glassBlur}
                  onChange={(event) => updateConfig('glassBlur', parseFloat(event.target.value))}
                  className="h-1.5 w-full cursor-pointer accent-slate-900 dark:accent-slate-100"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                  <span>玻璃透明度</span>
                  <span className="font-mono text-slate-400">{config.glassOpacity}</span>
                </div>
                <input
                  type="range"
                  min="0.15"
                  max="0.7"
                  step="0.05"
                  value={config.glassOpacity}
                  onChange={(event) => updateConfig('glassOpacity', parseFloat(event.target.value))}
                  className="h-1.5 w-full cursor-pointer accent-slate-900 dark:accent-slate-100"
                />
              </div>
            </div>
          </Section>
        )}

        <Section title="图片圆角" subtitle="调整照片圆角">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>圆角大小</span>
              <span className="font-mono text-slate-400">{config.imageRadius}px</span>
            </div>
            <input
              type="range"
              min="0"
              max="160"
              step="2"
              value={config.imageRadius}
              onChange={(event) => updateConfig('imageRadius', parseFloat(event.target.value))}
              className="h-1.5 w-full cursor-pointer accent-slate-900 dark:accent-slate-100"
            />
          </div>
        </Section>

        {showNoirControls && (
          <Section title="Noir 边框" subtitle="调整边框浓度">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>边框透明度</span>
                <span className="font-mono text-slate-400">{config.noirBorderOpacity}</span>
              </div>
              <input
                type="range"
                min="0.3"
                max="1"
                step="0.05"
                value={config.noirBorderOpacity}
                onChange={(event) => updateConfig('noirBorderOpacity', parseFloat(event.target.value))}
                className="h-1.5 w-full cursor-pointer accent-slate-900 dark:accent-slate-100"
              />
            </div>
          </Section>
        )}

        {showMuseumControls && (
          <Section title="Museum 标牌" subtitle="调整标牌透明度">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>标牌透明度</span>
                <span className="font-mono text-slate-400">{config.plaqueOpacity}</span>
              </div>
              <input
                type="range"
                min="0.4"
                max="1"
                step="0.05"
                value={config.plaqueOpacity}
                onChange={(event) => updateConfig('plaqueOpacity', parseFloat(event.target.value))}
                className="h-1.5 w-full cursor-pointer accent-slate-900 dark:accent-slate-100"
              />
            </div>
          </Section>
        )}

        {showMonolithControls && (
          <Section title="Monolith" subtitle="调整遮罩强度">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>遮罩透明度</span>
                <span className="font-mono text-slate-400">{config.monolithOpacity}</span>
              </div>
              <input
                type="range"
                min="0.05"
                max="0.6"
                step="0.05"
                value={config.monolithOpacity}
                onChange={(event) => updateConfig('monolithOpacity', parseFloat(event.target.value))}
                className="h-1.5 w-full cursor-pointer accent-slate-900 dark:accent-slate-100"
              />
            </div>
          </Section>
        )}

        {showPalettePoemControls && (
          <Section title="诗意文案" subtitle="可添加多行文本，打造叙事感">
            <div className="space-y-3">
              <FieldInput
                label="主标题"
                value={config.poemCardTitle || ''}
                placeholder="例如 Mountain Flower"
                onChange={(value) => updateConfig('poemCardTitle', value)}
              />

              <div className="space-y-2">
                {(config.poemCardLines || []).map((line, index) => (
                  <div
                    key={`poem-line-${index}`}
                    className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white/70 px-2 py-2 dark:border-slate-800 dark:bg-slate-900/60"
                  >
                    <input
                      type="text"
                      value={line}
                      placeholder={`诗意文案 ${index + 1}`}
                      onChange={(event) => {
                        const next = [...(config.poemCardLines || [])];
                        next[index] = event.target.value;
                        updateConfig('poemCardLines', next);
                      }}
                      className="w-full bg-transparent text-xs text-slate-700 outline-none dark:text-slate-200"
                    />
                    {(config.poemCardLines || []).length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          const next = (config.poemCardLines || []).filter((_, i) => i !== index);
                          updateConfig('poemCardLines', next.length ? next : ['']);
                        }}
                        className="text-[10px] text-rose-500 hover:text-rose-600"
                      >
                        删除
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {(config.poemCardLines || []).length < 8 && (
                <button
                  type="button"
                  onClick={() => updateConfig('poemCardLines', [...(config.poemCardLines || []), ''])}
                  className="w-full rounded-xl border border-dashed border-slate-300 px-3 py-2 text-xs text-slate-500 hover:border-slate-400 dark:border-slate-700 dark:text-slate-400"
                >
                  添加一行文案
                </button>
              )}
            </div>
          </Section>
        )}

        {showPaletteControls && (
          <Section title="色卡取色" subtitle="允许手动指定色卡">
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => updateConfig('paletteOverrideEnabled', !config.paletteOverrideEnabled)}
                className={`w-full rounded-xl border px-3 py-2 text-xs font-semibold transition ${
                  config.paletteOverrideEnabled
                    ? 'border-slate-900 bg-slate-900 text-white'
                    : 'border-slate-200 bg-white/70 text-slate-700 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-200'
                }`}
              >
                {config.paletteOverrideEnabled ? '手动取色已开启' : '手动取色已关闭'}
              </button>
              {config.paletteOverrideEnabled && (
                <div className="grid grid-cols-2 gap-2">
                  {(config.paletteOverrides || []).map((color, index) => (
                    <label
                      key={`${color}-${index}`}
                      className="flex items-center justify-between rounded-xl border border-slate-200 bg-white/70 px-3 py-2 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300"
                    >
                      色块 {index + 1}
                      <input
                        type="color"
                        value={color}
                        onChange={(event) => {
                          const next = [...config.paletteOverrides];
                          next[index] = event.target.value;
                          updateConfig('paletteOverrides', next);
                        }}
                        className="h-6 w-6 cursor-pointer rounded-full border-0 bg-transparent"
                      />
                    </label>
                  ))}
                </div>
              )}
            </div>
          </Section>
        )}

        <Section title="字段开关" subtitle="勾选需要显示的参数">
          <div className="space-y-4">
            {METADATA_GROUPS.map((group) => (
              <div key={group.id} className="space-y-2">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                  {group.label}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {group.keys.map((key) => {
                    const field = fieldMap[key];
                    if (!field) return null;
                    return (
                      <Toggle
                        key={field.key}
                        label={field.label}
                        active={!!config.fieldVisibility[field.key]}
                        onClick={() => updateVisibility(field.key, !config.fieldVisibility[field.key])}
                      />
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </Section>

        <Section title="参数校正" subtitle="可手动修正或补充信息">
          <div className="grid grid-cols-2 gap-3">
            {METADATA_FIELDS.map((field) => (
              <div
                key={field.key}
                className={fullWidthKeys.has(field.key) ? 'col-span-2' : ''}
              >
                <FieldInput
                  label={field.label}
                  value={meta[field.key] || ''}
                  placeholder={field.placeholder}
                  onChange={(value) => updateMeta(field.key, value)}
                />
              </div>
            ))}
          </div>
        </Section>

        <Section title="细节调整" subtitle="边框与字体比例">
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>文字位置</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => updateConfig('textPosition', 'bottom')}
                  className={`rounded-xl border px-3 py-2 text-xs font-semibold transition ${
                    config.textPosition === 'bottom'
                      ? 'border-slate-900 bg-slate-900 text-white'
                      : 'border-slate-200 bg-white/70 text-slate-700 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-200'
                  }`}
                >
                  底部
                </button>
                <button
                  type="button"
                  onClick={() => updateConfig('textPosition', 'right')}
                  className={`rounded-xl border px-3 py-2 text-xs font-semibold transition ${
                    config.textPosition === 'right'
                      ? 'border-slate-900 bg-slate-900 text-white'
                      : 'border-slate-200 bg-white/70 text-slate-700 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-200'
                  }`}
                >
                  右侧（旋转）
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>边框厚度</span>
                <span className="font-mono text-slate-400">{config.framePadding}%</span>
              </div>
              <input
                type="range"
                min="2"
                max="18"
                step="0.5"
                value={config.framePadding}
                onChange={(event) => updateConfig('framePadding', parseFloat(event.target.value))}
                className="h-1.5 w-full cursor-pointer accent-slate-900 dark:accent-slate-100"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>底部留白</span>
                <span className="font-mono text-slate-400">{config.bottomPadding}%</span>
              </div>
              <input
                type="range"
                min="2"
                max="24"
                step="0.5"
                value={config.bottomPadding}
                onChange={(event) => updateConfig('bottomPadding', parseFloat(event.target.value))}
                className="h-1.5 w-full cursor-pointer accent-slate-900 dark:accent-slate-100"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>字体比例</span>
                <span className="font-mono text-slate-400">{config.fontScale}x</span>
              </div>
              <input
                type="range"
                min="0.7"
                max="1.6"
                step="0.05"
                value={config.fontScale}
                onChange={(event) => updateConfig('fontScale', parseFloat(event.target.value))}
                className="h-1.5 w-full cursor-pointer accent-slate-900 dark:accent-slate-100"
              />
            </div>

            {showMetaOffsetControls && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                  <span>元数据上下偏移</span>
                  <span className="font-mono text-slate-400">{(config.metaOffsetY || 0).toFixed(1)}%</span>
                </div>
                <input
                  type="range"
                  min="-120"
                  max="120"
                  step="0.5"
                  value={config.metaOffsetY || 0}
                  onChange={(event) => updateConfig('metaOffsetY', parseFloat(event.target.value))}
                  className="h-1.5 w-full cursor-pointer accent-slate-900 dark:accent-slate-100"
                />
              </div>
            )}
          </div>
        </Section>

        <Section title="配色方案" subtitle="快速切换纸面与文字">
          <div className="grid grid-cols-2 gap-2">
            {PALETTES.map((palette) => {
              const active = palette.id === config.paletteId;
              return (
                <button
                  key={palette.id}
                  type="button"
                  onClick={() => updateColors(palette.colors, palette.id)}
                  className={`flex items-center justify-between rounded-xl border px-3 py-2 text-xs font-semibold transition ${
                    active
                      ? 'border-slate-900 bg-slate-900 text-white'
                      : 'border-slate-200 bg-white/70 text-slate-700 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-200'
                  }`}
                >
                  <span>{palette.label}</span>
                  <span className="flex items-center gap-1">
                    <span
                      className="h-3 w-3 rounded-full border border-white/40"
                      style={{ backgroundColor: palette.colors.paper }}
                    ></span>
                    <span
                      className="h-3 w-3 rounded-full border border-white/40"
                      style={{ backgroundColor: palette.colors.ink }}
                    ></span>
                  </span>
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <label className="flex items-center justify-between rounded-xl border border-slate-200 bg-white/70 px-3 py-2 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300">
              纸面
              <input
                type="color"
                value={config.colors.paper}
                onChange={(event) => updateColors({ paper: event.target.value })}
                className="h-6 w-6 cursor-pointer rounded-full border-0 bg-transparent"
              />
            </label>
            <label className="flex items-center justify-between rounded-xl border border-slate-200 bg-white/70 px-3 py-2 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300">
              字色
              <input
                type="color"
                value={config.colors.ink}
                onChange={(event) => updateColors({ ink: event.target.value })}
                className="h-6 w-6 cursor-pointer rounded-full border-0 bg-transparent"
              />
            </label>
          </div>

          <div className="pt-3 space-y-3">
            <button
              type="button"
              onClick={() => updateConfig('paperGradientEnabled', !config.paperGradientEnabled)}
              className={`w-full rounded-xl border px-3 py-2 text-xs font-semibold transition ${
                config.paperGradientEnabled
                  ? 'border-slate-900 bg-slate-900 text-white'
                  : 'border-slate-200 bg-white/70 text-slate-700 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-200'
              }`}
            >
              {config.paperGradientEnabled ? '纸面渐变已开启' : '纸面渐变已关闭'}
            </button>
            {config.paperGradientEnabled && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'vertical', label: '纵向' },
                    { id: 'horizontal', label: '横向' },
                    { id: 'diagonal', label: '对角' },
                    { id: 'reverse-diagonal', label: '反对角' },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => updateConfig('paperGradientDirection', item.id)}
                      className={`rounded-xl border px-3 py-2 text-xs font-semibold transition ${
                        config.paperGradientDirection === item.id
                          ? 'border-slate-900 bg-slate-900 text-white'
                          : 'border-slate-200 bg-white/70 text-slate-700 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-200'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>

                <div className="space-y-2">
                  {(config.paperGradientStops || []).map((stop, index) => (
                    <div
                      key={stop.id}
                      className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white/70 px-3 py-2 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300"
                    >
                      <input
                        type="color"
                        value={stop.color}
                        onChange={(event) => {
                          const next = [...config.paperGradientStops];
                          next[index] = { ...stop, color: event.target.value };
                          updateConfig('paperGradientStops', next);
                        }}
                        className="h-6 w-6 cursor-pointer rounded-full border-0 bg-transparent"
                      />
                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="1"
                        value={stop.pos}
                        onChange={(event) => {
                          const next = [...config.paperGradientStops];
                          next[index] = { ...stop, pos: parseInt(event.target.value, 10) };
                          updateConfig('paperGradientStops', next);
                        }}
                        className="h-1 w-full cursor-pointer accent-slate-900 dark:accent-slate-100"
                      />
                      <span className="w-10 text-right font-mono text-[10px]">{stop.pos}%</span>
                      {config.paperGradientStops.length > 2 && (
                        <button
                          type="button"
                          onClick={() => {
                            const next = config.paperGradientStops.filter((_, i) => i !== index);
                            updateConfig('paperGradientStops', next);
                          }}
                          className="text-[10px] text-rose-500 hover:text-rose-600"
                        >
                          删除
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {config.paperGradientStops.length < 6 && (
                  <button
                    type="button"
                    onClick={() => {
                      const next = [
                        ...config.paperGradientStops,
                        {
                          id: `g${Date.now()}`,
                          color: '#ffffff',
                          pos: 50,
                        },
                      ];
                      updateConfig('paperGradientStops', next);
                    }}
                    className="w-full rounded-xl border border-dashed border-slate-300 px-3 py-2 text-xs text-slate-500 hover:border-slate-400 dark:border-slate-700 dark:text-slate-400"
                  >
                    添加渐变色
                  </button>
                )}
              </div>
            )}
          </div>
        </Section>

        <Section title="自定义叠加" subtitle="添加文字或贴图">
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={onAddTextOverlay}
                className="rounded-xl border border-slate-200 bg-white/70 px-3 py-2 text-xs font-semibold text-slate-700 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-200"
              >
                添加文字
              </button>
              <label className="flex items-center justify-center rounded-xl border border-slate-200 bg-white/70 px-3 py-2 text-xs font-semibold text-slate-700 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-200">
                添加贴图
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files && event.target.files[0];
                    if (!file) return;
                    onAddStickerOverlay(file);
                    event.target.value = '';
                  }}
                />
              </label>
            </div>

            {(config.overlays || []).length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 px-3 py-2 text-xs text-slate-400 dark:border-slate-700">
                还没有添加叠加元素
              </div>
            ) : (
              <div className="space-y-3">
                {(config.overlays || []).map((overlay, index) => (
                  <div
                    key={overlay.id}
                    className="rounded-2xl border border-slate-200/70 bg-white/70 p-3 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">
                        {overlay.type === 'text' ? `文字 ${index + 1}` : `贴图 ${index + 1}`}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const next = (config.overlays || []).filter((item) => item.id !== overlay.id);
                          onUpdateOverlays(next);
                        }}
                        className="text-[10px] text-rose-500 hover:text-rose-600"
                      >
                        删除
                      </button>
                    </div>

                    {overlay.type === 'text' && (
                      <div className="mt-2 space-y-2">
                        <input
                          type="text"
                          value={overlay.text}
                          onChange={(event) => {
                            const next = [...config.overlays];
                            next[index] = { ...overlay, text: event.target.value };
                            onUpdateOverlays(next);
                          }}
                          className="w-full rounded-lg border border-slate-200 bg-white/80 px-2 py-1 text-xs text-slate-700 outline-none dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-200"
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <label className="flex items-center justify-between rounded-lg border border-slate-200 bg-white/70 px-2 py-1 dark:border-slate-800 dark:bg-slate-900/70">
                            颜色
                            <input
                              type="color"
                              value={overlay.color || '#ffffff'}
                              onChange={(event) => {
                                const next = [...config.overlays];
                                next[index] = { ...overlay, color: event.target.value };
                                onUpdateOverlays(next);
                              }}
                              className="h-5 w-5 cursor-pointer rounded-full border-0 bg-transparent"
                            />
                          </label>
                          <label className="flex items-center justify-between rounded-lg border border-slate-200 bg-white/70 px-2 py-1 dark:border-slate-800 dark:bg-slate-900/70">
                            大小
                            <input
                              type="range"
                              min="0.5"
                              max="3"
                              step="0.1"
                              value={overlay.size || 1}
                              onChange={(event) => {
                                const next = [...config.overlays];
                                next[index] = { ...overlay, size: parseFloat(event.target.value) };
                                onUpdateOverlays(next);
                              }}
                              className="w-20 accent-slate-900 dark:accent-slate-100"
                            />
                          </label>
                        </div>
                      </div>
                    )}

                    <div className="mt-2 space-y-2">
                      <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
                        <span>位置 X</span>
                        <span className="font-mono">{overlay.x}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="1"
                        value={overlay.x}
                        onChange={(event) => {
                          const next = [...config.overlays];
                          next[index] = { ...overlay, x: parseInt(event.target.value, 10) };
                          onUpdateOverlays(next);
                        }}
                        className="h-1.5 w-full cursor-pointer accent-slate-900 dark:accent-slate-100"
                      />
                      <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
                        <span>位置 Y</span>
                        <span className="font-mono">{overlay.y}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="1"
                        value={overlay.y}
                        onChange={(event) => {
                          const next = [...config.overlays];
                          next[index] = { ...overlay, y: parseInt(event.target.value, 10) };
                          onUpdateOverlays(next);
                        }}
                        className="h-1.5 w-full cursor-pointer accent-slate-900 dark:accent-slate-100"
                      />
                      <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
                        <span>透明度</span>
                        <span className="font-mono">{overlay.opacity}</span>
                      </div>
                      <input
                        type="range"
                        min="0.1"
                        max="1"
                        step="0.05"
                        value={overlay.opacity}
                        onChange={(event) => {
                          const next = [...config.overlays];
                          next[index] = { ...overlay, opacity: parseFloat(event.target.value) };
                          onUpdateOverlays(next);
                        }}
                        className="h-1.5 w-full cursor-pointer accent-slate-900 dark:accent-slate-100"
                      />
                      {overlay.type === 'sticker' && (
                        <>
                          <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
                            <span>尺寸</span>
                            <span className="font-mono">{overlay.width}%</span>
                          </div>
                          <input
                            type="range"
                            min="5"
                            max="50"
                            step="1"
                            value={overlay.width}
                            onChange={(event) => {
                              const next = [...config.overlays];
                              next[index] = { ...overlay, width: parseInt(event.target.value, 10) };
                              onUpdateOverlays(next);
                            }}
                            className="h-1.5 w-full cursor-pointer accent-slate-900 dark:accent-slate-100"
                          />
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Section>

        <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white/70 px-4 py-3 text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-400">
          <Info size={16} className="mt-0.5" />
          <span>所有渲染在浏览器本地完成，导出保持原始分辨率。</span>
        </div>
      </div>
    </aside>
  );
}
