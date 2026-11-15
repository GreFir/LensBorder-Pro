import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { isJpeg, readJpeg, inspectJpeg, packGainMap, extractSdrJpeg, normalizeOrientation } from '../src/utils/hdr/jpeg.js';
import { srgbToLinear, linearToSrgb, logGain, encodeGain, recoverLinear, resolveExportMode, validateMetadata } from '../src/utils/hdr/math.js';
import { assertSize, RIGHT_TEXT_TEMPLATES } from '../src/utils/hdr/canvas.js';

const jpg = Uint8Array.of(0xff,0xd8, 0xff,0xe0,0,6,0,0xff,0xd9,0, 0xff,0xc0,0,11,8,0,2,0,3,1,1,0x11,0,
  0xff,0xda,0,8,1,1,0,0,63,0, 1,2,0xff,0,3,0xff,0xd0,4, 0xff,0xd9);
const metadata = { min:[0,0,0], max:[2,2,2], gamma:[1,1,1], offsetSdr:[1/64,1/64,1/64], offsetHdr:[1/64,1/64,1/64], capacityMin:0, capacityMax:2 };

test('JPEG walker ignores embedded EOI and entropy escapes/restart markers', () => {
  const info=readJpeg(jpg); assert.equal(info.end,jpg.length); assert.equal(info.width,3); assert.equal(info.height,2);
});
test('non-JPEG, missing EOI and invalid segment lengths are rejected', () => {
  assert.equal(isJpeg(new Uint8Array()),false);
  assert.throws(()=>readJpeg(new Uint8Array()));
  assert.throws(()=>readJpeg(jpg.subarray(0,jpg.length-1)));
  assert.throws(()=>readJpeg(Uint8Array.of(255,216,255,225,0,1,255,217)));
});
test('plain JPEG is SDR and extraction is byte-identical', () => {
  assert.equal(inspectJpeg(jpg).status,'sdr'); assert.deepEqual(extractSdrJpeg(jpg),jpg);
});
test('JPEG/R metadata and MPF offsets round-trip', () => {
  const packed=packGainMap(jpg,jpg,{min:0,max:2,capacity:2});
  const info=inspectJpeg(packed); assert.equal(info.status,'hdr');
  assert.equal(info.primary.end,info.gainMap.start); assert.equal(info.gainMap.end,packed.length);
  assert.deepEqual(extractSdrJpeg(packed),jpg);
  assert.match(info.xml,/GainMapMax="2"/);
});
test('damaged MPF is unknown, never a silent SDR classification', () => {
  const packed=packGainMap(jpg,jpg,{min:0,max:2,capacity:2});
  assert.equal(inspectJpeg(packed.subarray(0,packed.length-1)).status,'unknown');
});
test('invalid output metadata cannot be packaged', () => {
  for(const range of [{min:0,max:0,capacity:2},{min:1,max:2,capacity:2},{min:0,max:Infinity,capacity:2},{min:0,max:2,capacity:0}]) assert.throws(()=>packGainMap(jpg,jpg,range));
});
test('sRGB extended transfer round-trips above SDR white', () => {
  for(const value of [0,.001,.01,.18,1,4,16,64]) assert.ok(Math.abs(srgbToLinear(linearToSrgb(value))-value)<1e-10);
});
test('gain reconstruction preserves HDR instead of clipping it', () => {
  assert.equal(recoverLinear(1,1,0,metadata),4.046875);
  assert.equal(recoverLinear(1,0,0,metadata),1);
});
test('gain offsets keep black and neutral paper finite', () => {
  assert.equal(logGain(0,0),0); assert.equal(logGain(1,1),0); assert.ok(Number.isFinite(logGain(0,4)));
});
test('gain quantization respects range and clamps rounding', () => {
  assert.equal(encodeGain(-1,0,2),0); assert.equal(encodeGain(3,0,2),255); assert.equal(encodeGain(1,0,2),128);
});
test('metadata rejects NaN, zero gamma, invalid channel lengths and capacities', () => {
  for(const m of [{...metadata,gamma:[0,1,1]},{...metadata,max:[NaN,2,2]},{...metadata,min:[0,0]},{...metadata,capacityMax:0}]) assert.throws(()=>validateMetadata(m));
  assert.equal(validateMetadata(metadata),metadata);
});
for(const [mode,status,expected] of [['auto','sdr','sdr'],['auto','hdr','hdr'],['sdr','hdr','sdr'],['sdr','unknown','sdr'],['hdr','hdr','hdr']]) {
  test(`${mode} / ${status} resolves to ${expected}`,()=>assert.equal(resolveExportMode(mode,{status}),expected));
}
test('unsupported, corrupt and absent HDR evidence fails closed', () => {
  assert.throws(()=>resolveExportMode('auto',{status:'unknown',reason:'not supported'}));
  assert.throws(()=>resolveExportMode('hdr',{status:'sdr'}));
  assert.throws(()=>resolveExportMode('auto',undefined));
  assert.throws(()=>resolveExportMode('invalid',{status:'hdr'}));
});
test('large/invalid allocations are rejected before canvas creation', () => {
  for(const [w,h] of [[0,1],[NaN,1],[1.5,2],[20000,1],[10000,10000]]) assert.throws(()=>assertSize(w,h));
  assert.doesNotThrow(()=>assertSize(7000,6000));
});
test('all EXIF orientations are read and normalized to 1', () => {
  for(let orientation=1;orientation<=8;orientation++) {
    const exif = Uint8Array.of(255,225,0,34,69,120,105,102,0,0, 73,73,42,0,8,0,0,0,1,0,18,1,3,0,1,0,0,0,orientation,0,0,0,0,0,0,0);
    const bytes = new Uint8Array(jpg.length+exif.length); bytes.set(jpg.subarray(0,2));bytes.set(exif,2);bytes.set(jpg.subarray(2),2+exif.length);
    const result=normalizeOrientation(bytes);assert.equal(result.orientation,orientation);assert.equal(normalizeOrientation(result.bytes).orientation,1);
  }
});
const rendererPath = new URL('../src/utils/canvasUtils.js', import.meta.url);
test('HDR rotation policy stays identical to the production renderer', {skip: !existsSync(rendererPath)}, () => {
  const renderer=readFileSync(rendererPath,'utf8');
  const block=renderer.match(/const RIGHT_TEXT_TEMPLATES = new Set\(\[([\s\S]*?)\]\)/);
  assert.ok(block,'renderer rotation policy moved: update HDR adapter');
  const values=Array.from(block[1].matchAll(/'([^']+)'/g),m=>m[1]);
  assert.deepEqual([...RIGHT_TEXT_TEMPLATES].sort(),values.sort());
});
