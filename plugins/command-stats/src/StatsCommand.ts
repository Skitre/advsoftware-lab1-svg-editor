import type { Command, CommandArguments, CommandContext } from '@svgframe/kernel';
import { ShapeStatistics } from './ShapeStatistics.js';

/** `stats`: read-only shape statistics of the current document; never enters the undo stack. */
export class StatsCommand implements Command {
  readonly name = 'stats';
  readonly syntax = 'stats';
  readonly requiresDocument = true;

  execute(args: CommandArguments, context: CommandContext): readonly string[] {
    args.count(0);
    return [ShapeStatistics.of(context.session.snapshot()).format()];
  }
}
