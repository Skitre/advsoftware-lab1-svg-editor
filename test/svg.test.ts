import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtempSync, readFileSync, rmSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { SvgCodec } from '../src/infrastructure/SvgCodec.js';
import { FileDocumentStore } from '../src/infrastructure/FileDocumentStore.js';
import { ShapeFactory } from '../src/domain/ShapeFactory.js';
import { SvgDocument } from '../src/domain/SvgDocument.js';

const codec = new SvgCodec();

test('all shapes, hierarchy, styles and special text survive SVG round trip', () => {
  const document = new SvgDocument(400.5, 300); const factory = new ShapeFactory();
  document.create(factory.create('g', 'scene', []));
  const definitions = [
    ['rect', ['1', '2', '3', '4', '#abc']], ['circle', ['1', '2', '3']],
    ['ellipse', ['1', '2', '3', '4']], ['line', ['1', '2', '3', '4', 'black']],
    ['text', ['1', '2', '  中文 < & > " hello  ']],
  ] as const;
  for (const [type, params] of definitions) document.create(factory.create(type, type, params), 'scene');
  document.find('scene').set('stroke-width', '1.5');
  const xml = codec.encode(document); const loaded = codec.decode(xml);
  assert.equal(codec.encode(loaded.document), xml); assert.deepEqual(loaded.warnings, []);
  assert.equal(loaded.document.find('text').textContent, '  中文 < & > " hello  ');
  assert.match(xml, /&lt; &amp; &gt;/); assert.equal(loaded.document.count, 6);
});

test('missing IDs skip later explicit IDs and retain case sensitivity', () => {
  const result = codec.decode('<svg><rect/><g><rect/><circle id="Rect1"/></g><rect id="rect1"/></svg>');
  assert.deepEqual(result.document.all().map(s => s.id), ['rect2', 'g1', 'rect3', 'Rect1', 'rect1']);
  assert.deepEqual(result.warnings, [
    'warning: assigned id rect2 to unnamed <rect>', 'warning: assigned id g1 to unnamed <g>',
    'warning: assigned id rect3 to unnamed <rect>',
  ]);
});

test('invalid XML, unsupported shapes, duplicate IDs and nested leaves fail without silent loss', () => {
  for (const xml of ['<svg><rect></svg>', '<svg><g id="x"/><rect id="x"/></svg>',
    '<svg><path id="p"/></svg>', '<svg><rect><circle/></rect></svg>', '<html/>',
    '<svg><rect width="-1"/></svg>', '<svg><text>&unknown;</text></svg>',
    '<!DOCTYPE svg [<!ENTITY a "x">]><svg/>', '<svg><g>stray text</g></svg>',
    '<svg><text><tspan>nested</tspan></text></svg>']) {
    assert.throws(() => codec.decode(xml), Error, xml);
  }
});

test('external viewBox, presentation and transforms are preserved through edits and copies', () => {
  const result = codec.decode('<svg width="400px" height="200" viewBox="10 20 800 400" fill="blue"><g transform="translate(60,40) scale(0.8)"><text x="60" y="38" text-anchor="middle" font-size="16">End</text></g></svg>');
  const xml = codec.encode(result.document.clone());
  assert.match(xml, /viewBox="10 20 800 400"/); assert.match(xml, /fill="blue"/);
  assert.match(xml, /transform="translate\(60,40\) scale\(0.8\)"/);
  assert.match(xml, /text-anchor="middle"/); assert.match(xml, /font-size="16"/);
  result.document.resize(100, 100); assert.equal(result.document.viewBox, '0 0 100 100');
});

test('data-kind box reads as ordinary group in phase 1', () => {
  const { document } = codec.decode('<svg><g id="b" data-kind="box"><rect id="r"/></g></svg>');
  assert.ok(document.find('b').container); assert.equal(document.find('b').tag, 'g');
  assert.match(codec.encode(document), /data-kind="box"/);
});

test('real file IO handles spaces, missing files, failing writes and temporary cleanup', () => {
  const dir = mkdtempSync(join(tmpdir(), 'svg-editor-'));
  try {
    const store = new FileDocumentStore(); const path = join(dir, 'a diagram.svg');
    store.write(path, new SvgDocument()); assert.match(readFileSync(path, 'utf8'), /<svg/);
    assert.equal(store.read(path).document.width, 800);
    assert.throws(() => store.read(join(dir, 'missing')), /cannot read file:/);
    assert.throws(() => store.write(dir, new SvgDocument()), /cannot write file:/);
    assert.throws(() => store.write(join(dir, 'missing', 'a.svg'), new SvgDocument()), /cannot write file:/);
    assert.deepEqual(readdirSync(dir), ['a diagram.svg']);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('root identity is preserved and reserved, and SVG pixel geometry imports correctly', () => {
  const { document, warnings } = codec.decode('<svg id="rect1"><rect x="10px" width="20px"/></svg>');
  assert.deepEqual(warnings, ['warning: assigned id rect2 to unnamed <rect>']);
  assert.equal(document.find('rect2').geometry().x, 10);
  assert.match(codec.encode(document.clone()), /id="rect1"/);
  assert.throws(() => document.create(new ShapeFactory().create('g', 'rect1', [])), /id already exists/);
  assert.throws(() => codec.decode('<svg id="same"><rect id="same"/></svg>'), /id already exists: same/);
});
