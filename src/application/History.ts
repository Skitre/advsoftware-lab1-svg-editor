import type { SvgDocument } from '../domain/SvgDocument.js';
import type { EditCommand } from './commands/EditCommand.js';

export class History {
  private undoStack: EditCommand[] = [];
  private redoStack: EditCommand[] = [];
  private blocked = true;

  execute(command: EditCommand, document: SvgDocument): { document: SvgDocument; message: string } {
    const result = command.execute(document);
    this.undoStack.push(command);
    this.redoStack = [];
    this.blocked = false;
    return result;
  }

  undo(): { document: SvgDocument; message: string } {
    this.assertAllowed();
    const command = this.undoStack.at(-1);
    if (!command) throw new Error('nothing to undo');
    const result = command.undo();
    this.undoStack.pop(); this.redoStack.push(command);
    return result;
  }

  redo(): { document: SvgDocument; message: string } {
    this.assertAllowed();
    const command = this.redoStack.at(-1);
    if (!command) throw new Error('nothing to redo');
    const result = command.redo();
    this.redoStack.pop(); this.undoStack.push(command);
    return result;
  }

  barrier(): void {
    this.undoStack = []; this.redoStack = []; this.blocked = true;
  }

  private assertAllowed(): void {
    if (this.blocked) throw new Error('undo not allowed after io command');
  }
}
