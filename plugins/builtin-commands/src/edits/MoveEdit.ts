import { EditCommand } from '@svgframe/kernel';
import type { SvgDocument } from '@svgframe/kernel';
export class MoveEdit extends EditCommand {
  constructor(private readonly id: string, private readonly dx: number, private readonly dy: number) { super(); }
  protected override apply(document: SvgDocument): string {
    const shape = document.find(this.id); shape.move(this.dx, this.dy);
    return `${shape.label} moved by (${this.dx},${this.dy})`;
  }
}
