import { EditCommand } from '@svgframe/kernel';
import type { SvgDocument } from '@svgframe/kernel';
export class ZOrderEdit extends EditCommand {
  constructor(private readonly id: string, private readonly front: boolean) { super(); }
  protected override apply(document: SvgDocument): string {
    document.reorder(this.id, this.front); return `${document.find(this.id).label} moved to ${this.front ? 'front' : 'back'}`;
  }
}
