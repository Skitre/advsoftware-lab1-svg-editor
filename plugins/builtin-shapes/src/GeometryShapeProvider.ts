import { Numbers } from '@svgframe/kernel';
import type { Shape, ShapeProvider, SvgElementSource } from '@svgframe/kernel';

type Build = (id: string, numbers: readonly number[], content: string) => Shape;

/** Provider for a leaf shape described by numeric geometry keys, an optional style and optional text. */
export class GeometryShapeProvider implements ShapeProvider {
  readonly element: string;
  readonly content: 'none' | 'text';

  constructor(readonly type: string, readonly syntax: string, private readonly keys: readonly string[],
    private readonly build: Build, private readonly optional?: string, private readonly text = false) {
    this.element = type;
    this.content = text ? 'text' : 'none';
  }

  create(id: string, params: readonly string[]): Shape {
    const required = this.keys.length + (this.text ? 1 : 0);
    if (params.length < required || params.length > required + (this.optional ? 1 : 0)) {
      throw new Error(`invalid parameters for ${this.type}`);
    }
    const numbers = this.keys.map((key, index) => Numbers.parse(params[index]!, key));
    const shape = this.build(id, numbers, this.text ? params[this.keys.length]! : '');
    if (this.optional && params[required] !== undefined) shape.set(this.optional, params[required]!);
    return shape;
  }

  restore(source: SvgElementSource): Shape {
    const numbers = this.keys.map(key => Numbers.parse((source.attributes[key] ?? '0').trim().replace(/px$/, ''), key));
    const shape = this.build(source.id, numbers, source.text);
    for (const [attribute, value] of Object.entries(source.attributes)) {
      if (attribute !== 'id' && !this.keys.includes(attribute)) shape.importAttribute(attribute, value);
    }
    return shape;
  }
}
