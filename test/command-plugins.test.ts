import assert from 'node:assert/strict';
import { test } from 'node:test';
import { resolve } from 'node:path';
import commandDir from '@svgframe/plugin-command-dir';
import commandDirPackage from '@svgframe/plugin-command-dir/package.json' with { type: 'json' };
import commandStats from '@svgframe/plugin-command-stats';
import commandStatsPackage from '@svgframe/plugin-command-stats/package.json' with { type: 'json' };
import { DirCommand } from '../plugins/command-dir/src/DirCommand.js';
import type { DirectoryEntry, DirectoryReader } from '../plugins/command-dir/src/DirectoryReader.js';
import { DirPlugin } from '../plugins/command-dir/src/DirPlugin.js';
import type { PluginSource } from '../src/host/PluginInstaller.js';
import { TestEditor } from './support/TestEditor.js';

const stats: PluginSource = { module: '@svgframe/plugin-command-stats', plugin: commandStats, packageJson: commandStatsPackage };
const dir = (plugin: unknown = commandDir): PluginSource => ({ module: '@svgframe/plugin-command-dir', plugin, packageJson: commandDirPackage });
class ScriptedReader implements DirectoryReader {
  fail = false;
  list(): readonly DirectoryEntry[] {
    if (this.fail) throw new Error('EACCES');
    return [{ name: 'b.svg', kind: 'file' }, { name: 'sub', kind: 'directory' }];
  }
}
/** Everything a command could disturb: document content, and both history stacks (probed by undo/redo). */
const fingerprint = (editor: TestEditor) => {
  const tree = editor.run('tree').join('\n');
  const probe = (command: string) => { try { return editor.run(command).join('\n'); } catch (error) { return String(error); } };
  const undone = probe('undo'); const redone = probe('redo');
  return { tree, undone, redone };
};

test('each command plugin can be enabled alone; unloaded commands are unknown and absent from help', async () => {
  const none = await TestEditor.create();
  assert.throws(() => none.run('stats'), /^Error: unknown command: stats$/);
  assert.throws(() => none.run('dir'), /^Error: unknown command: dir$/);
  const onlyStats = await TestEditor.create([stats]);
  assert.ok(onlyStats.run('help').includes('  stats')); assert.ok(!onlyStats.run('help').includes('  dir'));
  assert.throws(() => onlyStats.run('dir'), /unknown command: dir/);
  const onlyDir = await TestEditor.create([dir()]);
  assert.ok(onlyDir.run('help').includes('  dir')); assert.ok(!onlyDir.run('help').includes('  stats'));
  assert.throws(() => onlyDir.run('stats'), /unknown command: stats/);
});

test('stats needs a document, reads the live document, and never enters the undo stack', async () => {
  const editor = await TestEditor.create([stats]);
  assert.throws(() => editor.run('stats'), /no document/);
  editor.run('init'); editor.run('create g g1'); editor.run('create rect r 0 0 1 1 in g1'); editor.run('move r 1 1');
  const before = fingerprint(editor);
  assert.deepEqual(editor.run('stats'), ['rect: 1  (total 1, containers 1)']);
  assert.deepEqual(fingerprint(editor), before);
  assert.deepEqual(editor.run('undo'), ['undone: rect#r moved by (1,1)']);
});

test('dir works before init and, with a document, never changes it or undo/redo history (success or failure)', async () => {
  const reader = new ScriptedReader();
  const editor = await TestEditor.create([dir(new DirPlugin(reader, () => '/project'))]);
  assert.deepEqual(editor.run('dir'), ['[DIR]  sub', '[FILE] b.svg']);
  editor.run('init'); editor.run('create rect r 0 0 1 1'); editor.run('move r 1 1'); editor.run('undo');
  for (const fail of [false, true]) {
    reader.fail = fail;
    const before = fingerprint(editor);
    if (fail) assert.throws(() => editor.run('dir'), /^Error: cannot read directory: \/project$/);
    else assert.deepEqual(editor.run('dir'), ['[DIR]  sub', '[FILE] b.svg']);
    assert.deepEqual(fingerprint(editor), before, fail ? 'after failure' : 'after success');
  }
  editor.run('save a.svg'); reader.fail = false; editor.run('dir');
  assert.throws(() => editor.run('undo'), /undo not allowed after io command/, 'dir does not lift the io barrier');
  editor.run('move r 1 1'); editor.run('dir');
  assert.deepEqual(editor.run('undo'), ['undone: rect#r moved by (1,1)'], 'dir does not add an io barrier');
});

test('code assembly and config assembly install the same command implementation and directory adapter', async () => {
  const coded = await TestEditor.create([stats, dir()]); // same list and order as src/main.ts
  const configured = await TestEditor.create();
  await configured.app.loader.load(resolve('plugins.config.json'));
  assert.deepEqual(configured.diagnostics.messages, []);
  for (const editor of [coded, configured]) assert.ok(editor.app.extensions.commands.get('dir') instanceof DirCommand);
  assert.deepEqual(coded.app.extensions.commands.names(), configured.app.extensions.commands.names());
});
