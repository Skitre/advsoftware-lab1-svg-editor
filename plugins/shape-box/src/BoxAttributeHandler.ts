import type { AttributeHandler, Shape, SvgDocument } from '@svgframe/kernel';
import { Box } from './Box.js';

/**
 * Domain meaning of attributes on a box: `fill` propagates to the frame, `label` rewrites the title.
 * Other attributes (stroke, stroke-width) fall back to the default rules and apply to the group itself.
 */
export class BoxAttributeHandler implements AttributeHandler {
  readonly name = 'box-attributes';

  handles(shape: Shape, attribute: string): boolean {
    return shape.type === 'box' && (attribute === 'fill' || attribute === 'label');
  }

  apply(shape: Shape, attribute: string, value: string, document: SvgDocument): string {
    if (attribute === 'fill') {
      document.find(Box.frameId(shape.id)).set('fill', value);
      return `${shape.label} fill propagated to ${Box.frameId(shape.id)}`;
    }
    document.find(Box.labelId(shape.id)).set('text', value);
    return `${shape.label} label updated: ${JSON.stringify(value)}`;
  }
}
