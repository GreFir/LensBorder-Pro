import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_UI_STYLE, UI_STYLE_KEY, UI_STYLES, getBrowserStorage, normalizeUiStyle, readUiStyle, writeUiStyle } from '../src/themes/preferences.js';

const memoryStorage = (initial = {}) => {
  const values = new Map(Object.entries(initial));
  return { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
};

test('new users get liquid glass without affecting color mode', () => {
  const storage = memoryStorage({ 'lensborder-theme-mode': 'dark' });
  assert.equal(readUiStyle(storage), 'glass');
  assert.equal(storage.getItem('lensborder-theme-mode'), 'dark');
  assert.equal(DEFAULT_UI_STYLE, 'glass');
});
test('catalog has three unique styles with labels and descriptions', () => {
  assert.deepEqual(UI_STYLES.map(({ id }) => id), ['glass', 'memphis', 'collage']);
  assert.ok(UI_STYLES.every(({ name, subtitle, english }) => name && subtitle && english));
  assert.ok(Object.isFrozen(UI_STYLES));
});
for (const style of ['glass', 'memphis', 'collage']) {
  test(`${style} persists and survives reloading preferences`, () => {
    const storage = memoryStorage();
    assert.equal(writeUiStyle(storage, style), style);
    assert.equal(storage.getItem(UI_STYLE_KEY), style);
    assert.equal(readUiStyle(storage), style);
  });
}
test('invalid or obsolete saved styles fall back to glass', () => {
  for (const value of ['', null, undefined, 'old-theme', '<script>', {}, 0]) {
    assert.equal(normalizeUiStyle(value), 'glass');
  }
  assert.equal(readUiStyle(memoryStorage({ [UI_STYLE_KEY]: 'obsolete' })), 'glass');
});
test('invalid writes store only a supported identifier', () => {
  const storage = memoryStorage();
  assert.equal(writeUiStyle(storage, 'untrusted-id'), 'glass');
  assert.equal(storage.getItem(UI_STYLE_KEY), 'glass');
});
test('blocked storage does not prevent choosing a theme', () => {
  const storage = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('full'); } };
  assert.equal(readUiStyle(storage), 'glass');
  assert.equal(writeUiStyle(storage, 'memphis'), 'memphis');
});
test('missing browser storage is safe in non-browser tests', () => {
  assert.equal(getBrowserStorage(), undefined);
  assert.equal(readUiStyle(undefined), 'glass');
  assert.equal(writeUiStyle(undefined, 'collage'), 'collage');
});
test('UI preference writes leave image configuration and mode untouched', () => {
  const photo = '{"template":"classic","colors":{"paper":"#ffffff"}}';
  const storage = memoryStorage({ 'lensborder-theme-mode': 'system', photo });
  writeUiStyle(storage, 'collage');
  assert.equal(storage.getItem('lensborder-theme-mode'), 'system');
  assert.equal(storage.getItem('photo'), photo);
});
