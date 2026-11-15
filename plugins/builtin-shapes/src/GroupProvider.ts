import { Group } from '@svgframe/kernel';
import type { Shape, ShapeProvider, SvgElementSource } from '@svgframe/kernel';

/** Plain `<g>` container; also the read-back fallback for any `<g data-kind=...>` without its plugin. */
export class GroupProvider implements ShapeProvider {
  readonly type = 'g';
  readonly element = 'g';
  readonly content = 'shapes';
  readonly syntax = 'g <id>';

  create(id: string, params: readonly string[]): Shape {
    if (params.length) throw new Error('invalid parameters for g');
    return new Group(id);
  }

  restore(source: SvgElementSource, children: readonly Shape[]): Shape {
    const group = new Group(source.id);
    for (const [attribute, value] of Object.entries(source.attributes)) {
      if (attribute !== 'id') group.importAttribute(attribute, value);
    }
    for (const child of children) group.insert(child);
    return group;
  }
}
