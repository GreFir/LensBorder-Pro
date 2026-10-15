import test from 'node:test';
import assert from 'node:assert/strict';
import { parseCameraTime, matchGpxPoint, withGpxOverlay } from '../src/utils/gpxUtils.js';

test('EXIF time uses explicit camera UTC offset', () => {
  assert.equal(parseCameraTime('2026:10:15 16:30:00', 480), Date.parse('2026-10-15T08:30:00Z'));
  assert.equal(parseCameraTime('2026.10.15 16:30'), Date.parse('2026-10-15T16:30:00Z'));
  assert.equal(parseCameraTime('2026:02:30 16:30:00'), null);
});

test('interpolates track coordinates and refuses distant timestamps', () => {
  const points = [
    { time: 1000000, lat: 30, lon: 110 },
    { time: 1060000, lat: 32, lon: 112 },
  ];
  assert.deepEqual(matchGpxPoint(points, 1030000), { lat: 31, lon: 111 });
  assert.equal(matchGpxPoint(points, 2000000), null);
  assert.deepEqual(matchGpxPoint(points, 1000000), { lat: 30, lon: 110 });
});

test('replaces generated GPS overlay without changing manually created overlays', () => {
  const input = { overlays: [{ id: 'manual', type: 'text', text: 'hello' }] };
  const matched = withGpxOverlay(input, { lat: 12.34, lon: -56.78 });
  assert.equal(matched.overlays.length, 2);
  assert.equal(matched.overlays[1].text, 'GPS 12.340000, -56.780000');
  assert.deepEqual(withGpxOverlay(matched, null).overlays, input.overlays);
});
