// UI material is independent of light/dark mode and every photo's render config.
export const UI_STYLE_KEY = 'lensborder-ui-style';
export const DEFAULT_UI_STYLE = 'glass';
export const UI_STYLES = Object.freeze([
  Object.freeze({ id: 'glass', name: '液态玻璃', subtitle: '通透高光 · 柔和新拟态', english: 'LIQUID GLASS' }),
  Object.freeze({ id: 'memphis', name: '孟菲斯', subtitle: '几何碰撞 · 明快硬阴影', english: 'MEMPHIS STUDIO' }),
  Object.freeze({ id: 'collage', name: '纸艺拼接', subtitle: '纸张层叠 · 缝线与胶带', english: 'PAPER ATELIER' }),
]);
export const normalizeUiStyle = (value) =>
  UI_STYLES.some((style) => style.id === value) ? value : DEFAULT_UI_STYLE;

export const readUiStyle = (storage) => {
  try { return normalizeUiStyle(storage?.getItem(UI_STYLE_KEY)); }
  catch { return DEFAULT_UI_STYLE; }
};

export const writeUiStyle = (storage, value) => {
  const style = normalizeUiStyle(value);
  try { storage?.setItem(UI_STYLE_KEY, style); }
  catch { /* The selection still works when storage is disabled or full. */ }
  return style;
};

export const getBrowserStorage = () => {
  try { return typeof window === 'undefined' ? undefined : window.localStorage; }
  catch { return undefined; }
};
