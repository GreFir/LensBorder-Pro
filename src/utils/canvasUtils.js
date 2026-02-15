import { getCameraBrandLogoSrc, matchCameraBrand } from './logoAssets';

const FONT_FAMILIES = {
  sans: "'Manrope', sans-serif",
  serif: "'Cormorant Garamond', serif",
  times: "'Times New Roman', Times, serif",
};

const TEMPLATE_STYLES = {
  classic: { frameScale: 1, bottomScale: 1 },
  postcard: { frameScale: 1.1, bottomScale: 0.9 },
  'postcard-note': { frameScale: 1.1, bottomScale: 0.9 },
  'creator-signature': { frameScale: 0, bottomScale: 0 },
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
  'glass-brand': { frameScale: 2.3, bottomScale: 0 },
  lagoon: { frameScale: 1.1, bottomScale: 1.1 },
  'palette-card': { frameScale: 1.1, bottomScale: 1.05 },
  'palette-poem': { frameScale: 1.55, bottomScale: 1.95 },
  floating: { frameScale: 1.2, bottomScale: 0.9 },
  atelier: { frameScale: 1.5, bottomScale: 1.1 },
  monolith: { frameScale: 0.7, bottomScale: 0.6 },
  folio: { frameScale: 1.3, bottomScale: 1.05 },
  'camera-brand-strip': { frameScale: 1, bottomScale: 1.08 },
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

const kMeansPalette = (samples, k = 4, maxIter = 8) => {
  if (!samples.length) return [];
  const centers = samples.slice(0, k).map((p) => [...p]);
  const assign = new Array(samples.length).fill(0);
  for (let iter = 0; iter < maxIter; iter += 1) {
    for (let i = 0; i < samples.length; i += 1) {
      let best = 0;
      let bestDist = Infinity;
      for (let c = 0; c < centers.length; c += 1) {
        const dr = samples[i][0] - centers[c][0];
        const dg = samples[i][1] - centers[c][1];
        const db = samples[i][2] - centers[c][2];
        const dist = dr * dr + dg * dg + db * db;
        if (dist < bestDist) {
          bestDist = dist;
          best = c;
        }
      }
      assign[i] = best;
    }
    const sums = Array.from({ length: k }, () => [0, 0, 0, 0]);
    for (let i = 0; i < samples.length; i += 1) {
      const s = sums[assign[i]];
      s[0] += samples[i][0];
      s[1] += samples[i][1];
      s[2] += samples[i][2];
      s[3] += 1;
    }
    for (let c = 0; c < k; c += 1) {
      if (sums[c][3] === 0) continue;
      centers[c][0] = Math.round(sums[c][0] / sums[c][3]);
      centers[c][1] = Math.round(sums[c][1] / sums[c][3]);
      centers[c][2] = Math.round(sums[c][2] / sums[c][3]);
    }
  }
  const counts = new Array(k).fill(0);
  for (const a of assign) counts[a] += 1;
  return centers
    .map((c, idx) => ({ color: c, count: counts[idx] }))
    .filter((c) => c.count > 0)
    .sort((a, b) => b.count - a.count)
    .map((c) => `#${toHex(c.color[0])}${toHex(c.color[1])}${toHex(c.color[2])}`.toUpperCase());
};

const samplePalette = (image, count = 4) => {
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return [];
    const size = 96;
    canvas.width = size;
    canvas.height = size;
    ctx.drawImage(image, 0, 0, size, size);

    const { data } = ctx.getImageData(0, 0, size, size);
    const samples = [];
    const step = 4 * 6;
    for (let i = 0; i < data.length; i += step) {
      const alpha = data[i + 3];
      if (alpha < 40) continue;
      samples.push([data[i], data[i + 1], data[i + 2]]);
    }
    if (samples.length === 0) return [];
    return kMeansPalette(samples, count, 8).slice(0, count);
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

const percentOffsetToPx = (percentValue, referenceSize) => {
  const percent = Number.isFinite(percentValue) ? percentValue : 0;
  const size = Number.isFinite(referenceSize) ? referenceSize : 0;
  return (size * percent) / 100;
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
  const noBottomBar = new Set(['minimal', 'mono', 'glassframe', 'glass-brand', 'creator-signature']);
  const useRightText =
    config.textPosition === 'right' && RIGHT_TEXT_TEMPLATES.has(config.template);
  const sideBarWidth = useRightText ? Math.max(base * 0.22, 220) : 0;

  const noFrameTemplates = new Set(['minimal', 'creator-signature']);
  const framePadding =
    noFrameTemplates.has(config.template) ? 0 : Math.max(6, basePadding * style.frameScale);
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

const drawBase = (ctx, layout, config, image, options = {}) => {
  const { canvasWidth, canvasHeight, imageX, imageY, imageWidth, imageHeight } = layout;
  const radius = Math.max(0, config.imageRadius || 0);
  const transparentBackground =
    options.preview && config.template === 'creator-signature' && radius > 0;

  if (!transparentBackground) {
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
  }
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
  const stampImage = getOverlayImage(config.postcardStampSrc);

  ctx.save();
  ctx.translate(stampX, stampY);
  ctx.beginPath();
  ctx.arc(stamp / 2, stamp / 2, stamp / 2, 0, Math.PI * 2);
  ctx.clip();
  if (stampImage) {
    drawImageCover(ctx, stampImage, 0, 0, stamp, stamp);
  } else {
    ctx.fillStyle = withAlpha(config.colors.paper, 0.4);
    ctx.fillRect(0, 0, stamp, stamp);
  }
  ctx.restore();

  ctx.save();
  ctx.translate(stampX, stampY);
  ctx.setLineDash([4, 2]);
  ctx.strokeStyle = withAlpha(config.colors.muted, 0.7);
  ctx.lineWidth = Math.max(1, baseFont * 0.06);
  ctx.beginPath();
  ctx.arc(stamp / 2, stamp / 2, stamp / 2, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);

  if (!stampImage) {
    ctx.fillStyle = config.colors.ink;
    ctx.font = `600 ${baseFont * 0.5}px ${FONT_FAMILIES.sans}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('STAMP', stamp / 2, stamp / 2);
  }
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
  const { canvasWidth, canvasHeight, framePadding, baseFont, imageX, imageY, imageWidth, imageHeight } = layout;

  // rely on base image draw; only add palette bar and text
  const barHeight = Math.max(baseFont * 4.2, 82);
  const barY = imageY + imageHeight + baseFont * 1.6;
  const barX = imageX - framePadding * 0.4;
  const barWidth = imageWidth + framePadding * 0.8;

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(barX, barY, barWidth, barHeight);
  ctx.strokeStyle = 'rgba(15,23,42,0.08)';
  ctx.lineWidth = 1;
  ctx.strokeRect(barX, barY, barWidth, barHeight);

  const swatches = config.paletteOverrideEnabled ? config.paletteOverrides || [] : samplePalette(image, 4);
  const swatchSize = Math.max(26, baseFont * 1.1);
  const swatchGap = Math.max(100, baseFont * 1.2);
  const totalWidth = swatches.length * swatchSize + (swatches.length - 1) * swatchGap;
  const startX = imageX + imageWidth / 2 - totalWidth / 2;
  const centerY = barY + barHeight * 0.68;
  const labelY = centerY + swatchSize * 0.95;

  // title block above swatches
  const titleY = barY + baseFont * 0.9;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#0F172A';
  ctx.font = `700 ${baseFont * 0.9}px ${FONT_FAMILIES.sans}`;
  const title = text.leftMain || 'Palette Card';
  ctx.fillText(fitText(ctx, title, barWidth * 0.9), barX + barWidth / 2, titleY);

  if (text.leftSub) {
    ctx.fillStyle = '#94A3B8';
    ctx.font = `500 ${baseFont * 0.68}px ${FONT_FAMILIES.sans}`;
    ctx.fillText(
      fitText(ctx, text.leftSub, barWidth * 0.9),
      barX + barWidth / 2,
      titleY + baseFont * 0.9
    );
  }

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
    ctx.font = `600 ${baseFont * 0.52}px ${FONT_FAMILIES.sans}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const maxWidth = swatchSize + swatchGap + 12;
    ctx.fillText(fitText(ctx, color, maxWidth), x + swatchSize / 2, labelY);
  });
};


const drawPalettePoem = (ctx, layout, config, text, image, meta = {}) => {
  const {
    canvasWidth,
    canvasHeight,
    framePadding,
    imageY,
    imageHeight,
    baseFont,
  } = layout;

  const visibility = config.fieldVisibility || {};
  const pick = (key) => (visibility[key] ? (meta[key] || '').toString().trim() : '');

  const make = pick('make');
  const model = pick('model');
  const lens = pick('lens');
  const dateTime = pick('dateTime');

  const brand = make || model || 'CAMERA';
  const modelLabel = make && model ? model : model || '';
  const detailLine = text.rightLine || '';
  const title = (config.poemCardTitle || '').toString().trim() || 'Mountain Flower';
  const poemLines = (config.poemCardLines || [])
    .map((line) => (line || '').toString().trim())
    .filter(Boolean)
    .slice(0, 8);

  const swatches = config.paletteOverrideEnabled
    ? config.paletteOverrides || []
    : samplePalette(image, 4);

  const bottomTop = imageY + imageHeight + Math.max(baseFont * 0.45, 10);

  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';

  ctx.fillStyle = '#0F172A';
  ctx.font = `700 ${baseFont * 1.7}px ${FONT_FAMILIES.sans}`;
  ctx.fillText(fitText(ctx, brand.toUpperCase(), canvasWidth * 0.46), framePadding, framePadding * 0.45);

  if (modelLabel) {
    ctx.fillStyle = '#6B7280';
    ctx.font = `600 ${baseFont * 0.55}px ${FONT_FAMILIES.sans}`;
    ctx.fillText(
      fitText(ctx, modelLabel.toUpperCase(), canvasWidth * 0.46),
      framePadding,
      framePadding * 0.45 + baseFont * 1.9
    );
  }

  ctx.fillStyle = '#111827';
  ctx.font = `700 ${baseFont * 1.02}px ${FONT_FAMILIES.sans}`;
  ctx.fillText(fitText(ctx, title.toUpperCase(), canvasWidth * 0.58), framePadding, bottomTop + baseFont * 0.1);

  const infoLines = [
    dateTime ? `PHOTOGRAPHED IN : ${dateTime}` : '',
    detailLine,
    lens,
  ].filter(Boolean);

  ctx.fillStyle = '#6B7280';
  ctx.font = `600 ${baseFont * 0.58}px ${FONT_FAMILIES.sans}`;
  infoLines.forEach((line, idx) => {
    ctx.fillText(
      fitText(ctx, line.toUpperCase(), canvasWidth * 0.62),
      framePadding,
      bottomTop + baseFont * (1.85 + idx * 0.9)
    );
  });

  const poemBaseY = bottomTop + baseFont * (1.85 + infoLines.length * 0.95 + 0.35);
  ctx.fillStyle = '#4B5563';
  ctx.font = `500 ${baseFont * 0.64}px ${FONT_FAMILIES.serif}`;
  poemLines.forEach((line, idx) => {
    ctx.fillText(
      fitText(ctx, line, canvasWidth * 0.62),
      framePadding,
      poemBaseY + idx * baseFont * 0.9
    );
  });

  const swatchHeight = Math.max(baseFont * 0.95, 16);
  const swatchWidth = Math.max(baseFont * 2.35, 34);
  const swatchGap = Math.max(baseFont * 0.18, 2);
  const totalWidth = swatches.length * swatchWidth + Math.max(0, swatches.length - 1) * swatchGap;
  const swatchStartX = canvasWidth - framePadding - totalWidth;
  const swatchY = canvasHeight - framePadding - swatchHeight * 1.55;

  swatches.forEach((color, index) => {
    const x = swatchStartX + index * (swatchWidth + swatchGap);
    ctx.fillStyle = color;
    ctx.fillRect(x, swatchY, swatchWidth, swatchHeight);
    ctx.strokeStyle = 'rgba(15,23,42,0.08)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, swatchY + 0.5, swatchWidth - 1, swatchHeight - 1);
  });
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
const OVERLAY_READY_EVENT = 'lensborder-overlay-ready';

const getOverlayImage = (src) => {
  if (!src) return null;
  const cached = overlayImageCache.get(src);
  if (cached) return cached.complete ? cached : null;
  const img = new Image();
  img.onload = () => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event(OVERLAY_READY_EVENT));
    }
  };
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

const drawCreatorSignature = (ctx, layout, config, text, _image, meta = {}) => {
  const { canvasWidth, canvasHeight, framePadding, baseFont, imageX, imageY, imageWidth, imageHeight } = layout;
  const visibility = config.fieldVisibility || {};
  const read = (key) => (visibility[key] ? (meta[key] || '').toString().trim() : '');

  const make = read('make');
  const model = read('model');
  const artist = read('artist');
  const brand = make || model;
  const modelLine = make && model ? model : '';
  const specLine = text.rightLine || '';
  const infoLine = compact([modelLine, specLine]).join('   ');
  const authorName = artist;
  const authorBio = (config.authorBio || '').toString().trim() || 'Photographer';
  const metaOffsetY = percentOffsetToPx(config.metaOffsetY, canvasHeight);

  const radius = Math.max(0, config.imageRadius || 0);
  if (radius > 0) {
    ctx.save();
    ctx.beginPath();
    roundedRectPath(ctx, imageX, imageY, imageWidth, imageHeight, radius);
    ctx.closePath();
    ctx.clip();
  }

  const topShade = ctx.createLinearGradient(0, 0, 0, canvasHeight * 0.36);
  topShade.addColorStop(0, 'rgba(15,23,42,0.45)');
  topShade.addColorStop(1, 'rgba(15,23,42,0)');
  ctx.fillStyle = topShade;
  ctx.fillRect(0, 0, canvasWidth, canvasHeight * 0.36);

  const bottomShade = ctx.createLinearGradient(0, canvasHeight, 0, canvasHeight * 0.56);
  bottomShade.addColorStop(0, 'rgba(15,23,42,0.66)');
  bottomShade.addColorStop(1, 'rgba(15,23,42,0)');
  ctx.fillStyle = bottomShade;
  ctx.fillRect(0, canvasHeight * 0.56, canvasWidth, canvasHeight * 0.44);

  const avatarScale = Math.max(0.6, config.creatorAvatarScale ?? 1);
  const avatarSize = Math.max(baseFont * 1.8 * avatarScale, 24);
  const gap = Math.max(baseFont * 0.45, 10);

  ctx.textBaseline = 'middle';
  ctx.font = `600 ${baseFont * 0.85}px ${FONT_FAMILIES.sans}`;
  const nameWidth = authorName ? ctx.measureText(authorName).width : 0;
  ctx.font = `500 ${baseFont * 0.62}px ${FONT_FAMILIES.sans}`;
  const bioWidth = authorBio ? ctx.measureText(authorBio).width : 0;
  const infoWidth = Math.max(nameWidth, bioWidth, baseFont * 2.2);
  const showAuthorRow = visibility.artist && Boolean(config.authorAvatarSrc || authorName || authorBio);

  if (showAuthorRow) {
    const rowWidth = avatarSize + gap + infoWidth;
    const rowX = (canvasWidth - rowWidth) / 2;
    const rowBaseY = Math.max(framePadding * 0.65, baseFont * 0.4);
    const rowY = rowBaseY + (config.creatorHeaderOffset ?? 0);
    const avatarImage = getOverlayImage(config.authorAvatarSrc);

    ctx.save();
    ctx.beginPath();
    ctx.arc(rowX + avatarSize / 2, rowY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
    ctx.clip();
    if (avatarImage) {
      drawImageCover(ctx, avatarImage, rowX, rowY, avatarSize, avatarSize);
    } else {
      ctx.fillStyle = 'rgba(255,255,255,0.28)';
      ctx.fillRect(rowX, rowY, avatarSize, avatarSize);
      const initial = (authorName || 'A').slice(0, 1).toUpperCase();
      ctx.fillStyle = 'rgba(255,255,255,0.92)';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `700 ${baseFont * 0.82}px ${FONT_FAMILIES.sans}`;
      ctx.fillText(initial, rowX + avatarSize / 2, rowY + avatarSize / 2);
    }
    ctx.restore();

    ctx.strokeStyle = 'rgba(255,255,255,0.65)';
    ctx.lineWidth = Math.max(1, baseFont * 0.05);
    ctx.beginPath();
    ctx.arc(rowX + avatarSize / 2, rowY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
    ctx.stroke();

    const infoX = rowX + avatarSize + gap;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(2, 6, 23, 0.5)';
    ctx.shadowBlur = Math.max(4, baseFont * 0.2);

    if (authorName) {
      ctx.font = `600 ${baseFont * 0.85}px ${FONT_FAMILIES.sans}`;
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(authorName, infoX, rowY + avatarSize * 0.38);
    }

    if (authorBio) {
      ctx.font = `500 ${baseFont * 0.62}px ${FONT_FAMILIES.sans}`;
      ctx.fillStyle = 'rgba(255,255,255,0.82)';
      ctx.fillText(authorBio, infoX, rowY + avatarSize * 0.74);
    }

    ctx.shadowBlur = 0;
  }

  const brandY = canvasHeight - Math.max(baseFont * 1.95, 24) + metaOffsetY;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';

  if (brand) {
    ctx.font = `700 ${baseFont * 2.1}px ${FONT_FAMILIES.serif}`;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(fitText(ctx, brand, canvasWidth * 0.72), canvasWidth / 2, brandY);
  }

  if (infoLine) {
    ctx.font = `500 ${baseFont * 0.84}px ${FONT_FAMILIES.sans}`;
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.fillText(fitText(ctx, infoLine, canvasWidth * 0.8), canvasWidth / 2, brandY + baseFont * 1.25);
  }

  if (radius > 0) {
    ctx.restore();
  }
};

const drawGlassBrand = (ctx, layout, config, text, image, meta = {}) => {
  const {
    canvasWidth,
    canvasHeight,
    imageX,
    imageY,
    imageWidth,
    imageHeight,
    baseFont,
  } = layout;

  const opacity = Math.min(0.95, (config.glassOpacity ?? 0.35) + 0.18);
  const blur = Math.max(8, (config.glassBlur ?? 18) * 1.35);
  const radius = Math.max(0, config.imageRadius || 0);
  const metaOffsetY = percentOffsetToPx(config.metaOffsetY, canvasHeight);

  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, canvasWidth, canvasHeight);
  roundedRectPath(ctx, imageX, imageY, imageWidth, imageHeight, radius);
  ctx.clip('evenodd');
  ctx.filter = `blur(${blur}px)`;
  ctx.globalAlpha = opacity;
  drawImageCover(ctx, image, 0, 0, canvasWidth, canvasHeight);
  ctx.restore();

  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, canvasWidth, canvasHeight);
  roundedRectPath(ctx, imageX, imageY, imageWidth, imageHeight, radius);
  ctx.clip('evenodd');
  const glassGradient = ctx.createLinearGradient(0, 0, canvasWidth, canvasHeight);
  glassGradient.addColorStop(0, 'rgba(255,255,255,0.55)');
  glassGradient.addColorStop(0.45, 'rgba(255,255,255,0.16)');
  glassGradient.addColorStop(1, 'rgba(255,255,255,0.45)');
  ctx.fillStyle = glassGradient;
  ctx.globalAlpha = opacity;
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);
  ctx.restore();

  const visibility = config.fieldVisibility || {};
  const make = visibility.make ? (meta.make || '').toString().trim() : '';
  const model = visibility.model ? (meta.model || '').toString().trim() : '';
  const brand = make || model;
  const modelLine = make && model ? model : '';
  const detailLine = compact([modelLine, text.rightLine]).join('   ');

  const borderBandHeight = canvasHeight - (imageY + imageHeight);
  const brandY = imageY + imageHeight + borderBandHeight * 0.55 + metaOffsetY;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.shadowColor = 'rgba(15, 23, 42, 0.5)';
  ctx.shadowBlur = Math.max(5, baseFont * 0.25);

  if (brand) {
    ctx.font = `700 ${baseFont * 2.2}px ${FONT_FAMILIES.serif}`;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(fitText(ctx, brand, imageWidth * 0.72), imageX + imageWidth / 2, brandY);
  }

  if (detailLine) {
    ctx.font = `500 ${baseFont * 0.82}px ${FONT_FAMILIES.sans}`;
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.fillText(
      fitText(ctx, detailLine, imageWidth * 0.84),
      imageX + imageWidth / 2,
      brandY + baseFont * 1.2
    );
  }

  ctx.shadowBlur = 0;
};

const drawCameraBrandStrip = (ctx, layout, config, text, _image, meta = {}) => {
  const { canvasWidth, framePadding, textY, baseFont } = layout;
  const visibility = config.fieldVisibility || {};
  const read = (key) => (visibility[key] ? (meta[key] || '').toString().trim() : '');

  // 1. 数据准备
  const make = read('make');
  const model = read('model');
  const lens = read('lens');
  const dateTime = read('dateTime');

  const leftTitle = model || make || 'CAMERA';
  const leftSubtitle = dateTime || '';
  const rightMain = text.rightLine || compact([make, model]).join(' ');
  const rightSub = lens || compact([make, model]).join(' ');
  const matchedBrand = matchCameraBrand(meta);
  const logoSrc = matchedBrand?.logoSrc || getCameraBrandLogoSrc(meta);
  const logoImage = getOverlayImage(logoSrc);

  // 2. 布局计算
  const contentWidth = canvasWidth - framePadding * 2;
  // 比例分配：左侧 36%，Logo 24%，右侧 40%
  const leftWidth = contentWidth * 0.36;
  const logoWidth = contentWidth * 0.24;
  const rightWidth = contentWidth - leftWidth - logoWidth;
  // 固定百分比间距：logo 到分隔线的留白占整行宽度
  const dividerGapRatio = Math.min(0.03, Math.max(0.005, (config.cameraBrandDividerGap ?? 1.5) / 100));
  const rightTextGapRatio = Math.min(
    0.08,
    Math.max(0.008, (config.cameraBrandRightTextGap ?? 2.2) / 100)
  );

  const leftX = framePadding;
  const logoCenterX = framePadding + leftWidth + logoWidth / 2;
  
  // 右侧区域的起始点（也是 Logo 区域的终点）
  const rightX = framePadding + leftWidth + logoWidth; 

  // 右侧参数列固定在右侧；分隔线与参数的距离由滑块控制
  const rightTextBaseX = rightX + rightWidth;
  const rightTextWidthRatio = Math.min(
    1,
    Math.max(0.6, (config.cameraBrandRightTextWidth ?? 96) / 100)
  );
  const rightTextMaxWidth = rightWidth * rightTextWidthRatio;
  const rightTextLeftX = rightTextBaseX - rightTextMaxWidth;
  const rawSeparatorX = rightTextLeftX - contentWidth * rightTextGapRatio;
  const separatorMinX = framePadding + leftWidth + logoWidth * 0.45;
  const separatorMaxX = rightTextLeftX - Math.max(6, baseFont * 0.24);
  const separatorX = Math.min(separatorMaxX, Math.max(separatorMinX, rawSeparatorX));

  const titleY = textY - baseFont * 0.58;
  const subY = textY + baseFont * 0.72;

  // 3. 绘制分割线 (在 Logo 和 右侧参数 之间)
  if (config.colors.muted) {
    ctx.strokeStyle = withAlpha(config.colors.muted, 0.38);
    ctx.lineWidth = Math.max(1, baseFont * 0.04);
    ctx.beginPath();
    // 稍微调整一下线的高度，让它看起来更像一个分隔符
    ctx.moveTo(separatorX, textY - baseFont * 1.0);
    ctx.lineTo(separatorX, textY + baseFont * 1.0);
    ctx.stroke();
  }

  // 4. 绘制左侧文字 (左对齐)
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  if (leftTitle) {
    ctx.font = `600 ${baseFont * 1.18}px ${FONT_FAMILIES.sans}`;
    ctx.fillStyle = config.colors.ink;
    ctx.fillText(fitText(ctx, leftTitle, leftWidth * 0.95), leftX, titleY);
  }
  if (leftSubtitle) {
    ctx.font = `500 ${baseFont * 0.9}px ${FONT_FAMILIES.sans}`;
    ctx.fillStyle = config.colors.muted;
    ctx.fillText(fitText(ctx, leftSubtitle, leftWidth * 0.95), leftX, subY);
  }

  // 5. 绘制 Logo (居中，等比例缩放)
  if (logoImage) {
    const brandScaleMap = {
      sigma: 1.3,
      leica: 1.38,
      olympus: 1.28,
      nikon: 1.28,
    };
    const brandScale = brandScaleMap[matchedBrand?.key] || 1;
    const userScale = Math.min(2, Math.max(0.7, config.cameraBrandLogoScale || 1));
    const finalScale = brandScale * userScale;
    const imgWidth = logoImage.width || 200;
    const imgHeight = logoImage.height || 100;
    const aspectRatio = imgWidth / imgHeight;

    const targetHeight = baseFont * 1.15 * finalScale;
    let drawWidth = targetHeight * aspectRatio;
    let drawHeight = targetHeight;

    // 宽度限制：防止 Logo 太宽撞到右边的分割线
    // 留出 15% 的安全余量
    const dividerSafeGap = Math.max(contentWidth * dividerGapRatio, 8);
    const leftSafeGap = Math.max(4, baseFont * 0.16);
    const logoLeftLimit = framePadding + leftWidth + leftSafeGap;
    const logoRightLimit = separatorX - dividerSafeGap;
    const maxLogoWidth = Math.max(12, logoRightLimit - logoLeftLimit);
    
    if (drawWidth > maxLogoWidth) {
      drawWidth = maxLogoWidth;
      drawHeight = drawWidth / aspectRatio;
    }

    // 贴分隔线右对齐，保证调节间距时视觉变化明确
    const drawX = Math.max(logoLeftLimit, logoRightLimit - drawWidth);
    const drawY = textY - drawHeight / 2; 

    ctx.drawImage(logoImage, drawX, drawY, drawWidth, drawHeight);
    
  } else {
    const fallbackBrand = (matchedBrand?.key || make || model || '').toUpperCase();
    if (fallbackBrand) {
      ctx.textAlign = 'center';
      ctx.font = `700 ${baseFont * 0.76}px ${FONT_FAMILIES.serif}`;
      ctx.fillStyle = config.colors.ink;
      ctx.fillText(fitText(ctx, fallbackBrand, logoWidth * 0.9), logoCenterX, textY + baseFont * 0.04);
    }
  }

  // 6. 绘制右侧文字 (右对齐，右侧固定)
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';

  const drawAdaptiveRightLine = (line, options) => {
    if (!line) return;
    const {
      color,
      y,
      weight = 300,
      startScale,
      minScale,
    } = options;

    const minFontPx = 9;
    let size = Math.max(minFontPx, baseFont * startScale);
    const minSize = Math.max(minFontPx, baseFont * minScale);

    while (size >= minSize) {
      ctx.font = `${weight} ${size}px ${FONT_FAMILIES.times}`;
      if (ctx.measureText(line).width <= rightTextMaxWidth) {
        ctx.fillStyle = color;
        ctx.fillText(line, rightTextBaseX, y);
        return;
      }
      size -= Math.max(0.35, baseFont * 0.03);
    }

    ctx.font = `${weight} ${minSize}px ${FONT_FAMILIES.times}`;
    ctx.fillStyle = color;
    ctx.fillText(fitText(ctx, line, rightTextMaxWidth), rightTextBaseX, y);
  };

  drawAdaptiveRightLine(rightMain, {
    color: config.colors.ink,
    y: titleY - baseFont * 0.06,
    weight: 300,
    startScale: 0.98,
    minScale: 0.62,
  });

  drawAdaptiveRightLine(rightSub, {
    color: config.colors.muted,
    y: subY + baseFont * 0.04,
    weight: 300,
    startScale: 0.72,
    minScale: 0.54,
  });
};

const TEMPLATE_RENDERERS = {
  classic: drawClassic,
  postcard: drawPostcard,
  'postcard-note': drawPostcard,
  'creator-signature': drawCreatorSignature,
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
  'glass-brand': drawGlassBrand,
  lagoon: drawLagoon,
  'palette-card': drawPaletteCard,
  'palette-poem': drawPalettePoem,
  floating: drawFloating,
  atelier: drawAtelier,
  monolith: drawMonolith,
  folio: drawFolio,
  'camera-brand-strip': drawCameraBrandStrip,
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

  drawBase(ctx, layout, drawConfig, drawImageSource, options);

  const text = buildText(meta, drawConfig.fieldVisibility || {});
  const drawTemplate = TEMPLATE_RENDERERS[drawConfig.template] || drawClassic;
  drawTemplate(ctx, layout, drawConfig, text, drawImageSource, meta);

  drawOverlays(ctx, layout, drawConfig);

  ctx.restore();
};

