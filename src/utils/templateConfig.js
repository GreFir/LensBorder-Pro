import { getPaletteById } from '../constants/palettes.js';

// Use exactly the same transition for a card preview and a real template selection.
export const getTemplateConfig = (config, templateId) => {
  const next = { ...config, template: templateId };
  if (templateId === 'cinema' && config.paletteId !== 'custom') {
    const palette = getPaletteById('cinema');
    return { ...next, paletteId: palette.id, colors: { ...palette.colors } };
  }
  return next;
};
