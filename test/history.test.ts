import assert from 'node:assert/strict';
import { test } from 'node:test';
import { EditorSession } from '../src/application/EditorSession.js';
import { CreateCommand } from '../src/application/commands/CreateCommand.js';
import { DeleteCommand } from '../src/application/commands/DeleteCommand.js';
import { GroupCommand } from '../src/application/commands/GroupCommand.js';
import { MoveCommand } from '../src/application/commands/MoveCommand.js';
import { ScaleCommand } from '../src/application/commands/ScaleCommand.js';
import { Rect } from '../src/domain/Rect.js';
import { MemoryDocumentStore } from './support/MemoryDocumentStore.js';

test('group and subtree deletion each undo in a single unit with order restored', () => {
  const editor = new EditorSession(new MemoryDocumentStore()); editor.init();
  for (const id of ['a', 'b']) editor.edit(new CreateCommand(new Rect(id, 1, 2, 3, 4)));
  editor.edit(new GroupCommand('g', ['a', 'b'])); editor.undo();
  assert.deepEqual(editor.snapshot().children.map(s => s.id), ['a', 'b']);
  editor.redo(); editor.edit(new DeleteCommand('g')); assert.equal(editor.snapshot().count, 0);
  editor.undo(); assert.equal(editor.snapshot().count, 3);
});

test('failed edits preserve redo; successful new edits clear redo', () => {
  const editor = new EditorSession(new MemoryDocumentStore()); editor.init();
  editor.edit(new CreateCommand(new Rect('a', 1, 2, 3, 4)));
  editor.edit(new MoveCommand('a', 10, 0)); editor.undo();
  assert.throws(() => editor.edit(new ScaleCommand('a', -1)), /positive/);
  editor.redo(); assert.equal(editor.snapshot().find('a').geometry().x, 11);
  editor.undo(); editor.edit(new MoveCommand('a', 1, 0));
  assert.throws(() => editor.redo(), /nothing to redo/);
});

test('document barriers only apply after successful writes, reads, init and canvas edits', () => {
  const editor = new EditorSession(new MemoryDocumentStore());
  assert.throws(() => editor.undo(), /no document/);
  editor.init(); assert.throws(() => editor.undo(), /undo not allowed after io command/);
  editor.edit(new CreateCommand(new Rect('a', 1, 2, 3, 4)));
  assert.throws(() => editor.save('unwritable.svg'), /cannot write file/);
  assert.throws(() => editor.read('missing.svg'), /cannot read file/);
  assert.throws(() => editor.init(0, 10), /positive/);
  assert.throws(() => editor.canvas(10, -1), /positive/);
  editor.canvas(); editor.undo(); assert.equal(editor.snapshot().count, 0); editor.redo();
  editor.save('a.svg'); assert.throws(() => editor.redo(), /undo not allowed/);
  editor.edit(new MoveCommand('a', 2, 3)); editor.canvas(100, 200);
  assert.throws(() => editor.undo(), /undo not allowed/);
  editor.edit(new MoveCommand('a', 1, 0)); editor.read('a.svg');
  assert.throws(() => editor.undo(), /undo not allowed/);
  assert.equal(editor.snapshot().find('a').geometry().x, 1);
});

test('snapshot mutation cannot change the session; failed overflow cannot partially move a group', () => {
  const editor = new EditorSession(new MemoryDocumentStore()); editor.init();
  editor.edit(new CreateCommand(new Rect('a', 1, 2, 3, 4)));
  editor.edit(new CreateCommand(new Rect('b', 1e308, 2, 3, 4)));
  editor.edit(new GroupCommand('g', ['a', 'b']));
  assert.throws(() => editor.edit(new ScaleCommand('g', 10)), /finite/);
  assert.equal(editor.snapshot().find('a').geometry().x, 1);
  editor.snapshot().delete('g'); assert.equal(editor.snapshot().count, 3);
  editor.undo(); assert.deepEqual(editor.snapshot().children.map(s => s.id), ['a', 'b']);
});

test('save remembers its successful path; init resets it', () => {
  const editor = new EditorSession(new MemoryDocumentStore()); editor.init();
  assert.throws(() => editor.save(), /no file path/);
  editor.save('a.svg'); editor.save();
  assert.throws(() => editor.save('unwritable.svg'), /cannot write/);
  assert.match(editor.save(), /saved to a.svg/);
  editor.init(); assert.throws(() => editor.save(), /no file path/);
});
