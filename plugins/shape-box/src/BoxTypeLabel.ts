import type { TreeDecorator, TreeLine } from '@svgframe/kernel';

/** Tree label `(box)` on box container lines, e.g. `g#n1 (box)`. Stateless. */
export class BoxTypeLabel implements TreeDecorator {
  readonly name = 'box-type-label';
  label(line: TreeLine): string | undefined { return line.shape?.type === 'box' ? '(box)' : undefined; }
}
