import { useEffect, useRef, useState } from 'react';
import TemplatePanel from './components/TemplatePanel';
import SettingsPanel from './components/SettingsPanel';
import PreviewArea from './components/PreviewArea';
import ImageTray from './components/ImageTray';
import { renderFrame } from './utils/canvasUtils';
import { createEmptyMeta, extractExif } from './utils/exifUtils';
import { DEFAULT_VISIBILITY } from './constants/metadataFields';
import { getPaletteById } from './constants/palettes';
import { extractImagePalette } from './utils/colorUtils';

let heic2anyLoader = null;
const loadHeicConverter = async () => {
  if (!heic2anyLoader) {
    heic2anyLoader = import('heic2any').then((mod) => mod.default || mod);
  }
  return heic2anyLoader;
};

const PREVIEW_MAX_DIMENSION = 2000;
const THEME_STORAGE_KEY = 'lensborder-theme-mode';
const DEFAULT_EXPORT_QUALITY = 0.95;

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

const getExportFileName = () => `lensborder_${Date.now()}.jpg`;
const getNamedExportFileName = (baseName) => {
  const safe = (baseName || 'lensborder').replace(/\.[^.]+$/, '').slice(0, 80);
  return `${safe || 'lensborder'}_border.jpg`;
};

const createJpegBlob = (canvas, quality) =>
  new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Export blob is empty'));
          return;
        }
        resolve(blob);
      },
      'image/jpeg',
      quality
    );
  });

const saveBlobWithAnchor = (blob, fileName) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.download = fileName;
  link.href = url;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const saveBlobWithFilePicker = async (blob, fileName) => {
  if (typeof window === 'undefined' || typeof window.showSaveFilePicker !== 'function') {
    return false;
  }

  const handle = await window.showSaveFilePicker({
    suggestedName: fileName,
    types: [
      {
        description: 'JPEG image',
        accept: { 'image/jpeg': ['.jpg', '.jpeg'] },
      },
    ],
  });
  const writable = await handle.createWritable();
  await writable.write(blob);
  await writable.close();
  return true;
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
  const [imageInfo, setImageInfo] = useState(null);
  const [images, setImages] = useState([]);
  const [currentImageId, setCurrentImageId] = useState(null);
  const [trayOpen, setTrayOpen] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [autoFit, setAutoFit] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(true);
  const [themeMode, setThemeMode] = useState(() => getInitialThemeMode());
  const [isSystemDark, setIsSystemDark] = useState(() => getSystemDarkPreference());
  const [exportQuality, setExportQuality] = useState(DEFAULT_EXPORT_QUALITY);
  const [supportsHdr, setSupportsHdr] = useState(false);
  const resolvedTheme = themeMode === 'system' ? (isSystemDark ? 'dark' : 'light') : themeMode;

  const [meta, setMeta] = useState(() => createEmptyMeta());

  const [config, setConfig] = useState(() => getDefaultConfig());

  useEffect(() => {
    if (!currentImageId) return;
    setImages((prev) =>
      prev.map((entry) =>
        entry.id === currentImageId
          ? {
              ...entry,
              image,
              imageInfo,
              meta,
              config,
            }
          : entry
      )
    );
  }, [image, imageInfo, meta, config, currentImageId]);

  useEffect(() => {
    if (!image || !canvasRef.current) return;
    const ctx =
      canvasRef.current.getContext('2d', { colorSpace: 'display-p3' }) ||
      canvasRef.current.getContext('2d');
    setSupportsHdr(!!ctx && ctx.colorSpace === 'display-p3');
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

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const preventDefault = (event) => {
      event.preventDefault();
      event.stopPropagation();
    };
    window.addEventListener('dragover', preventDefault);
    window.addEventListener('drop', preventDefault);
    return () => {
      window.removeEventListener('dragover', preventDefault);
      window.removeEventListener('drop', preventDefault);
    };
  }, []);

  const loadImageFile = async (file) => {
    let blob = file;
    const ext = (file.name || '').toLowerCase();
    const isHeic =
      file.type === 'image/heic' || file.type === 'image/heif' || ext.endsWith('.heic') || ext.endsWith('.heif');

    if (isHeic) {
      try {
        const heic2any = await loadHeicConverter();
        const converted = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.98 });
        blob = Array.isArray(converted) ? converted[0] : converted;
      } catch (error) {
        console.error('HEIC convert failed, fallback to original blob', error);
      }
    }

    const url = URL.createObjectURL(blob);

    let exifMeta = createEmptyMeta();
    if (exifStatus === 'ready') {
      try {
        // 优先用原始文件读取元数据，避免转码丢失
        exifMeta = await extractExif(file);
      } catch (error) {
        try {
          exifMeta = await extractExif(blob);
        } catch (error2) {
          console.warn('EXIF read failed for HEIC, using empty meta:', error2);
        }
      }
    }

    const img = new Image();
    const loaded = await new Promise((resolve, reject) => {
      img.onload = () => resolve(true);
      img.onerror = reject;
      img.src = url;
    });

    if (!loaded) throw new Error('Image load failed');

    const palette = extractImagePalette(img);
    const baseConfig = getDefaultConfig();
    return {
      id: `img_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`,
      name: file.name,
      url,
      image: img,
      imageInfo: { width: img.width, height: img.height, name: file.name },
      meta: exifMeta,
      config: { ...baseConfig, imagePalette: palette },
    };
  };

  const importFiles = async (files) => {
    if (!files || !files.length) return;
    setIsProcessing(true);
    const loaded = [];

    for (const file of files) {
      try {
        const entry = await loadImageFile(file);
        loaded.push(entry);
      } catch (error) {
        console.error('Image load error:', error);
      }
    }

    setImages((prev) => [...prev, ...loaded]);

    if (!currentImageId && loaded[0]) {
      const first = loaded[0];
      setCurrentImageId(first.id);
      setImage(first.image);
      setImageInfo(first.imageInfo);
      setMeta(first.meta);
      setConfig(first.config);
      setAutoFit(true);
    }

    setIsProcessing(false);
  };

  const handleUpload = async (event) => {
    const fileList = event.target.files;
    if (!fileList || fileList.length === 0) return;
    await importFiles(Array.from(fileList));
    event.target.value = '';
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

  const syncCurrentEntry = () => {
    if (!currentImageId) return;
    setImages((prev) =>
      prev.map((entry) =>
        entry.id === currentImageId
          ? {
              ...entry,
              image,
              imageInfo,
              meta,
              config,
            }
          : entry
      )
    );
  };

  const handleSelectImage = (id) => {
    if (id === currentImageId) return;
    syncCurrentEntry();
    const next = images.find((item) => item.id === id);
    if (!next) return;
    setCurrentImageId(id);
    setImage(next.image);
    setImageInfo(next.imageInfo);
    setMeta(next.meta);
    setConfig(next.config);
    setAutoFit(true);
  };

  const handleRemoveImage = (id) => {
    syncCurrentEntry();
    const remaining = images.filter((item) => item.id !== id);
    setImages(remaining);

    if (id === currentImageId) {
      const next = remaining[0];
      if (next) {
        setCurrentImageId(next.id);
        setImage(next.image);
        setImageInfo(next.imageInfo);
        setMeta(next.meta);
        setConfig(next.config);
        setAutoFit(true);
      } else {
        setCurrentImageId(null);
        setImage(null);
        setImageInfo(null);
        setMeta(createEmptyMeta());
        setConfig(getDefaultConfig());
      }
    }
  };

  const handleClearImages = () => {
    setImages([]);
    setCurrentImageId(null);
    setImage(null);
    setImageInfo(null);
    setMeta(createEmptyMeta());
    setConfig(getDefaultConfig());
  };

  const dragCounter = useRef(0);

  const handleDragOver = (event) => {
    if (event.dataTransfer) {
      event.preventDefault();
      event.dataTransfer.dropEffect = 'copy';
    }
  };

  const handleDragEnter = (event) => {
    if (!event.dataTransfer) return;
    event.preventDefault();
    dragCounter.current += 1;
    setDragActive(true);
  };

  const handleDragLeave = (event) => {
    if (!event.dataTransfer) return;
    event.preventDefault();
    dragCounter.current = Math.max(0, dragCounter.current - 1);
    if (dragCounter.current === 0) {
      setDragActive(false);
    }
  };

  const handleDrop = async (event) => {
    if (!event.dataTransfer) return;
    event.preventDefault();
    dragCounter.current = 0;
    setDragActive(false);

    const files = Array.from(event.dataTransfer.files || []).filter((file) => {
      const ext = (file.name || '').toLowerCase();
      return file.type.startsWith('image/') || ext.endsWith('.heic') || ext.endsWith('.heif');
    });
    if (files.length) {
      await importFiles(files);
    }
  };

  const handleDownload = async () => {
    if (!image) return;

    const exportCanvas = document.createElement('canvas');
    const exportCtx =
      exportCanvas.getContext('2d', { colorSpace: 'display-p3' }) || exportCanvas.getContext('2d');
    if (!exportCtx) return;

    renderFrame(exportCtx, image, config, meta, { scale: 1, preview: false });

    try {
      const fileName = getExportFileName();
      const blob = await createJpegBlob(exportCanvas, exportQuality);
      const savedByPicker = await saveBlobWithFilePicker(blob, fileName);
      if (!savedByPicker) {
        saveBlobWithAnchor(blob, fileName);
      }
    } catch (error) {
      if (error?.name === 'AbortError') {
        return;
      }
      console.error('Export failed:', error);
      try {
        const blob = await createJpegBlob(exportCanvas, exportQuality);
        saveBlobWithAnchor(blob, getExportFileName());
      } catch (fallbackError) {
        console.error('Export fallback failed:', fallbackError);
      }
    }
  };

  const renderEntryToBlob = async (entry) => {
    const exportCanvas = document.createElement('canvas');
    const exportCtx =
      exportCanvas.getContext('2d', { colorSpace: 'display-p3' }) || exportCanvas.getContext('2d');
    if (!exportCtx) throw new Error('Canvas unavailable');
    renderFrame(exportCtx, entry.image, entry.config, entry.meta, { scale: 1, preview: false });
    return createJpegBlob(exportCanvas, exportQuality);
  };

  const handleExportAll = async () => {
    if (!images.length) return;
    syncCurrentEntry();
    let dirHandle = null;

    if (typeof window !== 'undefined' && window.showDirectoryPicker) {
      try {
        dirHandle = await window.showDirectoryPicker();
      } catch (error) {
        if (error?.name !== 'AbortError') {
          console.warn('Directory picker not available, fallback to downloads.', error);
        } else {
          return;
        }
      }
    }

    for (const entry of images) {
      try {
        const blob = await renderEntryToBlob(entry);
        const fileName = getNamedExportFileName(entry.name);
        if (dirHandle) {
          const fileHandle = await dirHandle.getFileHandle(fileName, { create: true });
          const writable = await fileHandle.createWritable();
          await writable.write(blob);
          await writable.close();
        } else {
          saveBlobWithAnchor(blob, fileName);
        }
      } catch (error) {
        console.error(`Export failed for ${entry.name}:`, error);
      }
    }
  };

  return (
    <div
      className="relative h-screen overflow-hidden bg-gradient-to-br from-stone-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900 text-slate-900 dark:text-slate-100"
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {dragActive && (
        <div className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center bg-white/70 backdrop-blur-sm dark:bg-slate-900/70">
          <div className="rounded-3xl border-2 border-dashed border-slate-400 bg-white/90 px-8 py-6 text-center text-slate-700 shadow-lg dark:border-slate-600 dark:bg-slate-900/90 dark:text-slate-200">
            <p className="text-lg font-semibold">拖动图片到此处上传</p>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">支持多张图片同时导入</p>
          </div>
        </div>
      )}
      <div className="flex h-full flex-col overflow-hidden">
        <div className="flex flex-1 overflow-hidden">
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
            exportQuality={exportQuality}
            onExportQualityChange={setExportQuality}
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
            supportsHdr={supportsHdr}
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

        <ImageTray
          images={images}
          currentId={currentImageId}
          isOpen={trayOpen}
          onToggle={() => setTrayOpen((prev) => !prev)}
          onSelect={handleSelectImage}
          onExportAll={handleExportAll}
          onRemove={handleRemoveImage}
          onClearAll={handleClearImages}
        />
      </div>
    </div>
  );
}
