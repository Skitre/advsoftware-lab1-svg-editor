import type { Plugin, PluginContext } from '@svgframe/kernel';
import { BoxAttributeHandler } from './BoxAttributeHandler.js';
import { BoxProvider } from './BoxProvider.js';
import { BoxTypeLabel } from './BoxTypeLabel.js';

/** Contributes the `box` shape, its attribute semantics and its `(box)` tree label. Option: `fill` (default frame fill). */
export class BoxPlugin implements Plugin {
  static readonly defaultFill = '#4a90d9';

  activate(context: PluginContext): void {
    const fill = context.options.fill ?? BoxPlugin.defaultFill;
    if (typeof fill !== 'string' || !fill) throw new Error('option fill must be a non-empty string');
    context.registerShape(new BoxProvider(context.shapes, fill));
    context.registerAttributeHandler(new BoxAttributeHandler());
    context.registerTreeDecorator(new BoxTypeLabel());
  }
}
