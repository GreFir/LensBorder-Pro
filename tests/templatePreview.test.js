import test from 'node:test';
import assert from 'node:assert/strict';
import { getTemplateConfig } from '../src/utils/templateConfig.js';
import { createThumbnailQueue } from '../src/utils/thumbnailQueue.js';

const config = Object.freeze({ template: 'classic', paletteId: 'light',
  colors: Object.freeze({ paper: '#ffffff' }), framePadding: 6,
  overlays: Object.freeze([{ id: 'gpx-location', text: 'GPS 30, 110' }]),
});

test('template preview preserves settings and never mutates the selected template', () => {
  const next = getTemplateConfig(config, 'gallery');
  assert.equal(next.template, 'gallery');
  assert.equal(config.template, 'classic');
  assert.equal(next.framePadding, 6);
  assert.equal(next.overlays, config.overlays);
  assert.equal(next.colors, config.colors);
});
test('Cinema thumbnail uses the same automatic palette as selecting Cinema', () => {
  const next = getTemplateConfig(config, 'cinema');
  assert.equal(next.paletteId, 'cinema');
  assert.equal(next.colors.paper, '#050505');
  assert.equal(config.colors.paper, '#ffffff');
});
test('custom colors are respected by Cinema too', () => {
  const custom = { ...config, paletteId: 'custom' };
  assert.equal(getTemplateConfig(custom, 'cinema').colors, custom.colors);
});

const harness = () => {
  let id = 0;
  const frames = new Map();
  const errors = [];
  const enqueue = createThumbnailQueue({
    request: (callback) => { frames.set(++id, callback); return id; },
    cancel: (key) => frames.delete(key),
    reportError: (error) => errors.push(error.message),
  });
  const tick = () => { const [key, fn] = frames.entries().next().value; frames.delete(key); fn(); };
  return { enqueue, frames, errors, tick };
};
test('renders only one thumbnail per frame', () => {
  const h = harness(), drawn = [];
  h.enqueue(() => drawn.push(1)); h.enqueue(() => drawn.push(2));
  assert.equal(h.frames.size, 1); h.tick(); assert.deepEqual(drawn, [1]);
  h.tick(); assert.deepEqual(drawn, [1, 2]); assert.equal(h.frames.size, 0);
});
test('cancelled jobs do not draw a stale photo', () => {
  const h = harness(), drawn = [];
  const cancel = h.enqueue(() => drawn.push('old'));
  cancel(); h.enqueue(() => drawn.push('current')); h.tick();
  assert.deepEqual(drawn, ['current']);
});
test('unmounting the last card cancels its scheduled frame', () => {
  const h = harness(); const cancel = h.enqueue(() => {});
  cancel(); cancel(); assert.equal(h.frames.size, 0);
});
test('one failed renderer does not prevent other templates from rendering', () => {
  const h = harness(); let completed = false;
  h.enqueue(() => { throw new Error('broken template'); });
  h.enqueue(() => { completed = true; }); h.tick(); h.tick();
  assert.equal(completed, true); assert.deepEqual(h.errors, ['broken template']);
});
test('an executing job may enqueue a successor without duplicate frames', () => {
  const h = harness(), drawn = [];
  h.enqueue(() => { drawn.push(1); h.enqueue(() => drawn.push(2)); });
  h.tick(); assert.equal(h.frames.size, 1); h.tick(); assert.deepEqual(drawn, [1, 2]);
});
