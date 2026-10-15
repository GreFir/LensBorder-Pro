// Run against the actual Vite application, not a static component fixture.
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

(async () => {
  const out = path.resolve('test-results/template-previews');
  await fs.mkdir(out, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, colorScheme: 'light' });
  page.setDefaultTimeout(15000);
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.addInitScript(() => { window.showSaveFilePicker = undefined; });
  // Avoid external font availability affecting pixel regression comparisons.
  await page.route('https://fonts.googleapis.com/**', (route) => route.abort());
  await page.route('https://fonts.gstatic.com/**', (route) => route.abort());
  try {
    await page.goto(process.env.PREVIEW_URL || 'http://127.0.0.1:5173');
    const cards = page.locator('.lb-template-card');
    assert.equal(await cards.count(), 24);
    assert.equal(await page.locator('svg.lb-template-thumbnail').count(), 24);
    console.log('PASS: empty library keeps all 24 template schematics');

    const makePhoto = async (width, height, base, accent) => Buffer.from(await page.evaluate(({ width, height, base, accent }) => {
      const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
      const ctx = canvas.getContext('2d'); ctx.fillStyle = base; ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = accent; ctx.fillRect(0, height * .58, width, height * .42);
      ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(width * .7, height * .27, width * .085, 0, 2 * Math.PI); ctx.fill();
      ctx.fillStyle = '#25334b'; ctx.beginPath(); ctx.moveTo(0, height * .78); ctx.lineTo(width * .33, height * .28); ctx.lineTo(width * .71, height); ctx.closePath(); ctx.fill();
      return canvas.toDataURL('image/png').split(',')[1];
    }, { width, height, base, accent }), 'base64');
    const landscape = await makePhoto(900, 600, '#399faa', '#daa467');
    const portrait = await makePhoto(500, 900, '#b24b78', '#59864d');
    await page.getByLabel('导入照片', { exact: true }).setInputFiles([
      { name: 'landscape.png', mimeType: 'image/png', buffer: landscape },
      { name: 'portrait.png', mimeType: 'image/png', buffer: portrait },
    ]);
    await page.waitForFunction(() => document.querySelectorAll('.lb-film-frame').length === 2);
    assert.equal(await page.locator('svg.lb-template-thumbnail').count(), 0);
    const classic = page.getByRole('button', { name: 'Classic', exact: true });
    const pixels = (card) => card.locator('canvas').evaluate((canvas) => canvas.toDataURL());
    const waitCard = async (card) => {
      await card.scrollIntoViewIfNeeded();
      await card.locator('[data-preview-state="ready"]').waitFor();
      const size = await card.locator('canvas').evaluate((c) => [c.width, c.height]);
      assert(size.every((v) => v > 1 && v <= 320), `unbounded thumbnail: ${size}`);
    };
    const renders = [];
    for (let i = 0; i < await cards.count(); i++) {
      const card = cards.nth(i); await waitCard(card); renders.push(await pixels(card));
    }
    assert(new Set(renders).size > 12, 'template-specific renders must not all be the same photo');
    console.log('PASS: all 24 templates render actual photos, bounded to 320px');
    await waitCard(classic);
    const initial = await pixels(classic);
    await page.getByPlaceholder('Canon', { exact: true }).fill('PREVIEW TEST');
    await page.waitForFunction((old) => document.querySelector('.lb-template-card[aria-label="Classic"] canvas').toDataURL() !== old, initial);
    console.log('PASS: EXIF/manual metadata changes redraw template previews');

    const source = await page.locator('.lb-film-frame[data-active="true"] img').getAttribute('src');
    await page.getByRole('button', { name: 'Cinema', exact: true }).click();
    assert.equal(await page.locator('.lb-film-frame[data-active="true"] img').getAttribute('src'), source);
    await classic.click(); await waitCard(classic);
    const beforeSwitch = await pixels(classic);
    await page.getByRole('button', { name: '选择照片 portrait.png', exact: true }).click();
    await waitCard(classic); assert.notEqual(await pixels(classic), beforeSwitch);
    // Exercise cancellation while switching faster than the thumbnail queue.
    for (const name of ['landscape.png', 'portrait.png', 'landscape.png']) {
      await page.getByRole('button', { name: `选择照片 ${name}`, exact: true }).click();
    }
    await waitCard(classic);
    assert.equal(await page.locator('.lb-film-frame[data-active="true"] img').getAttribute('alt'), 'landscape.png');
    console.log('PASS: photo selection and rapid switching do not show stale thumbnails');

    // Verify the renderer's new limit preserves logical geometry and also bounds
    // the temporary rotated canvas, without reducing normal preview/export size.
    const geometry = await page.evaluate(async () => {
      const { renderFrame } = await import('/src/utils/canvasUtils.js');
      const photo = document.createElement('canvas'); photo.width = 4000; photo.height = 3000;
      const ctx = photo.getContext('2d'); ctx.fillStyle = '#cf6e42'; ctx.fillRect(0, 0, 4000, 3000);
      const config = { template: 'classic', textPosition: 'right', framePadding: 6, bottomPadding: 12, fontScale: 1, colors: { paper: '#ffffff', ink: '#111111', muted: '#666666' }, fieldVisibility: {}, overlays: [] };
      const small = document.createElement('canvas');
      const temporary = [], create = document.createElement.bind(document);
      document.createElement = (...args) => { const el = create(...args); if (args[0] === 'canvas') temporary.push(el); return el; };
      try { renderFrame(small.getContext('2d'), photo, config, {}, { maxDimension: 320, preview: true }); }
      finally { document.createElement = create; }
      const normal = create('canvas'); renderFrame(normal.getContext('2d'), photo, config, {});
      return { small: [small.width, small.height], normal: [normal.width, normal.height], temporary: temporary.map((c) => [c.width, c.height]) };
    });
    assert(geometry.temporary.length > 0);
    assert(geometry.temporary.flat().every((v) => v <= 320));
    assert(geometry.small.every((v) => v <= 320));
    assert(Math.max(...geometry.normal) > 4000);
    assert(Math.abs(geometry.small[0] / geometry.small[1] - geometry.normal[0] / geometry.normal[1]) < .01);
    console.log('PASS: portrait/right-side geometry and bounded rotation; full-resolution export unchanged');

    await page.locator('.lb-appearance > summary').click();
    for (const theme of ['glass', 'memphis', 'collage']) {
      await page.locator(`.lb-theme-choice:has(input[value="${theme}"])`).click();
      await waitCard(classic);
      await page.screenshot({ path: path.join(out, `${theme}-live-thumbnails.png`) });
    }
    await page.locator('.lb-appearance > summary').click();
    await page.getByRole('button', { name: '收起左侧面板', exact: true }).click();
    await waitCard(classic);
    await page.screenshot({ path: path.join(out, 'collapsed-live-thumbnails.png') });
    await page.getByRole('button', { name: '展开左侧面板', exact: true }).click();
    console.log('PASS: all three UI themes and collapsed sidebar retain live thumbnails');
    const downloadEvent = page.waitForEvent('download');
    await page.locator('.lb-export').click();
    const download = await downloadEvent; await download.saveAs(path.join(out, 'export-smoke.jpg'));
    const bytes = await fs.readFile(path.join(out, 'export-smoke.jpg'));
    assert.equal(bytes[0], 0xff); assert.equal(bytes[1], 0xd8);
    console.log('PASS: actual app exports a JPEG after using live previews');
    await page.getByRole('button', { name: '清空图片', exact: true }).click();
    assert.equal(await page.locator('.lb-template-live').count(), 0);
    assert.equal(await page.locator('svg.lb-template-thumbnail').count(), 24);
    assert.deepEqual(errors, []);
    console.log('PASS: clearing photos restores placeholders; zero page script errors');
    await fs.writeFile(path.join(out, 'result.json'), JSON.stringify({ status: 'passed', templates: 24, screenshotThemes: 3, errors, geometry }, null, 2));
  } catch (error) {
    await page.screenshot({ path: path.join(out, 'failure.png') }).catch(() => {});
    await fs.writeFile(path.join(out, 'failure.txt'), String(error.stack));
    throw error;
  } finally { await browser.close(); }
})().catch((error) => { console.error(error); process.exitCode = 1; });
