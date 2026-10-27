import { GeometryShape } from './GeometryShape.js';
export class Text extends GeometryShape {
  constructor(id: string, x: number, y: number, private content: string) {
    super(id, { x, y }, ['x'], ['y'], []);
  }
  override get tag(): string { return 'text'; }
  override get textContent(): string { return this.content; }
  override set(attribute: string, value: string): void {
    if (attribute === 'text') this.content = value;
    else super.set(attribute, value);
  }
  override describeGeometry(): string { return `(${this.value('x')},${this.value('y')}) ${JSON.stringify(this.content)}`; }
  override clone(): Text {
    const copy = new Text(this.id, this.value('x'), this.value('y'), this.content);
    this.copyPresentationTo(copy);
    return copy;
  }
}
