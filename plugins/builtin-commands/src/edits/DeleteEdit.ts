import { EditCommand } from '@svgframe/kernel';
import type { SvgDocument } from '@svgframe/kernel';
export class DeleteEdit extends EditCommand {
  constructor(private readonly id: string) { super(); }
  protected override apply(document: SvgDocument): string { return `${document.delete(this.id).label} deleted`; }
}
