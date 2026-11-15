import type { Command, CommandArguments, CommandContext } from '@svgframe/kernel';

type Run = (args: CommandArguments, context: CommandContext) => readonly string[];

/** A command whose behaviour is a closure; keeps the Phase 1 command table readable. */
export class DelegateCommand implements Command {
  constructor(readonly name: string, readonly syntax: string, readonly requiresDocument: boolean, private readonly run: Run) {}
  execute(args: CommandArguments, context: CommandContext): readonly string[] { return this.run(args, context); }
}
