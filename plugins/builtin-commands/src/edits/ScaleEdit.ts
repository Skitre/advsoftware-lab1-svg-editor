import { EditCommand } from '@svgframe/kernel';
import type { SvgDocument } from '@svgframe/kernel';
export class ScaleEdit extends EditCommand {
  constructor(private readonly id: string, private readonly factor: number) { super(); }
  protected override apply(document: SvgDocument): string {
    const shape = document.find(this.id); shape.scale(this.factor);
    return `${shape.label} scaled by ${this.factor}`;
  }
}
