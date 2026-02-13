import { useEffect, useRef, useState } from 'react';
import TemplatePanel from './components/TemplatePanel';
import SettingsPanel from './components/SettingsPanel';
import PreviewArea from './components/PreviewArea';
import { renderFrame } from './utils/canvasUtils';
import { createEmptyMeta, extractExif } from './utils/exifUtils';
import { DEFAULT_VISIBILITY } from './constants/metadataFields';
import { getPaletteById } from './constants/palettes';
import { extractImagePalette } from './utils/colorUtils';

const PREVIEW_MAX_DIMENSION = 2000;
const THEME_STORAGE_KEY = 'lensborder-theme-mode';

const getSystemDarkPreference = () =>
  typeof window !== 'undefined' &&
  window.matchMedia &&
  window.matchMedia('(prefers-color-scheme: dark)').matches;

const getInitialThemeMode = () => {
  if (typeof window === 'undefined') return 'system';
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === 'light' || stored === 'dark' || stored === 'system') {
      return stored;
    }
  } catch (error) {
    console.warn('Read theme mode failed:', error);
  }
  return 'system';
};

const getDefaultConfig = () => {
  const prefersDark =
    typeof window !== 'undefined' &&
    window.matchMedia &&
    window.matchMedia('(prefers-color-scheme: dark)').matches;

  const palette = getPaletteById(prefersDark ? 'dark' : 'light');

  return {
    template: 'classic',
    framePadding: 6,
    bottomPadding: 12,
    fontScale: 1,
    paletteId: palette.id,
    colors: palette.colors,
    fieldVisibility: { ...DEFAULT_VISIBILITY },
    copyText: 'Greetings from LensBorder Pro',
    authorAvatarSrc: '',
    authorBio: 'Photographer',
    creatorAvatarScale: 1,
    creatorHeaderOffset: 0,
    metaOffsetY: 0,
    poemCardTitle: 'Mountain Flower',
    poemCardLines: [
      '风沿山脊缓缓写下黄昏，',
      '云在花影里藏起远方的回声。',
    ],
    imagePalette: null,
    glassOpacity: 0.35,
    glassBlur: 18,
    shadowEnabled: false,
    shadowBlur: 26,
    shadowOffset: 14,
    shadowOpacity: 0.35,
    noirBorderOpacity: 0.85,
    plaqueOpacity: 0.9,
    monolithOpacity: 0.18,
    imageRadius: 0,
    textPosition: 'bottom',
    paperGradientEnabled: false,
    paperGradientDirection: 'diagonal',
    paperGradientStops: [
      { id: 'g0', color: '#ffffff', pos: 0 },
      { id: 'g1', color: '#e2e8f0', pos: 100 },
    ],
    paletteOverrideEnabled: false,
    paletteOverrides: ['#1F2937', '#4B5563', '#9CA3AF', '#D1D5DB'],
    postcardStampSrc: '',
    overlays: [],
  };
};

export default function App() {
  const exifStatus = 'ready';
  const canvasRef = useRef(null);

  const [image, setImage] = useState(null);
  const [imageUrl, setImageUrl] = useState('');
  const [imageInfo, setImageInfo] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [autoFit, setAutoFit] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(true);
  const [themeMode, setThemeMode] = useState(() => getInitialThemeMode());
  const [isSystemDark, setIsSystemDark] = useState(() => getSystemDarkPreference());
  const resolvedTheme = themeMode === 'system' ? (isSystemDark ? 'dark' : 'light') : themeMode;

  const [meta, setMeta] = useState(() => createEmptyMeta());

  const [config, setConfig] = useState(() => getDefaultConfig());

  useEffect(() => {
    if (!image || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    const maxDim = Math.max(image.width, image.height);
    const previewScale = maxDim > PREVIEW_MAX_DIMENSION ? PREVIEW_MAX_DIMENSION / maxDim : 1;

    const raf = requestAnimationFrame(() => {
      renderFrame(ctx, image, config, meta, { scale: previewScale, preview: true });
    });

    return () => cancelAnimationFrame(raf);
  }, [image, config, meta]);

  useEffect(() => {
    if (!image) return;
    setAutoFit(true);
  }, [image, config.template, config.framePadding, config.bottomPadding]);

  useEffect(() => {
    return () => {
      if (imageUrl) URL.revokeObjectURL(imageUrl);
    };
  }, [imageUrl]);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (event) => {
      setIsSystemDark(event.matches);
    };

    setIsSystemDark(mediaQuery.matches);
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
    mediaQuery.addListener(handleChange);
    return () => mediaQuery.removeListener(handleChange);
  }, []);

  useEffect(() => {
    const rootElement = document.documentElement;
    rootElement.classList.toggle('dark', resolvedTheme === 'dark');
    rootElement.style.colorScheme = resolvedTheme;
  }, [resolvedTheme]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, themeMode);
    } catch (error) {
      console.warn('Save theme mode failed:', error);
    }
  }, [themeMode]);

  const handleUpload = async (event) => {
    const file = event.target.files && event.target.files[0];
    if (!file) return;

    const nextUrl = URL.createObjectURL(file);
    setIsProcessing(true);

    try {
      const exifMeta = exifStatus === 'ready' ? await extractExif(file) : createEmptyMeta();
      const img = new Image();
      img.onload = () => {
        if (imageUrl) URL.revokeObjectURL(imageUrl);
        setImage(img);
        setImageInfo({ width: img.width, height: img.height, name: file.name });
        setMeta(exifMeta);
        setImageUrl(nextUrl);
        setConfig((prev) => ({
          ...prev,
          imagePalette: extractImagePalette(img),
        }));
        setIsProcessing(false);
      };
      img.onerror = () => {
        URL.revokeObjectURL(nextUrl);
        setIsProcessing(false);
      };
      img.src = nextUrl;
    } catch (error) {
      console.error('Image load error:', error);
      URL.revokeObjectURL(nextUrl);
      setIsProcessing(false);
    } finally {
      event.target.value = '';
    }
  };

  const handleTemplateChange = (templateId) => {
    setConfig((prev) => {
      let next = { ...prev, template: templateId };
      if (templateId === 'cinema' && prev.paletteId !== 'custom') {
        const palette = getPaletteById('cinema');
        next = { ...next, paletteId: palette.id, colors: palette.colors };
      }
      return next;
    });
  };

  const updateConfig = (key, value) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  };

  const updateColors = (colors, paletteId = 'custom') => {
    setConfig((prev) => ({
      ...prev,
      colors: { ...prev.colors, ...colors },
      paletteId,
    }));
  };

  const updateVisibility = (key, value) => {
    setConfig((prev) => ({
      ...prev,
      fieldVisibility: { ...prev.fieldVisibility, [key]: value },
    }));
  };

  const updateMeta = (key, value) => {
    setMeta((prev) => ({ ...prev, [key]: value }));
  };

  const handleZoomChange = (value, options = {}) => {
    setZoom(value);
    if (!options.auto) {
      setAutoFit(false);
    }
  };

  const handleResetAll = () => {
    setConfig(getDefaultConfig());
    setAutoFit(true);
  };

  const updateOverlays = (nextOverlays) => {
    setConfig((prev) => ({ ...prev, overlays: nextOverlays }));
  };

  const handleAddTextOverlay = () => {
    const id = `ov_${Date.now()}`;
    updateOverlays([
      ...(config.overlays || []),
      {
        id,
        type: 'text',
        text: 'Custom Text',
        color: '#ffffff',
        size: 1,
        x: 8,
        y: 8,
        opacity: 0.9,
      },
    ]);
  };

  const handleAddStickerOverlay = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const id = `ov_${Date.now()}`;
      updateOverlays([
        ...(config.overlays || []),
        {
          id,
          type: 'sticker',
          src: reader.result,
          width: 18,
          x: 6,
          y: 6,
          opacity: 0.9,
        },
      ]);
    };
    reader.readAsDataURL(file);
  };

  const handleDownload = () => {
    if (!image) return;

    const exportCanvas = document.createElement('canvas');
    const exportCtx = exportCanvas.getContext('2d');
    if (!exportCtx) return;

    renderFrame(exportCtx, image, config, meta, { scale: 1, preview: false });

    exportCanvas.toBlob(
      (blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = `lensborder_${Date.now()}.jpg`;
        link.href = url;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      },
      'image/jpeg',
      0.95
    );
  };

  return (
    <div className="h-screen overflow-hidden bg-gradient-to-br from-stone-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900 text-slate-900 dark:text-slate-100">
      <div className="flex h-screen overflow-hidden">
        <TemplatePanel
          config={config}
          exifStatus={exifStatus}
          isProcessing={isProcessing}
          onUpload={handleUpload}
          onTemplateChange={handleTemplateChange}
          zoom={zoom}
          onZoomChange={handleZoomChange}
          hasImage={!!image}
          onDownload={handleDownload}
          themeMode={themeMode}
          onThemeModeChange={setThemeMode}
        />

        <div className="flex-1 relative flex flex-col min-h-0">
          <PreviewArea
            canvasRef={canvasRef}
            hasImage={!!image}
            zoom={zoom}
            onZoomChange={handleZoomChange}
            autoFit={autoFit}
            imageInfo={imageInfo}
          />

          <SettingsPanel
            isOpen={settingsOpen}
            onToggle={() => setSettingsOpen((prev) => !prev)}
            config={config}
            meta={meta}
            updateConfig={updateConfig}
            updateColors={updateColors}
            updateVisibility={updateVisibility}
            updateMeta={updateMeta}
            onResetAll={handleResetAll}
            onAddTextOverlay={handleAddTextOverlay}
            onAddStickerOverlay={handleAddStickerOverlay}
            onUpdateOverlays={updateOverlays}
          />
        </div>
      </div>
    </div>
  );
}
