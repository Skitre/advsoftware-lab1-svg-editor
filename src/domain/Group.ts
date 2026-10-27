import { Numbers } from './Numbers.js';
import { Shape } from './Shape.js';

export class Group extends Shape {
  private members: Shape[] = [];
  override get tag(): string { return 'g'; }
  override get container(): Group { return this; }
  override get children(): readonly Shape[] { return [...this.members]; }
  override geometry(): Readonly<Record<string, number>> { return {}; }
  override describeGeometry(): string { return ''; }

  insert(shape: Shape, index = this.members.length): void {
    if (shape === this || shape.contains(this)) throw new Error(`cannot move a container into its own descendant: ${shape.id}`);
    if (this.members.includes(shape)) throw new Error(`shape already in container: ${shape.id}`);
    this.members.splice(index, 0, shape);
  }

  remove(shape: Shape): number {
    const index = this.members.indexOf(shape);
    if (index < 0) throw new Error(`no such shape: ${shape.id}`);
    this.members.splice(index, 1);
    return index;
  }

  override move(dx: number, dy: number): void {
    Numbers.finite(dx, 'dx'); Numbers.finite(dy, 'dy');
    const next = this.members.map(child => child.clone());
    for (const child of next) child.move(dx, dy);
    this.members = next;
  }

  override scale(factor: number): void {
    Numbers.positive(factor, 'scale factor');
    const next = this.members.map(child => child.clone());
    for (const child of next) child.scale(factor);
    this.members = next;
  }

  override clone(): Group {
    const copy = new Group(this.id);
    this.copyPresentationTo(copy);
    for (const child of this.members) copy.insert(child.clone());
    return copy;
  }
}
