import assert from 'node:assert/strict';
import { test } from 'node:test';
import shapeBox from '@svgframe/plugin-shape-box';
import shapeBoxPackage from '@svgframe/plugin-shape-box/package.json' with { type: 'json' };
import treeStar from '@svgframe/plugin-tree-star';
import treeStarPackage from '@svgframe/plugin-tree-star/package.json' with { type: 'json' };
import type { PluginSource } from '../src/host/PluginInstaller.js';
import { TestEditor } from './support/TestEditor.js';

const box: PluginSource = { module: '@svgframe/plugin-shape-box', plugin: shapeBox, packageJson: shapeBoxPackage };
const star: PluginSource = { module: '@svgframe/plugin-tree-star', plugin: treeStar, packageJson: treeStarPackage };
const scene = (editor: TestEditor) => { editor.run('init'); editor.run('create box n1 0 0 10 10 "t"'); return editor.run('tree'); };

test('(box) and * coexist on one line, joined in plugin installation order', async () => {
  assert.deepEqual(scene(await TestEditor.create([box, star])),
    ['svg (800x600) *', '└── g#n1 (box) *', '    ├── rect#n1-rect  x=0 y=0 w=10 h=10  fill=#4a90d9 *', '    └── text#n1-label  (20,10) "t" *']);
  assert.equal(scene(await TestEditor.create([star, box]))[1], '└── g#n1 * (box)');
});

test('labels are independent: each plugin works without the other', async () => {
  assert.deepEqual(scene(await TestEditor.create([box]))[1], '└── g#n1 (box)');
  const onlyStar = await TestEditor.create([star]);
  onlyStar.run('init'); onlyStar.run('create rect r 0 0 1 1'); onlyStar.run('save a.svg'); onlyStar.run('set r fill red');
  assert.deepEqual(onlyStar.run('tree'), ['svg (800x600) *', '└── rect#r  x=0 y=0 w=1 h=1  fill=red *']);
});

test('real session: a failed save keeps the marks, a successful one clears them, undo to the save point is clean', async () => {
  const editor = await TestEditor.create([box, star]);
  editor.run('init'); editor.run('create rect r 0 0 1 1');
  assert.throws(() => editor.run('save unwritable.svg'), /cannot write file/);
  assert.deepEqual(editor.run('tree'), ['svg (800x600) *', '└── rect#r  x=0 y=0 w=1 h=1 *']);
  editor.run('save ok.svg');
  assert.deepEqual(editor.run('tree'), ['svg (800x600)', '└── rect#r  x=0 y=0 w=1 h=1']);
  editor.run('scale r 2'); assert.equal(editor.run('tree')[1], '└── rect#r  x=0 y=0 w=2 h=2 *');
  editor.run('undo'); assert.deepEqual(editor.run('tree'), ['svg (800x600)', '└── rect#r  x=0 y=0 w=1 h=1']);
  editor.run('redo'); editor.run('read ok.svg');
  assert.deepEqual(editor.run('tree'), ['svg (800x600)', '└── rect#r  x=0 y=0 w=1 h=1']);
  assert.deepEqual(editor.run('tree r'), ['rect#r  x=0 y=0 w=1 h=1'], 'tree <id> is decorated the same way');
});
