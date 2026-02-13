const FONT_FAMILIES = {
  sans: "'Manrope', sans-serif",
  serif: "'Cormorant Garamond', serif",
};

const TEMPLATE_STYLES = {
  classic: { frameScale: 1, bottomScale: 1 },
  postcard: { frameScale: 1.1, bottomScale: 0.9 },
  'postcard-note': { frameScale: 1.1, bottomScale: 0.9 },
  minimal: { frameScale: 0, bottomScale: 0 },
  gallery: { frameScale: 2.1, bottomScale: 1.25 },
  cinema: { frameScale: 0.8, bottomScale: 0.7 },
  noir: { frameScale: 0.9, bottomScale: 0.7 },
  airy: { frameScale: 1.4, bottomScale: 1.05 },
  mono: { frameScale: 0.2, bottomScale: 0.2 },
  caption: { frameScale: 1, bottomScale: 0.9 },
  borderline: { frameScale: 1.1, bottomScale: 0.9 },
  editorial: { frameScale: 1.6, bottomScale: 1.2 },
  museum: { frameScale: 2.6, bottomScale: 1.35 },
  glassframe: { frameScale: 0.4, bottomScale: 0.2 },
  lagoon: { frameScale: 1.1, bottomScale: 1.1 },
  'palette-card': { frameScale: 1.4, bottomScale: 1.4 },
  floating: { frameScale: 1.2, bottomScale: 0.9 },
  atelier: { frameScale: 1.5, bottomScale: 1.1 },
  monolith: { frameScale: 0.7, bottomScale: 0.6 },
  folio: { frameScale: 1.3, bottomScale: 1.05 },
};

const compact = (items) => items.filter(Boolean);

const roundedRectPath = (ctx, x, y, width, height, radius) => {
  const r = Math.max(0, Math.min(radius, Math.min(width, height) / 2));
  if (r === 0) {
    ctx.rect(x, y, width, height);
    return;
  }
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
};

const drawImageCover = (ctx, image, x, y, width, height) => {
  const scale = Math.max(width / image.width, height / image.height);
  const drawWidth = image.width * scale;
  const drawHeight = image.height * scale;
  const offsetX = x + (width - drawWidth) / 2;
  const offsetY = y + (height - drawHeight) / 2;
  ctx.drawImage(image, offsetX, offsetY, drawWidth, drawHeight);
};

const toHex = (value) => value.toString(16).padStart(2, '0');

const buildGradient = (ctx, width, height, direction, stops) => {
  let gradient;
  switch (direction) {
    case 'horizontal':
      gradient = ctx.createLinearGradient(0, 0, width, 0);
      break;
    case 'vertical':
      gradient = ctx.createLinearGradient(0, 0, 0, height);
      break;
    case 'reverse-diagonal':
      gradient = ctx.createLinearGradient(width, 0, 0, height);
      break;
    case 'diagonal':
    default:
      gradient = ctx.createLinearGradient(0, 0, width, height);
      break;
  }
  stops.forEach((stop) => {
    const pos = Math.min(1, Math.max(0, stop.pos / 100));
    gradient.addColorStop(pos, stop.color);
  });
  return gradient;
};

const samplePalette = (image, count = 4) => {
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return [];
    const size = 72;
    canvas.width = size;
    canvas.height = size;
    ctx.drawImage(image, 0, 0, size, size);

    const { data } = ctx.getImageData(0, 0, size, size);
    const buckets = new Map();
    for (let i = 0; i < data.length; i += 4) {
      const alpha = data[i + 3];
      if (alpha < 40) continue;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const key = `${r >> 4}-${g >> 4}-${b >> 4}`;
      const entry = buckets.get(key) || { r: 0, g: 0, b: 0, count: 0 };
      entry.r += r;
      entry.g += g;
      entry.b += b;
      entry.count += 1;
      buckets.set(key, entry);
    }

    const ranked = Array.from(buckets.values())
      .map((entry) => ({
        r: Math.round(entry.r / entry.count),
        g: Math.round(entry.g / entry.count),
        b: Math.round(entry.b / entry.count),
        count: entry.count,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, count);

    return ranked.map(
      (c) => `#${toHex(c.r)}${toHex(c.g)}${toHex(c.b)}`.toUpperCase()
    );
  } catch {
    return [];
  }
};

const withAlpha = (hex, alpha) => {
  if (!hex) return `rgba(0,0,0,${alpha})`;
  const normalized = hex.replace('#', '');
  const value =
    normalized.length === 3
      ? normalized
          .split('')
          .map((c) => c + c)
          .join('')
      : normalized;
  const num = parseInt(value, 16);
  if (Number.isNaN(num)) return `rgba(0,0,0,${alpha})`;
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const fitText = (ctx, text, maxWidth) => {
  if (!text) return '';
  if (ctx.measureText(text).width <= maxWidth) return text;
  let trimmed = text;
  const suffix = '...';
  while (trimmed.length > 0 && ctx.measureText(`${trimmed}${suffix}`).width > maxWidth) {
    trimmed = trimmed.slice(0, -1);
  }
  return trimmed ? `${trimmed}${suffix}` : '';
};

const buildText = (meta, visibility = {}) => {
  const safeMeta = meta || {};
  const pick = (key) => (visibility[key] ? safeMeta[key] : '');
  const make = pick('make');
  const model = pick('model');
  const lens = pick('lens');
  const focalLength = pick('focalLength');
  const fNumber = pick('fNumber');
  const exposureTime = pick('exposureTime');
  const iso = pick('iso');
  const dateTime = pick('dateTime');
  const artist = pick('artist');

  const main = compact([make, model]).join(' ');
  const credit = artist ? `© ${artist}` : '';
  const leftMain = compact([main, credit]).join('  ·  ');
  const leftSub = compact([lens, dateTime]).join('  •  ');
  const rightLine = compact([focalLength, fNumber, exposureTime, iso]).join('  ');

  return { leftMain, leftSub, rightLine };
};

const drawRightColumn = (ctx, layout, config, text, options = {}) => {
  const { textAreaX, textAreaY, textAreaWidth, textAreaHeight, baseFont, framePadding } = layout;
  if (!textAreaWidth) return;
  const pad = Math.max(16, baseFont * 1.2);
  const contentX = textAreaX + pad;
  const contentY = textAreaY + pad;
  const maxWidth = textAreaWidth - pad * 2;

  if (options.showDivider) {
    ctx.strokeStyle = withAlpha(config.colors.muted, 0.25);
    ctx.lineWidth = Math.max(1, baseFont * 0.05);
    ctx.beginPath();
    ctx.moveTo(textAreaX, textAreaY + framePadding * 0.3);
    ctx.lineTo(textAreaX, textAreaY + textAreaHeight - framePadding * 0.3);
    ctx.stroke();
  }

  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';

  if (text.leftMain) {
    ctx.font = `600 ${baseFont}px ${FONT_FAMILIES.sans}`;
    ctx.fillStyle = config.colors.ink;
    ctx.fillText(fitText(ctx, text.leftMain, maxWidth), contentX, contentY);
  }

  if (text.leftSub) {
    ctx.font = `400 ${baseFont * 0.8}px ${FONT_FAMILIES.sans}`;
    ctx.fillStyle = config.colors.muted;
    ctx.fillText(
      fitText(ctx, text.leftSub, maxWidth),
      contentX,
      contentY + baseFont * 1.4
    );
  }

  if (text.rightLine) {
    ctx.font = `500 ${baseFont * 0.85}px ${FONT_FAMILIES.sans}`;
    ctx.fillStyle = config.colors.ink;
    ctx.fillText(
      fitText(ctx, text.rightLine, maxWidth),
      contentX,
      contentY + baseFont * 2.9
    );
  }
};

const RIGHT_TEXT_TEMPLATES = new Set([
  'classic',
  'postcard',
  'postcard-note',
  'gallery',
  'cinema',
  'noir',
  'airy',
  'mono',
  'caption',
  'borderline',
  'editorial',
  'museum',
  'floating',
  'atelier',
  'monolith',
  'folio',
  'lagoon',
]);

const computeLayout = (image, config) => {
  const { width, height } = image;
  const base = Math.max(width, height);
  const basePadding = (base * config.framePadding) / 100;
  const baseBottom = (base * config.bottomPadding) / 100;
  const style = TEMPLATE_STYLES[config.template] || TEMPLATE_STYLES.classic;
  const noBottomBar = new Set(['minimal', 'mono', 'glassframe']);
  const useRightText =
    config.textPosition === 'right' && RIGHT_TEXT_TEMPLATES.has(config.template);
  const sideBarWidth = useRightText ? Math.max(base * 0.22, 220) : 0;

  const framePadding =
    config.template === 'minimal' ? 0 : Math.max(6, basePadding * style.frameScale);
  const bottomBarHeight =
    useRightText || config.template === 'minimal' || noBottomBar.has(config.template)
      ? 0
      : Math.max(0, baseBottom * style.bottomScale);

  const canvasWidth = width + framePadding * 2 + sideBarWidth;
  const canvasHeight = height + framePadding * 2 + bottomBarHeight;

  return {
    width,
    height,
    canvasWidth,
    canvasHeight,
    framePadding,
    bottomBarHeight,
    imageX: framePadding,
    imageY: framePadding,
    imageWidth: width,
    imageHeight: height,
    textY: framePadding + height + bottomBarHeight / 2,
    baseFont: Math.max(12, base * 0.018 * config.fontScale),
    useRightText,
    sideBarWidth,
    textAreaX: framePadding + width,
    textAreaY: framePadding,
    textAreaWidth: sideBarWidth,
    textAreaHeight: height,
  };
};

const drawBase = (ctx, layout, config, image) => {
  const { canvasWidth, canvasHeight, imageX, imageY, imageWidth, imageHeight } = layout;
  if (config.paperGradientEnabled && Array.isArray(config.paperGradientStops)) {
    const stops =
      config.paperGradientStops.length >= 2
        ? [...config.paperGradientStops].sort((a, b) => a.pos - b.pos)
        : [
            { pos: 0, color: config.colors.paper },
            { pos: 100, color: config.colors.paper },
          ];
    ctx.fillStyle = buildGradient(
      ctx,
      canvasWidth,
      canvasHeight,
      config.paperGradientDirection || 'diagonal',
      stops
    );
  } else {
    ctx.fillStyle = config.colors.paper;
  }
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);
  const radius = Math.max(0, config.imageRadius || 0);
  if (config.shadowEnabled) {
    ctx.save();
    ctx.shadowColor = `rgba(15, 23, 42, ${config.shadowOpacity ?? 0.35})`;
    ctx.shadowBlur = config.shadowBlur ?? 24;
    ctx.shadowOffsetY = config.shadowOffset ?? 12;
    ctx.shadowOffsetX = 0;
    ctx.fillStyle = config.colors.paper;
    ctx.beginPath();
    roundedRectPath(ctx, imageX, imageY, imageWidth, imageHeight, radius);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  if (radius > 0) {
    ctx.save();
    ctx.beginPath();
    roundedRectPath(ctx, imageX, imageY, imageWidth, imageHeight, radius);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(image, imageX, imageY, imageWidth, imageHeight);
    ctx.restore();
  } else {
    ctx.drawImage(image, imageX, imageY, imageWidth, imageHeight);
  }
};

const drawClassic = (ctx, layout, config, text) => {
  const { canvasWidth, framePadding, textY, baseFont, useRightText } = layout;
  if (useRightText) {
    drawRightColumn(ctx, layout, config, text);
    return;
  }
  const leftMax = (canvasWidth - framePadding * 2) * 0.6;
  const rightMax = (canvasWidth - framePadding * 2) * 0.35;

  ctx.textBaseline = 'middle';
  if (text.leftMain || text.leftSub) {
    ctx.textAlign = 'left';
    if (text.leftMain) {
      ctx.font = `600 ${baseFont}px ${FONT_FAMILIES.sans}`;
      ctx.fillStyle = config.colors.ink;
      ctx.fillText(fitText(ctx, text.leftMain, leftMax), framePadding, textY - baseFont * 0.6);
    }
    if (text.leftSub) {
      ctx.font = `400 ${baseFont * 0.82}px ${FONT_FAMILIES.sans}`;
      ctx.fillStyle = config.colors.muted;
      ctx.fillText(fitText(ctx, text.leftSub, leftMax), framePadding, textY + baseFont * 0.78);
    }
  }

  if (text.rightLine) {
    ctx.textAlign = 'right';
    ctx.font = `500 ${baseFont * 0.85}px ${FONT_FAMILIES.sans}`;
    ctx.fillStyle = config.colors.ink;
    ctx.fillText(fitText(ctx, text.rightLine, rightMax), canvasWidth - framePadding, textY);
  }
};

const drawPostcard = (ctx, layout, config, text) => {
  const { canvasWidth, canvasHeight, framePadding, textY, baseFont, useRightText } = layout;
  if (useRightText) {
    drawRightColumn(ctx, layout, config, text, { showDivider: true });
    return;
  }
  ctx.strokeStyle = withAlpha(config.colors.muted, 0.4);
  ctx.lineWidth = Math.max(1, baseFont * 0.06);
  ctx.strokeRect(
    framePadding * 0.35,
    framePadding * 0.35,
    canvasWidth - framePadding * 0.7,
    canvasHeight - framePadding * 0.7
  );

  const stamp = baseFont * 2.8;
  const stampX = canvasWidth - framePadding - stamp;
  const stampY = framePadding * 0.4;

  ctx.save();
  ctx.translate(stampX, stampY);
  ctx.setLineDash([4, 2]);
  ctx.strokeStyle = withAlpha(config.colors.muted, 0.7);
  ctx.lineWidth = Math.max(1, baseFont * 0.06);
  ctx.beginPath();
  ctx.arc(stamp / 2, stamp / 2, stamp / 2, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = config.colors.ink;
  ctx.font = `600 ${baseFont * 0.5}px ${FONT_FAMILIES.sans}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('STAMP', stamp / 2, stamp / 2);
  ctx.restore();

  const note =
    config.template === 'postcard-note' && config.copyText ? config.copyText.trim() : '';
  const line1 = note || text.leftMain || text.leftSub || text.rightLine;
  const line2 = text.leftMain
    ? compact([text.leftSub, text.rightLine]).join('  •  ')
    : text.leftSub
      ? text.rightLine
      : '';

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (line1) {
    ctx.font = `600 ${baseFont * 0.95}px ${FONT_FAMILIES.serif}`;
    ctx.fillStyle = config.colors.ink;
    ctx.fillText(fitText(ctx, line1, canvasWidth * 0.82), canvasWidth / 2, textY - baseFont * 0.4);
  }
  if (line2) {
    ctx.font = `400 ${baseFont * 0.75}px ${FONT_FAMILIES.sans}`;
    ctx.fillStyle = config.colors.muted;
    ctx.fillText(fitText(ctx, line2, canvasWidth * 0.82), canvasWidth / 2, textY + baseFont * 0.68);
  }
};

const drawMinimal = (ctx, layout, config, text) => {
  const { canvasWidth, canvasHeight, baseFont, useRightText } = layout;
  if (useRightText) {
    drawRightColumn(ctx, layout, config, text);
    return;
  }
  const leftLine = compact([text.leftMain, text.leftSub]).join('  •  ');
  const rightLine = text.rightLine;

  if (!leftLine && !rightLine) return;

  const overlayHeight = baseFont * 2.8;
  const pad = Math.max(14, baseFont * 1.05);

  ctx.fillStyle = withAlpha(config.colors.paper, 0.42);
  ctx.fillRect(0, canvasHeight - overlayHeight, canvasWidth, overlayHeight);

  ctx.textBaseline = 'middle';
  if (leftLine) {
    ctx.textAlign = 'left';
    ctx.font = `500 ${baseFont * 0.8}px ${FONT_FAMILIES.sans}`;
    ctx.fillStyle = config.colors.ink;
    ctx.fillText(
      fitText(ctx, leftLine, canvasWidth * 0.65),
      pad,
      canvasHeight - overlayHeight / 2
    );
  }

  if (rightLine) {
    ctx.textAlign = 'right';
    ctx.font = `500 ${baseFont * 0.75}px ${FONT_FAMILIES.sans}`;
    ctx.fillStyle = config.colors.ink;
    ctx.fillText(
      fitText(ctx, rightLine, canvasWidth * 0.3),
      canvasWidth - pad,
      canvasHeight - overlayHeight / 2
    );
  }
};

const drawGallery = (ctx, layout, config, text) => {
  const { imageX, imageY, imageWidth, imageHeight, canvasWidth, textY, baseFont, useRightText } =
    layout;
  if (useRightText) {
    drawRightColumn(ctx, layout, config, text, { showDivider: true });
    return;
  }

  ctx.strokeStyle = withAlpha(config.colors.muted, 0.35);
  ctx.lineWidth = Math.max(1, baseFont * 0.06);
  ctx.strokeRect(imageX - 0.5, imageY - 0.5, imageWidth + 1, imageHeight + 1);

  const line1 = text.leftMain || text.leftSub || text.rightLine;
  const line2 = compact([text.leftSub, text.rightLine]).join('  •  ');

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (line1) {
    ctx.font = `600 ${baseFont * 1.05}px ${FONT_FAMILIES.serif}`;
    ctx.fillStyle = config.colors.ink;
    ctx.fillText(fitText(ctx, line1, canvasWidth * 0.82), canvasWidth / 2, textY - baseFont * 0.35);
  }
  if (line2) {
    ctx.font = `400 ${baseFont * 0.75}px ${FONT_FAMILIES.sans}`;
    ctx.fillStyle = config.colors.muted;
    ctx.fillText(fitText(ctx, line2, canvasWidth * 0.82), canvasWidth / 2, textY + baseFont * 0.72);
  }
};

const drawCinema = (ctx, layout, config, text) => {
  const { canvasWidth, textY, baseFont, useRightText } = layout;
  if (useRightText) {
    drawRightColumn(ctx, layout, config, text);
    return;
  }
  const line = compact([text.leftMain, text.leftSub, text.rightLine]).join('  |  ');
  if (!line) return;

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `300 ${baseFont * 0.85}px ${FONT_FAMILIES.sans}`;
  ctx.fillStyle = config.colors.ink;
  ctx.fillText(fitText(ctx, line, canvasWidth * 0.85), canvasWidth / 2, textY);
};

const drawNoir = (ctx, layout, config, text) => {
  const { canvasWidth, canvasHeight, framePadding } = layout;
  ctx.strokeStyle = withAlpha(config.colors.ink, config.noirBorderOpacity ?? 0.85);
  ctx.lineWidth = Math.max(1, framePadding * 0.08);
  ctx.strokeRect(
    framePadding * 0.5,
    framePadding * 0.5,
    canvasWidth - framePadding,
    canvasHeight - framePadding
  );
  drawCinema(ctx, layout, config, text);
};

const drawAiry = (ctx, layout, config, text) => {
  const { canvasWidth, canvasHeight, framePadding, textY, baseFont } = layout;
  ctx.strokeStyle = withAlpha(config.colors.muted, 0.3);
  ctx.lineWidth = Math.max(1, baseFont * 0.05);
  ctx.strokeRect(
    framePadding * 0.65,
    framePadding * 0.65,
    canvasWidth - framePadding * 1.3,
    canvasHeight - framePadding * 1.3
  );
  drawClassic(ctx, layout, config, text);
  if (text.leftMain) {
    ctx.textAlign = 'center';
    ctx.font = `500 ${baseFont * 0.7}px ${FONT_FAMILIES.sans}`;
    ctx.fillStyle = config.colors.muted;
    ctx.fillText('LENSBORDER PRO', canvasWidth / 2, textY - baseFont * 1.8);
  }
};

const drawMono = (ctx, layout, config, text) => {
  const { canvasWidth, canvasHeight, baseFont, useRightText } = layout;
  if (useRightText) {
    drawRightColumn(ctx, layout, config, text);
    return;
  }
  const line = compact([text.leftMain, text.leftSub, text.rightLine]).join('  •  ');
  if (!line) return;
  const pad = Math.max(14, baseFont * 1.1);
  ctx.fillStyle = withAlpha(config.colors.paper, 0.55);
  ctx.fillRect(0, canvasHeight - baseFont * 2.2, canvasWidth, baseFont * 2.2);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.font = `500 ${baseFont * 0.82}px ${FONT_FAMILIES.sans}`;
  ctx.fillStyle = config.colors.ink;
  ctx.fillText(fitText(ctx, line, canvasWidth * 0.9), pad, canvasHeight - baseFont * 1.1);
};

const drawCaption = (ctx, layout, config, text) => {
  const { canvasWidth, framePadding, textY, baseFont, useRightText } = layout;
  if (useRightText) {
    drawRightColumn(ctx, layout, config, text, { showDivider: true });
    return;
  }
  const line = compact([text.leftMain, text.leftSub]).join('  •  ') || text.rightLine;
  if (!line) return;
  ctx.strokeStyle = withAlpha(config.colors.muted, 0.4);
  ctx.lineWidth = Math.max(1, baseFont * 0.06);
  ctx.beginPath();
  ctx.moveTo(framePadding, textY - baseFont * 0.6);
  ctx.lineTo(canvasWidth - framePadding, textY - baseFont * 0.6);
  ctx.stroke();
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.font = `500 ${baseFont * 0.85}px ${FONT_FAMILIES.serif}`;
  ctx.fillStyle = config.colors.ink;
  ctx.fillText(fitText(ctx, line, canvasWidth * 0.85), framePadding, textY + baseFont * 0.1);
};

const drawBorderline = (ctx, layout, config, text) => {
  const { canvasWidth, canvasHeight, framePadding, useRightText } = layout;
  if (useRightText) {
    drawRightColumn(ctx, layout, config, text, { showDivider: true });
    return;
  }
  ctx.strokeStyle = withAlpha(config.colors.muted, 0.45);
  ctx.lineWidth = Math.max(1, framePadding * 0.05);
  ctx.strokeRect(
    framePadding * 0.35,
    framePadding * 0.35,
    canvasWidth - framePadding * 0.7,
    canvasHeight - framePadding * 0.7
  );
  ctx.strokeRect(
    framePadding * 0.75,
    framePadding * 0.75,
    canvasWidth - framePadding * 1.5,
    canvasHeight - framePadding * 1.5
  );
  drawClassic(ctx, layout, config, text);
};

const drawEditorial = (ctx, layout, config, text) => {
  const { canvasWidth, framePadding, textY, baseFont, useRightText } = layout;
  if (useRightText) {
    drawRightColumn(ctx, layout, config, text);
    return;
  }
  const line1 = text.leftMain || text.rightLine;
  const line2 = text.leftSub || '';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  if (line1) {
    ctx.font = `700 ${baseFont * 1.1}px ${FONT_FAMILIES.serif}`;
    ctx.fillStyle = config.colors.ink;
    ctx.fillText(fitText(ctx, line1, canvasWidth * 0.8), framePadding, textY - baseFont * 0.6);
  }
  if (line2) {
    ctx.font = `400 ${baseFont * 0.78}px ${FONT_FAMILIES.sans}`;
    ctx.fillStyle = config.colors.muted;
    ctx.fillText(fitText(ctx, line2, canvasWidth * 0.8), framePadding, textY + baseFont * 0.75);
  }
};

const drawMuseum = (ctx, layout, config, text) => {
  const { canvasWidth, canvasHeight, framePadding, textY, baseFont, useRightText } = layout;
  if (useRightText) {
    drawRightColumn(ctx, layout, config, text, { showDivider: true });
    return;
  }
  ctx.strokeStyle = withAlpha(config.colors.muted, 0.35);
  ctx.lineWidth = Math.max(1, baseFont * 0.06);
  ctx.strokeRect(framePadding * 0.6, framePadding * 0.6, canvasWidth - framePadding * 1.2, canvasHeight - framePadding * 1.2);
  drawGallery(ctx, layout, config, text);
  const plaqueText = compact([text.leftMain, text.leftSub]).join('  •  ') || text.rightLine;
  if (plaqueText) {
    const plaqueWidth = canvasWidth * 0.55;
    const plaqueHeight = baseFont * 1.6;
    ctx.fillStyle = withAlpha(config.colors.paper, config.plaqueOpacity ?? 0.9);
    ctx.fillRect((canvasWidth - plaqueWidth) / 2, textY + baseFont * 0.4, plaqueWidth, plaqueHeight);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `500 ${baseFont * 0.65}px ${FONT_FAMILIES.sans}`;
    ctx.fillStyle = config.colors.muted;
    ctx.fillText(fitText(ctx, plaqueText, plaqueWidth * 0.9), canvasWidth / 2, textY + baseFont * 1.2);
  }
};

const drawLagoon = (ctx, layout, config, text) => {
  const { canvasWidth, canvasHeight, framePadding, baseFont, useRightText } = layout;
  if (useRightText) {
    drawRightColumn(ctx, layout, config, text, { showDivider: true });
    return;
  }
  const barHeight = Math.max(baseFont * 3.2, layout.bottomBarHeight || baseFont * 3.6);
  const barY = canvasHeight - barHeight;
  const gradient = ctx.createLinearGradient(0, barY, canvasWidth, canvasHeight);
  gradient.addColorStop(0, 'rgba(11,123,120,0.75)');
  gradient.addColorStop(1, 'rgba(43,47,56,0.75)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, barY, canvasWidth, barHeight);

  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#F8FAFC';
  ctx.textAlign = 'left';
  if (text.leftMain) {
    ctx.font = `600 ${baseFont * 0.95}px ${FONT_FAMILIES.sans}`;
    ctx.fillText(text.leftMain, framePadding, barY + barHeight * 0.45);
  }
  if (text.leftSub) {
    ctx.font = `400 ${baseFont * 0.75}px ${FONT_FAMILIES.sans}`;
    ctx.fillStyle = 'rgba(248,250,252,0.75)';
    ctx.fillText(text.leftSub, framePadding, barY + barHeight * 0.75);
  }

  if (text.rightLine) {
    ctx.textAlign = 'right';
    ctx.font = `500 ${baseFont * 0.8}px ${FONT_FAMILIES.sans}`;
    ctx.fillStyle = '#F8FAFC';
    ctx.fillText(text.rightLine, canvasWidth - framePadding, barY + barHeight * 0.5);
  }
};

const drawPaletteCard = (ctx, layout, config, text, image) => {
  const { canvasWidth, canvasHeight, framePadding, baseFont } = layout;
  const barHeight = Math.max(baseFont * 5.2, layout.bottomBarHeight || baseFont * 5.6);
  const barY = canvasHeight - barHeight;

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, barY, canvasWidth, barHeight);

  const swatches = config.paletteOverrideEnabled
    ? config.paletteOverrides || []
    : samplePalette(image, 4);
  const swatchSize = Math.max(42, baseFont * 1.75);
  const swatchGap = Math.max(30, baseFont * 1.4);
  const totalWidth = swatches.length * swatchSize + (swatches.length - 1) * swatchGap;
  const startX = (canvasWidth - totalWidth) / 2;
  const centerY = barY + barHeight * 0.45;
  const labelY = centerY + swatchSize * 0.85;

  swatches.forEach((color, index) => {
    const x = startX + index * (swatchSize + swatchGap);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x + swatchSize / 2, centerY, swatchSize / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(15,23,42,0.08)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = '#4B5563';
    ctx.font = `500 ${baseFont * 0.6}px ${FONT_FAMILIES.sans}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(fitText(ctx, color, swatchSize + swatchGap - 4), x + swatchSize / 2, labelY);
  });

  if (text.leftMain) {
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#111827';
    ctx.font = `600 ${baseFont * 0.85}px ${FONT_FAMILIES.sans}`;
    ctx.fillText(text.leftMain, framePadding, barY + barHeight * 0.2);
  }
};

const drawGlassframe = (ctx, layout, config, text, image) => {
  const { canvasWidth, canvasHeight, framePadding, baseFont } = layout;
  const opacity = config.glassOpacity ?? 0.35;
  const blur = Math.max(0, config.glassBlur ?? 18);
  const innerX = framePadding;
  const innerY = framePadding;
  const innerW = canvasWidth - framePadding * 2;
  const innerH = canvasHeight - framePadding * 2;
  const radius = Math.max(0, config.imageRadius || 0);

  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, canvasWidth, canvasHeight);
  roundedRectPath(ctx, innerX, innerY, innerW, innerH, radius);
  ctx.clip('evenodd');
  ctx.filter = `blur(${blur}px)`;
  ctx.globalAlpha = opacity;
  drawImageCover(ctx, image, 0, 0, canvasWidth, canvasHeight);
  ctx.restore();

  ctx.save();
  const gradient = ctx.createLinearGradient(0, 0, canvasWidth, canvasHeight);
  gradient.addColorStop(0, 'rgba(255,255,255,0.5)');
  gradient.addColorStop(1, 'rgba(255,255,255,0.1)');
  ctx.fillStyle = gradient;
  ctx.globalAlpha = opacity * 0.9;
  ctx.beginPath();
  ctx.rect(0, 0, canvasWidth, canvasHeight);
  roundedRectPath(ctx, innerX, innerY, innerW, innerH, radius);
  ctx.clip('evenodd');
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);
  ctx.restore();

  ctx.strokeStyle = 'rgba(255,255,255,0.65)';
  ctx.lineWidth = Math.max(1, baseFont * 0.05);
  ctx.strokeRect(
    framePadding * 0.6,
    framePadding * 0.6,
    canvasWidth - framePadding * 1.2,
    canvasHeight - framePadding * 1.2
  );
  drawMinimal(ctx, layout, config, text);
};

const overlayImageCache = new Map();

const getOverlayImage = (src) => {
  if (!src) return null;
  const cached = overlayImageCache.get(src);
  if (cached) return cached.complete ? cached : null;
  const img = new Image();
  img.src = src;
  overlayImageCache.set(src, img);
  return null;
};

const drawOverlays = (ctx, layout, config) => {
  const { canvasWidth, canvasHeight, baseFont } = layout;
  const overlays = Array.isArray(config.overlays) ? config.overlays : [];
  overlays.forEach((overlay) => {
    const x = (overlay.x / 100) * canvasWidth;
    const y = (overlay.y / 100) * canvasHeight;
    const opacity = overlay.opacity ?? 1;
    ctx.save();
    ctx.globalAlpha = opacity;
    if (overlay.type === 'text') {
      const size = baseFont * (overlay.size || 1);
      ctx.fillStyle = overlay.color || '#ffffff';
      ctx.font = `600 ${size}px ${FONT_FAMILIES.sans}`;
      ctx.textBaseline = 'top';
      ctx.fillText(overlay.text || '', x, y);
    } else if (overlay.type === 'sticker') {
      const img = getOverlayImage(overlay.src);
      if (img) {
        const width = (overlay.width / 100) * canvasWidth;
        const height = (width / img.width) * img.height;
        ctx.drawImage(img, x, y, width, height);
      }
    }
    ctx.restore();
  });
};

const drawFloating = (ctx, layout, config, text, image) => {
  const { canvasWidth, canvasHeight, imageX, imageY, imageWidth, imageHeight, baseFont } = layout;
  ctx.fillStyle = config.colors.paper;
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  ctx.save();
  ctx.shadowColor = `rgba(15, 23, 42, ${config.shadowOpacity ?? 0.35})`;
  ctx.shadowBlur = config.shadowBlur ?? baseFont * 1.6;
  ctx.shadowOffsetY = config.shadowOffset ?? baseFont * 0.8;
  ctx.shadowOffsetX = 0;
  ctx.fillStyle = config.colors.paper;
  ctx.fillRect(imageX - baseFont * 0.55, imageY - baseFont * 0.55, imageWidth + baseFont * 1.1, imageHeight + baseFont * 1.1);
  ctx.restore();

  ctx.drawImage(image, imageX, imageY, imageWidth, imageHeight);
  drawClassic(ctx, layout, config, text);
};

const drawAtelier = (ctx, layout, config, text) => {
  const { canvasWidth, canvasHeight, framePadding, textY, baseFont } = layout;
  ctx.strokeStyle = withAlpha(config.colors.muted, 0.45);
  ctx.lineWidth = Math.max(1, baseFont * 0.05);
  ctx.strokeRect(framePadding * 0.8, framePadding * 0.8, canvasWidth - framePadding * 1.6, canvasHeight - framePadding * 1.6);
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  ctx.font = `500 ${baseFont * 0.6}px ${FONT_FAMILIES.sans}`;
  ctx.fillStyle = config.colors.muted;
  ctx.fillText('ATELIER EDIT', canvasWidth - framePadding, textY - baseFont * 1.6);
  drawClassic(ctx, layout, config, text);
};

const drawMonolith = (ctx, layout, config, text) => {
  const { canvasWidth, canvasHeight, textY, baseFont } = layout;
  ctx.save();
  ctx.globalAlpha = config.monolithOpacity ?? 0.18;
  ctx.fillStyle = config.colors.ink;
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);
  ctx.restore();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const line = compact([text.leftMain, text.leftSub, text.rightLine]).join('  |  ');
  if (line) {
    ctx.font = `500 ${baseFont * 0.85}px ${FONT_FAMILIES.sans}`;
    ctx.fillStyle = config.colors.paper;
    ctx.fillText(fitText(ctx, line, canvasWidth * 0.8), canvasWidth / 2, textY);
  }
};

const drawFolio = (ctx, layout, config, text) => {
  const { canvasWidth, framePadding, textY, baseFont } = layout;
  const line1 = text.leftMain || text.rightLine;
  const line2 = text.leftSub || '';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  if (line1) {
    ctx.font = `700 ${baseFont * 0.9}px ${FONT_FAMILIES.serif}`;
    ctx.fillStyle = config.colors.ink;
    ctx.fillText(fitText(ctx, line1, canvasWidth * 0.75), framePadding, textY - baseFont * 0.5);
  }
  if (line2) {
    ctx.font = `400 ${baseFont * 0.72}px ${FONT_FAMILIES.sans}`;
    ctx.fillStyle = config.colors.muted;
    ctx.fillText(fitText(ctx, line2, canvasWidth * 0.75), framePadding, textY + baseFont * 0.8);
  }
  ctx.strokeStyle = withAlpha(config.colors.muted, 0.35);
  ctx.lineWidth = Math.max(1, baseFont * 0.06);
  ctx.beginPath();
  ctx.moveTo(framePadding, textY + baseFont * 1.2);
  ctx.lineTo(canvasWidth - framePadding, textY + baseFont * 1.2);
  ctx.stroke();
};

const TEMPLATE_RENDERERS = {
  classic: drawClassic,
  postcard: drawPostcard,
  'postcard-note': drawPostcard,
  minimal: drawMinimal,
  gallery: drawGallery,
  cinema: drawCinema,
  noir: drawNoir,
  airy: drawAiry,
  mono: drawMono,
  caption: drawCaption,
  borderline: drawBorderline,
  editorial: drawEditorial,
  museum: drawMuseum,
  glassframe: drawGlassframe,
  lagoon: drawLagoon,
  'palette-card': drawPaletteCard,
  floating: drawFloating,
  atelier: drawAtelier,
  monolith: drawMonolith,
  folio: drawFolio,
};

export const renderFrame = (ctx, image, config, meta, options = {}) => {
  if (!ctx || !image) return;
  const { scale = 1 } = options;
  let drawImageSource = image;
  let drawConfig = config;
  if (config.textPosition === 'right' && RIGHT_TEXT_TEMPLATES.has(config.template)) {
    const rotated = document.createElement('canvas');
    rotated.width = image.height;
    rotated.height = image.width;
    const rctx = rotated.getContext('2d');
    if (rctx) {
      rctx.save();
      rctx.translate(rotated.width / 2, rotated.height / 2);
      rctx.rotate(Math.PI / 2);
      rctx.drawImage(image, -image.width / 2, -image.height / 2);
      rctx.restore();
      drawImageSource = rotated;
      drawConfig = { ...config, textPosition: 'bottom' };
    }
  }

  const layout = computeLayout(drawImageSource, drawConfig);
  const { canvasWidth, canvasHeight } = layout;

  ctx.canvas.width = Math.max(1, Math.round(canvasWidth * scale));
  ctx.canvas.height = Math.max(1, Math.round(canvasHeight * scale));

  ctx.save();
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  drawBase(ctx, layout, drawConfig, drawImageSource);

  const text = buildText(meta, drawConfig.fieldVisibility || {});
  const drawTemplate = TEMPLATE_RENDERERS[drawConfig.template] || drawClassic;
  if (drawTemplate === drawFloating || drawTemplate === drawGlassframe || drawTemplate === drawPaletteCard) {
    drawTemplate(ctx, layout, drawConfig, text, drawImageSource);
  } else {
    drawTemplate(ctx, layout, drawConfig, text);
  }

  drawOverlays(ctx, layout, drawConfig);

  ctx.restore();
};
