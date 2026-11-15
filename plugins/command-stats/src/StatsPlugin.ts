import type { Plugin, PluginContext } from '@svgframe/kernel';
import { StatsCommand } from './StatsCommand.js';

/** Contributes the `stats` command. */
export class StatsPlugin implements Plugin {
  activate(context: PluginContext): void { context.registerCommand(new StatsCommand()); }
}
