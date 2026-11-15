import { Group } from '@svgframe/kernel';
import type { Shape } from '@svgframe/kernel';

/**
 * Composite shape `box`: a `<g data-kind="box">` that owns a frame `<id>-rect` and a title `<id>-label`.
 * It behaves as a container (move, delete, group, nesting) but cannot be ungrouped, and its two parts
 * cannot be deleted or moved out by ordinary commands, so a Box never exists without them.
 */
export class Box extends Group {
  static frameId(id: string): string { return `${id}-rect`; }
  static labelId(id: string): string { return `${id}-label`; }

  override get type(): string { return 'box'; }
  override get dissolvable(): boolean { return false; }

  override ownsPart(child: Shape): boolean {
    return child.id === Box.frameId(this.id) || child.id === Box.labelId(this.id);
  }

  override describeComposition(): string {
    return `(g#${this.id} + rect#${Box.frameId(this.id)} + text#${Box.labelId(this.id)})`;
  }

  override attributes(): Readonly<Record<string, string>> {
    return { ...super.attributes(), 'data-kind': 'box' };
  }

  override clone(): Box {
    const copy = new Box(this.id);
    this.copyPresentationTo(copy);
    for (const child of this.children) copy.insert(child.clone());
    return copy;
  }
}
