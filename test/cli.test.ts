import assert from 'node:assert/strict';
import { test } from 'node:test';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { EditorSession } from '../src/application/EditorSession.js';
import { CommandFactory } from '../src/cli/CommandFactory.js';
import { Lexer } from '../src/cli/Lexer.js';
import { TreeFormatter } from '../src/cli/TreeFormatter.js';
import { MemoryDocumentStore } from './support/MemoryDocumentStore.js';

const lexer = new Lexer();

test('lexer supports quoted empty/space/escaped text, preserves hex colors and comments', () => {
  assert.deepEqual(lexer.tokenize('  # comment'), []);
  assert.deepEqual(lexer.tokenize('set t text ""').map(t => t.value), ['set', 't', 'text', '']);
  assert.deepEqual(lexer.tokenize('create rect r 0 0 1 1 #fff').map(t => t.value).at(-1), '#fff');
  assert.equal(lexer.tokenize('set t text "a \\"b\\" \\\\ c"').at(-1)?.value, 'a "b" \\ c');
  assert.throws(() => lexer.tokenize('set t text "unfinished'), /unterminated/);
  assert.throws(() => lexer.tokenize('set t text "x"junk'), /whitespace/);
});

test('every command is wired; group edits and displays preserve undo/redo', () => {
  const editor = new EditorSession(new MemoryDocumentStore()); const commands = new CommandFactory(editor);
  const run = (line: string) => commands.execute(lexer.tokenize(line));
  assert.match(run('help').join('\n'), /ungroup/);
  assert.throws(() => run('tree'), /no document/);
  run('init'); run('create g outer'); run('create g inner in outer');
  run('create rect r 10 20 30 40 blue in inner'); run('create circle c 20 30 10 in outer');
  run('create ellipse e 0 0 2 3'); run('create line l 0 0 1 1 black'); run('create text t 0 0 "hello in outer"');
  run('move inner 2 3'); run('scale inner 2'); run('set inner fill red');
  assert.equal(editor.snapshot().find('r').geometry().x, 24);
  run('front inner'); run('back inner'); run('addto inner c'); run('ungroup inner');
  run('group pair r c'); run('delete pair'); run('undo');
  run('tree outer'); run('show r'); run('help'); run('canvas'); run('redo'); run('undo');
  run('save "my file.svg"'); assert.throws(() => run('undo'), /undo not allowed/);
  run('read "my file.svg"'); run('canvas 200 300');
  assert.match(run('canvas')[0]!, /200x300/);
  assert.match(run('tree')[0]!, /svg \(200x300\)/);
});

test('in suffix does not confuse quoted text and invalid syntax never changes state', () => {
  const editor = new EditorSession(new MemoryDocumentStore()); const commands = new CommandFactory(editor);
  const run = (line: string) => commands.execute(lexer.tokenize(line));
  run('init'); run('create g g'); run('create text t 0 0 "in" in g');
  assert.equal(editor.snapshot().find('t').textContent, 'in');
  run('create text empty 0 0 ""');
  const before = new TreeFormatter().tree(editor.snapshot());
  for (const line of ['move t 2', 'scale t 0', 'create rect t 0 0 1 1', 'create hexagon h',
    'create g x in missing', 'create g x in t', 'canvas 200', 'set t id other', 'undo extra',
    'group bad g t', 'ungroup g', 'addto g g', 'move t NaN 1', 'bogus']) {
    assert.throws(() => run(line), Error, line);
    assert.deepEqual(new TreeFormatter().tree(editor.snapshot()), before, line);
  }
  run('undo'); assert.throws(() => editor.snapshot().find('empty'), /no such shape/);
});

test('CLI process recovers from errors, uses stderr, returns nonzero for failed script', () => {
  const result = spawnSync(process.execPath, ['--import', 'tsx', 'src/main.ts'], {
    encoding: 'utf8', input: 'init\ncreate rect r 0 0 10 20\nscale r 0\nmove r 5 6\nshow r\n',
  });
  assert.equal(result.status, 1); assert.equal(result.stderr, 'error: scale factor must be positive\n');
  assert.match(result.stdout, /x=5 y=6 width=10 height=20/);
});

test('assignment flowchart script builds expected hierarchy and coordinates', () => {
  const editor = new EditorSession(new MemoryDocumentStore()); const commands = new CommandFactory(editor);
  for (const line of readFileSync('examples/flowchart.commands', 'utf8').split('\n')) commands.execute(lexer.tokenize(line));
  assert.equal(editor.snapshot().count, 8);
  assert.equal(editor.snapshot().parentLabel('process'), 'g#node2');
  assert.equal(editor.snapshot().find('process').geometry().y, 100);
  assert.equal(editor.snapshot().find('process-label').textContent, '处理数据 v2');
});

test('every edit command restores exact full document on undo and redo', () => {
  const editor = new EditorSession(new MemoryDocumentStore()); const commands = new CommandFactory(editor);
  const run = (line: string) => commands.execute(lexer.tokenize(line));
  const state = () => editor.snapshot().all().map(shape => ({
    id: shape.id, parent: editor.snapshot().parentLabel(shape.id), attributes: shape.attributes(), text: shape.textContent,
  }));
  for (const line of ['init', 'create g outer', 'create g nested in outer',
    'create rect a 1 2 3 4 in nested', 'create circle b 2 3 4 in outer', 'create text t 1 2 "original"']) run(line);
  for (const line of ['create ellipse e 0 0 1 2', 'move outer 5 6', 'scale outer 2',
    'set t text "changed"', 'set outer fill red', 'front nested', 'back nested',
    'addto nested b', 'group pair a b', 'ungroup pair', 'delete nested']) {
    const before = state(); run(line); const after = state();
    run('undo'); assert.deepEqual(state(), before, `undo ${line}`);
    run('redo'); assert.deepEqual(state(), after, `redo ${line}`);
  }
});
