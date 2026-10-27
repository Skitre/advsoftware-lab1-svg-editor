import { Circle } from './Circle.js';
import { Ellipse } from './Ellipse.js';
import { Group } from './Group.js';
import { Line } from './Line.js';
import { Numbers } from './Numbers.js';
import { Rect } from './Rect.js';
import type { Shape } from './Shape.js';
import { Text } from './Text.js';

type Definition = {
  keys: readonly string[];
  optional?: string;
  build: (id: string, numbers: number[], content: string) => Shape;
  content?: boolean;
};

/** The only shape-name dispatch point. Static registration is a Phase 2 refactor point. */
export class ShapeFactory {
  private readonly definitions: ReadonlyMap<string, Definition> = new Map([
    ['rect', { keys: ['x', 'y', 'width', 'height'], optional: 'fill', build: (id, v) => new Rect(id, v[0]!, v[1]!, v[2]!, v[3]!) }],
    ['circle', { keys: ['cx', 'cy', 'r'], optional: 'fill', build: (id, v) => new Circle(id, v[0]!, v[1]!, v[2]!) }],
    ['ellipse', { keys: ['cx', 'cy', 'rx', 'ry'], optional: 'fill', build: (id, v) => new Ellipse(id, v[0]!, v[1]!, v[2]!, v[3]!) }],
    ['line', { keys: ['x1', 'y1', 'x2', 'y2'], optional: 'stroke', build: (id, v) => new Line(id, v[0]!, v[1]!, v[2]!, v[3]!) }],
    ['text', { keys: ['x', 'y'], content: true, build: (id, v, content) => new Text(id, v[0]!, v[1]!, content) }],
    ['g', { keys: [], build: id => new Group(id) }],
  ]);

  create(type: string, id: string, params: readonly string[]): Shape {
    const definition = this.definition(type);
    const required = definition.keys.length + (definition.content ? 1 : 0);
    if (params.length < required || params.length > required + (definition.optional ? 1 : 0)) {
      throw new Error(`invalid parameters for ${type}`);
    }
    const numbers = definition.keys.map((key, index) => Numbers.parse(params[index]!, key));
    const shape = definition.build(id, numbers, definition.content ? params[definition.keys.length]! : '');
    if (definition.optional && params[required] !== undefined) shape.set(definition.optional, params[required]!);
    return shape;
  }

  fromSvg(type: string, id: string, attributes: Readonly<Record<string, string>>, content: string): Shape {
    const definition = this.definition(type);
    const shape = definition.build(id, definition.keys.map(key => Numbers.parse((attributes[key] ?? '0').trim().replace(/px$/, ''), key)), content);
    for (const [attribute, value] of Object.entries(attributes)) {
      if (attribute !== 'id' && !definition.keys.includes(attribute)) shape.importAttribute(attribute, value);
    }
    return shape;
  }

  private definition(type: string): Definition {
    const definition = this.definitions.get(type);
    if (!definition) throw new Error(`unknown shape type: ${type} (is the plugin loaded?)`);
    return definition;
  }
}
