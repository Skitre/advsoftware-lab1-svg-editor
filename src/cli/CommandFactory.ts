import { EditorSession } from '../application/EditorSession.js';
import { AddToCommand } from '../application/commands/AddToCommand.js';
import { CreateCommand } from '../application/commands/CreateCommand.js';
import { DeleteCommand } from '../application/commands/DeleteCommand.js';
import { GroupCommand } from '../application/commands/GroupCommand.js';
import { MoveCommand } from '../application/commands/MoveCommand.js';
import { ScaleCommand } from '../application/commands/ScaleCommand.js';
import { SetCommand } from '../application/commands/SetCommand.js';
import { UngroupCommand } from '../application/commands/UngroupCommand.js';
import { ZOrderCommand } from '../application/commands/ZOrderCommand.js';
import { ShapeFactory } from '../domain/ShapeFactory.js';
import { CommandArguments } from './CommandArguments.js';
import type { Token } from './Token.js';
import { TreeFormatter } from './TreeFormatter.js';

type Handler = { syntax: string; withoutDocument?: boolean; run: (args: CommandArguments) => string[] };

/** The only command-name dispatch point; constructors remain explicit until Phase 2. */
export class CommandFactory {
  private readonly handlers: ReadonlyMap<string, Handler>;
  private readonly formatter = new TreeFormatter();

  constructor(private readonly editor: EditorSession, private readonly shapes = new ShapeFactory()) {
    this.handlers = new Map<string, Handler>([
      ['init', { syntax: 'init [w] [h]', withoutDocument: true, run: a => {
        a.count(0, 2); return [editor.init(a.length ? a.number(0, 'width') : 800, a.length > 1 ? a.number(1, 'height') : 600)];
      } }],
      ['read', { syntax: 'read <file.svg>', withoutDocument: true, run: a => { a.count(1); return editor.read(a.at(0)); } }],
      ['save', { syntax: 'save [file.svg]', run: a => { a.count(0, 1); return [editor.save(a.length ? a.at(0) : undefined)]; } }],
      ['canvas', { syntax: 'canvas [w h]', run: a => {
        a.count(0, 2); if (a.length === 1) throw new Error('usage: canvas [w h]');
        return [a.length ? editor.canvas(a.number(0, 'width'), a.number(1, 'height')) : editor.canvas()];
      } }],
      ['create', { syntax: 'create <type> <id> [params...] [in <containerId>]', run: a => {
        const { type, id, params, containerId } = a.creation();
        return [editor.edit(new CreateCommand(this.shapes.create(type, id, params), containerId))];
      } }],
      ['delete', { syntax: 'delete <id>', run: a => { a.count(1); return [editor.edit(new DeleteCommand(a.at(0)))]; } }],
      ['move', { syntax: 'move <id> <dx> <dy>', run: a => {
        a.count(3); return [editor.edit(new MoveCommand(a.at(0), a.number(1, 'dx'), a.number(2, 'dy')))];
      } }],
      ['scale', { syntax: 'scale <id> <factor>', run: a => {
        a.count(2); return [editor.edit(new ScaleCommand(a.at(0), a.number(1, 'factor')))];
      } }],
      ['set', { syntax: 'set <id> <attr> <value>', run: a => {
        a.count(3); return [editor.edit(new SetCommand(a.at(0), a.at(1), a.at(2)))];
      } }],
      ['group', { syntax: 'group <newGid> <id1> [id2...]', run: a => {
        a.count(2, Infinity); return [editor.edit(new GroupCommand(a.at(0), a.values(1)))];
      } }],
      ['ungroup', { syntax: 'ungroup <gid>', run: a => { a.count(1); return [editor.edit(new UngroupCommand(a.at(0)))]; } }],
      ['addto', { syntax: 'addto <gid> <id>', run: a => { a.count(2); return [editor.edit(new AddToCommand(a.at(0), a.at(1)))]; } }],
      ['front', { syntax: 'front <id>', run: a => { a.count(1); return [editor.edit(new ZOrderCommand(a.at(0), true))]; } }],
      ['back', { syntax: 'back <id>', run: a => { a.count(1); return [editor.edit(new ZOrderCommand(a.at(0), false))]; } }],
      ['tree', { syntax: 'tree [id]', run: a => { a.count(0, 1); return this.formatter.tree(editor.snapshot(), a.length ? a.at(0) : undefined); } }],
      ['show', { syntax: 'show <id>', run: a => { a.count(1); return this.formatter.show(editor.snapshot(), a.at(0)); } }],
      ['help', { syntax: 'help', withoutDocument: true, run: a => { a.count(0); return this.help(); } }],
      ['undo', { syntax: 'undo', run: a => { a.count(0); return [editor.undo()]; } }],
      ['redo', { syntax: 'redo', run: a => { a.count(0); return [editor.redo()]; } }],
    ]);
  }

  execute(tokens: readonly Token[]): string[] {
    if (!tokens.length) return [];
    const name = tokens[0]!.value;
    const handler = this.handlers.get(name);
    if (!handler) throw new Error(`unknown command: ${name}`);
    if (!handler.withoutDocument) this.editor.snapshot();
    return handler.run(new CommandArguments(tokens.slice(1), handler.syntax));
  }

  private help(): string[] {
    return ['Commands:', ...Array.from(this.handlers.values(), handler => `  ${handler.syntax}`),
      'Shape parameters (append optional: in <containerId>):',
      '  rect <id> <x> <y> <w> <h> [fill]', '  circle <id> <cx> <cy> <r> [fill]',
      '  ellipse <id> <cx> <cy> <rx> <ry> [fill]', '  line <id> <x1> <y1> <x2> <y2> [stroke]',
      '  text <id> <x> <y> "content"', '  g <id>',
      'set: fill / stroke / stroke-width; shape geometry; text content via text.',
      'Comments start with #. Use double quotes for spaces. Ctrl-D exits.'];
  }
}
