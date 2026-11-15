import type { Plugin, PluginContext } from '@svgframe/kernel';
import { Circle } from './Circle.js';
import { Ellipse } from './Ellipse.js';
import { GeometryShapeProvider } from './GeometryShapeProvider.js';
import { GroupProvider } from './GroupProvider.js';
import { Line } from './Line.js';
import { Rect } from './Rect.js';
import { Text } from './Text.js';

/** The six Phase 1 shape types, registered through the ShapeProvider extension point. */
export class BuiltinShapesPlugin implements Plugin {
  activate(context: PluginContext): void {
    for (const provider of [
      new GeometryShapeProvider('rect', 'rect <id> <x> <y> <w> <h> [fill]', ['x', 'y', 'width', 'height'],
        (id, v) => new Rect(id, v[0]!, v[1]!, v[2]!, v[3]!), 'fill'),
      new GeometryShapeProvider('circle', 'circle <id> <cx> <cy> <r> [fill]', ['cx', 'cy', 'r'],
        (id, v) => new Circle(id, v[0]!, v[1]!, v[2]!), 'fill'),
      new GeometryShapeProvider('ellipse', 'ellipse <id> <cx> <cy> <rx> <ry> [fill]', ['cx', 'cy', 'rx', 'ry'],
        (id, v) => new Ellipse(id, v[0]!, v[1]!, v[2]!, v[3]!), 'fill'),
      new GeometryShapeProvider('line', 'line <id> <x1> <y1> <x2> <y2> [stroke]', ['x1', 'y1', 'x2', 'y2'],
        (id, v) => new Line(id, v[0]!, v[1]!, v[2]!, v[3]!), 'stroke'),
      new GeometryShapeProvider('text', 'text <id> <x> <y> "content"', ['x', 'y'],
        (id, v, content) => new Text(id, v[0]!, v[1]!, content), undefined, true),
      new GroupProvider(),
    ]) context.registerShape(provider);
  }
}
