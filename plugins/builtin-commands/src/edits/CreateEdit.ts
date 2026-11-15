import { EditCommand } from '@svgframe/kernel';
import type { Shape, SvgDocument } from '@svgframe/kernel';
export class CreateEdit extends EditCommand {
  constructor(private readonly shape: Shape, private readonly containerId?: string) { super(); }
  protected override apply(document: SvgDocument): string {
    document.create(this.shape.clone(), this.containerId);
    const composition = this.shape.describeComposition();
    return `${this.shape.label} created${composition ? ` ${composition}` : ''}`
      + `${this.containerId === undefined ? '' : ` in ${document.find(this.containerId).label}`}`;
  }
}
