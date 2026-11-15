import { EditCommand } from '@svgframe/kernel';
import type { SvgDocument } from '@svgframe/kernel';
export class AddToEdit extends EditCommand {
  constructor(private readonly groupId: string, private readonly id: string) { super(); }
  protected override apply(document: SvgDocument): string {
    document.addTo(this.groupId, this.id);
    return `${document.find(this.id).label} moved into ${document.find(this.groupId).label}`;
  }
}
