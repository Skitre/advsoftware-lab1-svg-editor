import { EditCommand } from '@svgframe/kernel';
import type { AttributeService, SvgDocument } from '@svgframe/kernel';
/** One `set` = one undo unit, whichever AttributeHandler (or the default whitelist) performs it. */
export class SetEdit extends EditCommand {
  constructor(private readonly attributes: AttributeService, private readonly id: string,
    private readonly attribute: string, private readonly value: string) { super(); }
  protected override apply(document: SvgDocument): string {
    return this.attributes.set(document, this.id, this.attribute, this.value);
  }
}
