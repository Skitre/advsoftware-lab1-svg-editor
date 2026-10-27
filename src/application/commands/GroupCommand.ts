import type { SvgDocument } from '../../domain/SvgDocument.js';
import { EditCommand } from './EditCommand.js';
export class GroupCommand extends EditCommand {
  constructor(private readonly id: string, private readonly members: readonly string[]) { super(); }
  protected override apply(document: SvgDocument): string {
    const group = document.group(this.id, this.members);
    return `${group.label} created with ${group.children.length} children`;
  }
}
