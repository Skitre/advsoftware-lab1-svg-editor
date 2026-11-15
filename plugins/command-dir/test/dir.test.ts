import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { CommandArguments } from '@svgframe/kernel';
import type { Command, CommandContext, PluginContext } from '@svgframe/kernel';
import { DirCommand } from '../src/DirCommand.js';
import type { DirectoryEntry, DirectoryReader } from '../src/DirectoryReader.js';
import { DirPlugin } from '../src/DirPlugin.js';
import { NodeDirectoryReader } from '../src/NodeDirectoryReader.js';

/** Test double for the Target interface: a fixed listing, or a failure. */
class FakeReader implements DirectoryReader {
  readonly requested: string[] = [];
  constructor(private readonly entries: readonly DirectoryEntry[] | Error) {}
  list(path: string): readonly DirectoryEntry[] {
    this.requested.push(path);
    if (this.entries instanceof Error) throw this.entries;
    return this.entries;
  }
}
const args = (...values: string[]) => new CommandArguments(values.map(value => ({ value, quoted: false })), 'dir');
const noContext = {} as CommandContext; // dir must not need any kernel service
const dir = (reader: DirectoryReader, cwd = '/work') => new DirCommand(reader, () => cwd).execute(args());
const file = (name: string): DirectoryEntry => ({ name, kind: 'file' });
const folder = (name: string): DirectoryEntry => ({ name, kind: 'directory' });

test('mixed files and directories: directories first, each group sorted by name', () => {
  const reader = new FakeReader([file('package.json'), folder('plugins'), file('demo.svg'), folder('docs')]);
  assert.deepEqual(dir(reader), ['[DIR]  docs', '[DIR]  plugins', '[FILE] demo.svg', '[FILE] package.json']);
  assert.deepEqual(reader.requested, ['/work']);
});

test('empty directory', () => assert.deepEqual(dir(new FakeReader([])), ['(empty directory)']));

test('hidden entries are listed, . and .. never are', () => {
  assert.deepEqual(dir(new FakeReader([folder('.'), folder('..'), file('.env'), folder('.git'), file('a')])),
    ['[DIR]  .git', '[FILE] .env', '[FILE] a']);
  assert.deepEqual(dir(new FakeReader([folder('.'), folder('..')])), ['(empty directory)']);
});

test('read failure names the target directory', () => {
  assert.throws(() => dir(new FakeReader(new Error('EACCES')), '/locked'), /^Error: cannot read directory: \/locked$/);
  const unknownCwd = new DirCommand(new FakeReader([]), () => { throw new Error('uv_cwd'); });
  assert.throws(() => unknownCwd.execute(args()), /^Error: cannot read directory: \.$/);
});

test('ordering is stable and locale independent; special entries and odd names have a defined display', () => {
  const entries = [file('b'), file('B'), file('a'), file('_x'), file('10'), file('9'), { name: 'link', kind: 'symlink' as const },
    { name: 'fifo', kind: 'other' as const }, file('line\nbreak'), folder('Z'), folder('a')];
  const expected = ['[DIR]  Z', '[DIR]  a', '[FILE] 10', '[FILE] 9', '[FILE] B', '[FILE] _x', '[FILE] a', '[FILE] b',
    '[SPEC] fifo', '[FILE] "line\\nbreak"', '[LINK] link'];
  assert.deepEqual(dir(new FakeReader(entries)), expected);
  assert.deepEqual(dir(new FakeReader([...entries].reverse())), expected);
});

test('dir takes no arguments', () => {
  assert.throws(() => new DirCommand(new FakeReader([]), () => '/').execute(args('sub')), /usage: dir/);
});

test('plugin registers dir as a command usable without a document, with injectable reader', () => {
  const commands: Command[] = [];
  new DirPlugin(new FakeReader([file('x')]), () => '/fake').activate({ registerCommand: (c: Command) => commands.push(c) } as unknown as PluginContext);
  assert.deepEqual(commands.map(c => [c.name, c.syntax, c.requiresDocument]), [['dir', 'dir', false]]);
  assert.deepEqual(commands[0]!.execute(args(), noContext), ['[FILE] x']);
});

test('real file system adapter combined with the command on a temporary directory', () => {
  const root = mkdtempSync(join(tmpdir(), 'svg-dir-'));
  try {
    mkdirSync(join(root, 'plugins')); mkdirSync(join(root, 'docs')); mkdirSync(join(root, '.hidden-dir'));
    writeFileSync(join(root, 'package.json'), '{}'); writeFileSync(join(root, 'demo.svg'), '<svg/>'); writeFileSync(join(root, '.env'), '');
    symlinkSync(join(root, 'docs'), join(root, 'docs-link'));
    assert.deepEqual(dir(new NodeDirectoryReader(), root), [
      '[DIR]  .hidden-dir', '[DIR]  docs', '[DIR]  plugins', '[FILE] .env', '[FILE] demo.svg', '[LINK] docs-link', '[FILE] package.json',
    ]);
    const empty = join(root, 'plugins');
    assert.deepEqual(dir(new NodeDirectoryReader(), empty), ['(empty directory)']);
    assert.throws(() => dir(new NodeDirectoryReader(), join(root, 'missing')), new RegExp(`cannot read directory: ${join(root, 'missing')}`));
    assert.throws(() => dir(new NodeDirectoryReader(), join(root, 'demo.svg')), /cannot read directory/);
  } finally { rmSync(root, { recursive: true, force: true }); }
});
