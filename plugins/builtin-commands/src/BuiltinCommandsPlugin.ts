import type { Plugin, PluginContext } from '@svgframe/kernel';
import { DelegateCommand } from './DelegateCommand.js';
import { AddToEdit } from './edits/AddToEdit.js';
import { CreateEdit } from './edits/CreateEdit.js';
import { DeleteEdit } from './edits/DeleteEdit.js';
import { GroupEdit } from './edits/GroupEdit.js';
import { MoveEdit } from './edits/MoveEdit.js';
import { ScaleEdit } from './edits/ScaleEdit.js';
import { SetEdit } from './edits/SetEdit.js';
import { UngroupEdit } from './edits/UngroupEdit.js';
import { ZOrderEdit } from './edits/ZOrderEdit.js';

/** The Phase 1 command table, registered through the Command extension point in Phase 1 order. */
export class BuiltinCommandsPlugin implements Plugin {
  activate(context: PluginContext): void {
    for (const command of [
      new DelegateCommand('init', 'init [w] [h]', false, (a, { session }) => {
        a.count(0, 2); return [session.init(a.length ? a.number(0, 'width') : 800, a.length > 1 ? a.number(1, 'height') : 600)];
      }),
      new DelegateCommand('read', 'read <file.svg>', false, (a, { session }) => { a.count(1); return session.read(a.at(0)); }),
      new DelegateCommand('save', 'save [file.svg]', true, (a, { session }) => {
        a.count(0, 1); return [session.save(a.length ? a.at(0) : undefined)];
      }),
      new DelegateCommand('canvas', 'canvas [w h]', true, (a, { session }) => {
        a.count(0, 2); if (a.length === 1) throw new Error('usage: canvas [w h]');
        return [a.length ? session.canvas(a.number(0, 'width'), a.number(1, 'height')) : session.canvas()];
      }),
      new DelegateCommand('create', 'create <type> <id> [params...] [in <containerId>]', true, (a, { session, shapes }) => {
        const { type, id, params, containerId } = a.creation();
        return [session.edit(new CreateEdit(shapes.create(type, id, params), containerId))];
      }),
      new DelegateCommand('delete', 'delete <id>', true, (a, { session }) => { a.count(1); return [session.edit(new DeleteEdit(a.at(0)))]; }),
      new DelegateCommand('move', 'move <id> <dx> <dy>', true, (a, { session }) => {
        a.count(3); return [session.edit(new MoveEdit(a.at(0), a.number(1, 'dx'), a.number(2, 'dy')))];
      }),
      new DelegateCommand('scale', 'scale <id> <factor>', true, (a, { session }) => {
        a.count(2); return [session.edit(new ScaleEdit(a.at(0), a.number(1, 'factor')))];
      }),
      new DelegateCommand('set', 'set <id> <attr> <value>', true, (a, { session, attributes }) => {
        a.count(3); return [session.edit(new SetEdit(attributes, a.at(0), a.at(1), a.at(2)))];
      }),
      new DelegateCommand('group', 'group <newGid> <id1> [id2...]', true, (a, { session }) => {
        a.count(2, Infinity); return [session.edit(new GroupEdit(a.at(0), a.values(1)))];
      }),
      new DelegateCommand('ungroup', 'ungroup <gid>', true, (a, { session }) => { a.count(1); return [session.edit(new UngroupEdit(a.at(0)))]; }),
      new DelegateCommand('addto', 'addto <gid> <id>', true, (a, { session }) => {
        a.count(2); return [session.edit(new AddToEdit(a.at(0), a.at(1)))];
      }),
      new DelegateCommand('front', 'front <id>', true, (a, { session }) => { a.count(1); return [session.edit(new ZOrderEdit(a.at(0), true))]; }),
      new DelegateCommand('back', 'back <id>', true, (a, { session }) => { a.count(1); return [session.edit(new ZOrderEdit(a.at(0), false))]; }),
      new DelegateCommand('tree', 'tree [id]', true, (a, { session, tree }) => {
        a.count(0, 1); return tree.tree(session.snapshot(), a.length ? a.at(0) : undefined);
      }),
      new DelegateCommand('show', 'show <id>', true, (a, { session, tree }) => { a.count(1); return tree.show(session.snapshot(), a.at(0)); }),
      new DelegateCommand('help', 'help', false, (a, { commands, shapes }) => {
        a.count(0);
        return ['Commands:', ...commands.syntaxes().map(syntax => `  ${syntax}`),
          'Shape parameters (append optional: in <containerId>):', ...shapes.syntaxes().map(syntax => `  ${syntax}`),
          'set: fill / stroke / stroke-width; shape geometry; text content via text.',
          'Comments start with #. Use double quotes for spaces. Ctrl-D exits.'];
      }),
      new DelegateCommand('undo', 'undo', true, (a, { session }) => { a.count(0); return [session.undo()]; }),
      new DelegateCommand('redo', 'redo', true, (a, { session }) => { a.count(0); return [session.redo()]; }),
    ]) context.registerCommand(command);
  }
}
