import { GeometryShape } from './GeometryShape.js';
export class Rect extends GeometryShape {
  constructor(id: string, x: number, y: number, width: number, height: number) {
    super(id, { x, y, width, height }, ['x'], ['y'], ['width', 'height']);
  }
  override get tag(): string { return 'rect'; }
  override describeGeometry(): string {
    return `x=${this.value('x')} y=${this.value('y')} w=${this.value('width')} h=${this.value('height')}`;
  }
  override clone(): Rect {
    const copy = new Rect(this.id, this.value('x'), this.value('y'), this.value('width'), this.value('height'));
    this.copyPresentationTo(copy);
    return copy;
  }
}
