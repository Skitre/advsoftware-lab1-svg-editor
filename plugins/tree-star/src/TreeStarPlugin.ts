import type { Plugin, PluginContext } from '@svgframe/kernel';
import { ModifiedStar } from './ModifiedStar.js';

/** Contributes the `modified-star` tree label; it observes the session to learn the saved state. */
export class TreeStarPlugin implements Plugin {
  activate(context: PluginContext): void {
    const star = new ModifiedStar();
    context.registerTreeDecorator(star);
    context.observeSession(star);
  }
}
