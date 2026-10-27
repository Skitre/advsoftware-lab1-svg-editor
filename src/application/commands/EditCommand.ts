import type { SvgDocument } from '../../domain/SvgDocument.js';

/** Command + Memento: a command owns immutable-in-practice before/after copies. */
export abstract class EditCommand {
  private before?: SvgDocument;
  private after?: SvgDocument;
  private message = '';

  execute(document: SvgDocument): { document: SvgDocument; message: string } {
    const draft = document.clone();
    const message = this.apply(draft); // Failure leaves the live document and command history intact.
    this.before = document.clone();
    this.after = draft.clone();
    this.message = message;
    return { document: draft, message };
  }

  undo(): { document: SvgDocument; message: string } {
    if (!this.before) throw new Error('command has not executed');
    return { document: this.before.clone(), message: `undone: ${this.message}` };
  }

  redo(): { document: SvgDocument; message: string } {
    if (!this.after) throw new Error('command has not executed');
    return { document: this.after.clone(), message: `redone: ${this.message}` };
  }

  protected abstract apply(document: SvgDocument): string;
}
