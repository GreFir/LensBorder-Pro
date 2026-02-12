export const extractImagePalette = (image) => {
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const size = 64;
    canvas.width = size;
    canvas.height = size;
    ctx.drawImage(image, 0, 0, size, size);

    const { data } = ctx.getImageData(0, 0, size, size);
    let r = 0;
    let g = 0;
    let b = 0;
    let count = 0;

    for (let i = 0; i < data.length; i += 4) {
      const alpha = data[i + 3];
      if (alpha < 40) continue;
      r += data[i];
      g += data[i + 1];
      b += data[i + 2];
      count += 1;
    }

    if (!count) return null;

    r = Math.round(r / count);
    g = Math.round(g / count);
    b = Math.round(b / count);

    const primary = `rgb(${r}, ${g}, ${b})`;
    const secondary = `rgba(${r}, ${g}, ${b}, 0.35)`;
    return { primary, secondary };
  } catch (error) {
    console.error('Palette extraction failed:', error);
    return null;
  }
};
