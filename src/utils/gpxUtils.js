// GPX timestamps are UTC; camera EXIF timestamps usually have no timezone.
export const parseGpx = (xml) => {
  const document = new DOMParser().parseFromString(xml, 'application/xml');
  if (document.querySelector('parsererror')) throw new Error('Invalid GPX XML');
  const points = Array.from(document.getElementsByTagName('*'))
    .filter((element) => element.localName === 'trkpt' || element.localName === 'rtept')
    .map((element) => {
      const timeElement = Array.from(element.children).find((child) => child.localName === 'time');
      const time = Date.parse(timeElement?.textContent || '');
      const lat = Number(element.getAttribute('lat'));
      const lon = Number(element.getAttribute('lon'));
      if (!timeElement || !Number.isFinite(time) || !Number.isFinite(lat) ||
          !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) return null;
      return { time, lat, lon };
    })
    .filter(Boolean)
    .sort((a, b) => a.time - b.time);
  if (!points.length) throw new Error('GPX contains no timestamped track points');
  return points;
};

// EXIF DateTimeOriginal is a wall-clock time. offsetMinutes is camera time - UTC.
export const parseCameraTime = (value, offsetMinutes = 0) => {
  const match = String(value || '').match(/^(\d{4})[:.-](\d{2})[:.-](\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?/);
  if (!match) return null;
  const [, year, month, day, hour, minute, second = '0'] = match;
  const utc = Date.UTC(+year, +month - 1, +day, +hour, +minute, +second);
  const valid = new Date(utc);
  if (valid.getUTCFullYear() !== +year || valid.getUTCMonth() !== +month - 1 ||
      valid.getUTCDate() !== +day || valid.getUTCHours() !== +hour ||
      valid.getUTCMinutes() !== +minute || valid.getUTCSeconds() !== +second) return null;
  return utc - offsetMinutes * 60000;
};

export const matchGpxPoint = (points, timestamp, maxGapMs = 5 * 60 * 1000) => {
  if (!points?.length || !Number.isFinite(timestamp)) return null;
  let low = 0, high = points.length;
  while (low < high) {
    const mid = (low + high) >>> 1;
    if (points[mid].time < timestamp) low = mid + 1;
    else high = mid;
  }
  const before = points[low - 1], after = points[low];
  if (before && after && after.time !== before.time &&
      timestamp - before.time <= maxGapMs && after.time - timestamp <= maxGapMs) {
    const ratio = (timestamp - before.time) / (after.time - before.time);
    return { lat: before.lat + (after.lat - before.lat) * ratio,
      lon: before.lon + (after.lon - before.lon) * ratio };
  }
  const closest = [before, after].filter(Boolean).sort((a, b) =>
    Math.abs(a.time - timestamp) - Math.abs(b.time - timestamp))[0];
  return closest && Math.abs(closest.time - timestamp) <= maxGapMs ? closest : null;
};

export const withGpxOverlay = (config, point) => ({
  ...config,
  overlays: [
    ...(config.overlays || []).filter((overlay) => overlay.id !== 'gpx-location'),
    ...(point ? [{
      id: 'gpx-location', type: 'text',
      text: `GPS ${point.lat.toFixed(6)}, ${point.lon.toFixed(6)}`,
      color: '#ffffff', size: 1, x: 5, y: 5, opacity: 1,
    }] : []),
  ],
});
