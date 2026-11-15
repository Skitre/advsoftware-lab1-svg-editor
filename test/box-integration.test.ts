import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import shapeBox from '@svgframe/plugin-shape-box';
import shapeBoxPackage from '@svgframe/plugin-shape-box/package.json' with { type: 'json' };
import type { PluginSource } from '../src/host/PluginInstaller.js';
import { TestEditor } from './support/TestEditor.js';

const box: PluginSource = { module: '@svgframe/plugin-shape-box', plugin: shapeBox, packageJson: shapeBoxPackage };
const saved = readFileSync('doc/transcript/expected/cli-5-box/files/flowchart-box.svg', 'utf8');
const show = (editor: TestEditor, id: string) => editor.run(`show ${id}`).join('\n');

test('§3.4: set fill and set label each modify the inner part and form one undo unit', async () => {
  const editor = await TestEditor.create([box]);
  editor.run('init'); editor.run('create box n1 120 100 160 60 "处理数据"');
  for (const [command, part, before, after] of [
    ['set n1 fill #f5a623', 'n1-rect', 'fill="#4a90d9"', 'fill="#f5a623"'],
    ['set n1 label "处理数据 v2"', 'n1-label', 'text="处理数据"', 'text="处理数据 v2"'],
  ] as const) {
    editor.run(command);
    assert.match(show(editor, part), new RegExp(after.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    editor.run('undo'); assert.match(show(editor, part), new RegExp(before.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), `undo ${command}`);
    editor.run('redo'); assert.ok(show(editor, part).includes(after), `redo ${command}`);
  }
  assert.doesNotMatch(show(editor, 'n1'), /fill|label/, 'the group itself is unchanged');
});

test('box round trip: saved SVG reads back as boxes and re-encodes byte-identically', async () => {
  const editor = await TestEditor.create([box]);
  const { document, warnings } = editor.codec().decode(saved);
  assert.deepEqual(warnings, []);
  assert.deepEqual(['n1', 'n2'].map(id => document.find(id).type), ['box', 'box']);
  assert.equal(editor.codec().encode(document), saved);
});

test('without the box plugin a saved box degrades to a plain g and keeps its data-kind marker', async () => {
  const plain = await TestEditor.create();
  const { document, warnings } = plain.codec().decode(saved);
  assert.deepEqual(warnings, []);
  assert.equal(document.find('n1').type, 'g');
  assert.equal(plain.codec().encode(document), saved, 'nothing is lost when re-saved without the plugin');
  // Phase 1 semantics apply to the degraded group: fill on the group itself, ungroup allowed below the root.
  plain.session.init(); plain.run('create g root'); plain.run('create g n1 in root'); plain.run('set n1 fill red');
  assert.deepEqual(plain.run('tree n1'), ['g#n1  fill=red']);
  assert.throws(() => plain.run('set n1 label x'), /unknown attribute: label/);
  const upgraded = await TestEditor.create([box]);
  assert.equal(upgraded.codec().decode(plain.codec().encode(document)).document.find('n1').type, 'box');
});
