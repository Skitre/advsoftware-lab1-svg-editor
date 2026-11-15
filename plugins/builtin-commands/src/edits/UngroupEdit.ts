import { EditCommand } from '@svgframe/kernel';
import type { SvgDocument } from '@svgframe/kernel';
export class UngroupEdit extends EditCommand {
  constructor(private readonly id: string) { super(); }
  protected override apply(document: SvgDocument): string {
    document.ungroup(this.id); return `g#${this.id} ungrouped`;
  }
}
