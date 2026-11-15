import { Group, Numbers } from '@svgframe/kernel';
import type { Shape, ShapeCatalog, ShapeProvider, ShapeRestoreContext, SvgElementSource } from '@svgframe/kernel';
import { Box } from './Box.js';

/**
 * ShapeProvider for `box`. Parts are built through the kernel's shape catalog by type name
 * (`rect`, `text`), so this plugin depends on those types being registered, not on their code.
 * Template: the frame at (x, y, w, h) with the default fill; the title at (x + 20, y + h/2 + 5).
 */
export class BoxProvider implements ShapeProvider {
  readonly type = 'box';
  readonly element = 'g';
  readonly kind = 'box';
  readonly content = 'shapes';
  readonly syntax = 'box <id> <x> <y> <w> <h> "<label>"';

  constructor(private readonly shapes: ShapeCatalog, private readonly fill: string) {}

  create(id: string, params: readonly string[]): Shape {
    if (params.length !== 5) throw new Error('invalid parameters for box');
    const [x, y, width, height] = ['x', 'y', 'width', 'height'].map((key, index) => Numbers.parse(params[index]!, key)) as [number, number, number, number];
    const box = new Box(id);
    box.insert(this.shapes.create('rect', Box.frameId(id), [x, y, width, height].map(String).concat(this.fill)));
    box.insert(this.shapes.create('text', Box.labelId(id), [String(x + 20), String(y + height / 2 + 5), params[4]!]));
    return box;
  }

  /**
   * Read-back decision (ADR): a `<g data-kind="box">` whose frame or title is missing or has the wrong
   * type is read as a plain group with a warning, never as an incomplete Box. Duplicate ids are
   * rejected for the whole file by the kernel before this runs.
   */
  restore(source: SvgElementSource, children: readonly Shape[], context: ShapeRestoreContext): Shape {
    const problem = this.problem(source.id, children);
    const shape = problem ? new Group(source.id) : new Box(source.id);
    if (problem) context.warn(`${problem}; read box ${source.id} as plain g`);
    for (const [attribute, value] of Object.entries(source.attributes)) {
      if (attribute !== 'id' && (problem || attribute !== 'data-kind')) shape.importAttribute(attribute, value);
    }
    for (const child of children) shape.container!.insert(child);
    return shape;
  }

  private problem(id: string, children: readonly Shape[]): string | undefined {
    for (const [partId, type] of [[Box.frameId(id), 'rect'], [Box.labelId(id), 'text']] as const) {
      const part = children.find(child => child.id === partId);
      if (!part) return `missing part ${partId}`;
      if (part.type !== type) return `part ${partId} is ${part.type}, expected ${type}`;
    }
    return undefined;
  }
}
