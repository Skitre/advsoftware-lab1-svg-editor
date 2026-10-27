import type { SvgDocument } from '../../domain/SvgDocument.js';
import { EditCommand } from './EditCommand.js';
export class AddToCommand extends EditCommand {
  constructor(private readonly groupId: string, private readonly id: string) { super(); }
  protected override apply(document: SvgDocument): string {
    document.addTo(this.groupId, this.id); return `${document.find(this.id).label} moved into g#${this.groupId}`;
  }
}
