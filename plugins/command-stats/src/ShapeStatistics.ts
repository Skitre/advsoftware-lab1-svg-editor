import type { Shape, SvgDocument } from '@svgframe/kernel';

/**
 * Counts a document depth-first in current child order: leaves by shape type (in order of first
 * appearance), containers (any shape with children slots, e.g. g or box) separately; the canvas
 * root is not counted.
 */
export class ShapeStatistics {
  private readonly leaves = new Map<string, number>();
  private leafTotal = 0;
  private containers = 0;

  static of(document: SvgDocument): ShapeStatistics {
    const statistics = new ShapeStatistics();
    statistics.visit(document.children);
    return statistics;
  }

  /** e.g. `rect: 3  circle: 1  text: 2  (total 6, containers 2)`. */
  format(): string {
    return [...Array.from(this.leaves, ([type, count]) => `${type}: ${count}`),
      `(total ${this.leafTotal}, containers ${this.containers})`].join('  ');
  }

  private visit(shapes: readonly Shape[]): void {
    for (const shape of shapes) {
      if (shape.container) {
        this.containers++;
        this.visit(shape.children);
      } else {
        this.leaves.set(shape.type, (this.leaves.get(shape.type) ?? 0) + 1);
        this.leafTotal++;
      }
    }
  }
}
