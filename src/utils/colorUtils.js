const toRgbString = ([r, g, b]) => `rgb(${r}, ${g}, ${b})`;
const toRgbaString = ([r, g, b], alpha = 0.35) => `rgba(${r}, ${g}, ${b}, ${alpha})`;

const kMeans = (points, k = 4, maxIter = 8) => {
  if (!points.length) return [];
  const centers = points.slice(0, k).map((p) => [...p]);
  const assign = new Array(points.length).fill(0);

  for (let iter = 0; iter < maxIter; iter += 1) {
    // assignment
    for (let i = 0; i < points.length; i += 1) {
      let best = 0;
      let bestDist = Infinity;
      for (let c = 0; c < centers.length; c += 1) {
        const dr = points[i][0] - centers[c][0];
        const dg = points[i][1] - centers[c][1];
        const db = points[i][2] - centers[c][2];
        const dist = dr * dr + dg * dg + db * db;
        if (dist < bestDist) {
          bestDist = dist;
          best = c;
        }
      }
      assign[i] = best;
    }

    // update
    const sums = Array.from({ length: k }, () => [0, 0, 0, 0]); // r,g,b,count
    for (let i = 0; i < points.length; i += 1) {
      const a = assign[i];
      const s = sums[a];
      s[0] += points[i][0];
      s[1] += points[i][1];
      s[2] += points[i][2];
      s[3] += 1;
    }
    for (let c = 0; c < k; c += 1) {
      if (sums[c][3] === 0) continue;
      centers[c][0] = Math.round(sums[c][0] / sums[c][3]);
      centers[c][1] = Math.round(sums[c][1] / sums[c][3]);
      centers[c][2] = Math.round(sums[c][2] / sums[c][3]);
    }
  }

  // order by population
  const counts = new Array(k).fill(0);
  for (const a of assign) counts[a] += 1;
  const ordered = centers
    .map((c, idx) => ({ color: c, count: counts[idx] }))
    .filter((c) => c.count > 0)
    .sort((a, b) => b.count - a.count);
  return ordered.map((c) => c.color);
};

export const extractImagePalette = (image) => {
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const size = 96;
    canvas.width = size;
    canvas.height = size;
    ctx.drawImage(image, 0, 0, size, size);

    const { data } = ctx.getImageData(0, 0, size, size);
    const colors = [];
    const step = 4 * 6; // roughly uniform sampling
    for (let i = 0; i < data.length; i += step) {
      const alpha = data[i + 3];
      if (alpha < 40) continue;
      colors.push([data[i], data[i + 1], data[i + 2]]);
    }

    if (colors.length === 0) return null;
    const clusters = kMeans(colors, 4, 8);
    const primary = toRgbString(clusters[0] || colors[0]);
    const secondary = toRgbaString(clusters[1] || clusters[0] || colors[0], 0.32);
    return { primary, secondary };
  } catch (error) {
    console.error('Palette extraction failed:', error);
    return null;
  }
};
