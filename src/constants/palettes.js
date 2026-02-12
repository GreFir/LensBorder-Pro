export const PALETTES = [
  {
    id: 'light',
    label: 'Light',
    colors: {
      paper: '#ffffff',
      ink: '#0f172a',
      muted: '#64748b',
      accent: '#111827',
    },
  },
  {
    id: 'warm',
    label: 'Warm',
    colors: {
      paper: '#f6f2ea',
      ink: '#2f2b27',
      muted: '#7a6f65',
      accent: '#3a332c',
    },
  },
  {
    id: 'dark',
    label: 'Dark',
    colors: {
      paper: '#0b0c10',
      ink: '#f8fafc',
      muted: '#94a3b8',
      accent: '#e2e8f0',
    },
  },
  {
    id: 'cinema',
    label: 'Cinema',
    colors: {
      paper: '#050505',
      ink: '#f8fafc',
      muted: '#9ca3af',
      accent: '#f8fafc',
    },
  },
];

export const getPaletteById = (id) => {
  const palette = PALETTES.find((item) => item.id === id);
  return palette || PALETTES[0];
};
