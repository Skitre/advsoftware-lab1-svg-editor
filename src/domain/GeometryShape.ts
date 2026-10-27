import { Numbers } from './Numbers.js';
import { Shape } from './Shape.js';

export abstract class GeometryShape extends Shape {
  private values: Record<string, number>;

  constructor(id: string, values: Record<string, number>,
    private readonly xKeys: readonly string[], private readonly yKeys: readonly string[],
    private readonly sizeKeys: readonly string[]) {
    super(id);
    this.values = this.validate(values);
  }

  override geometry(): Readonly<Record<string, number>> { return { ...this.values }; }

  override set(attribute: string, value: string): void {
    if (Object.hasOwn(this.values, attribute)) {
      this.values = this.validate({ ...this.values, [attribute]: Numbers.parse(value, attribute) });
    } else super.set(attribute, value);
  }

  override move(dx: number, dy: number): void {
    Numbers.finite(dx, 'dx');
    Numbers.finite(dy, 'dy');
    const next = { ...this.values };
    for (const key of this.xKeys) next[key] = this.value(key) + dx;
    for (const key of this.yKeys) next[key] = this.value(key) + dy;
    this.values = this.validate(next);
  }

  override scale(factor: number): void {
    Numbers.positive(factor, 'scale factor');
    this.values = this.validate(Object.fromEntries(Object.entries(this.values).map(([key, value]) => [key, value * factor])));
  }

  protected value(key: string): number { return this.values[key]!; }

  private validate(values: Record<string, number>): Record<string, number> {
    for (const [key, value] of Object.entries(values)) Numbers.finite(value, key);
    for (const key of this.sizeKeys) Numbers.nonnegative(values[key]!, key);
    return { ...values };
  }
}
