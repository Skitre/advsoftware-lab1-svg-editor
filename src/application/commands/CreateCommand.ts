import type { Shape } from '../../domain/Shape.js';
import type { SvgDocument } from '../../domain/SvgDocument.js';
import { EditCommand } from './EditCommand.js';
export class CreateCommand extends EditCommand {
  constructor(private readonly shape: Shape, private readonly containerId?: string) { super(); }
  protected override apply(document: SvgDocument): string {
    document.create(this.shape.clone(), this.containerId);
    return `${this.shape.label} created${this.containerId === undefined ? '' : ` in g#${this.containerId}`}`;
  }
}
