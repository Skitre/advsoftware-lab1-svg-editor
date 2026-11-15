import { CommandArguments } from '../extension/CommandArguments.js';
import type { CommandContext } from '../extension/Command.js';
import type { Token } from '../extension/Token.js';
import type { CommandRegistry } from '../registry/CommandRegistry.js';

/** Dispatches a tokenized line through the command registry; knows no concrete command. */
export class CommandDispatcher {
  constructor(private readonly commands: CommandRegistry, private readonly context: CommandContext) {}

  execute(tokens: readonly Token[]): readonly string[] {
    if (!tokens.length) return [];
    const command = this.commands.lookup(tokens[0]!.value);
    if (command.requiresDocument) this.context.session.snapshot();
    const lines: unknown = command.execute(new CommandArguments(tokens.slice(1), command.syntax), this.context);
    if (!Array.isArray(lines) || lines.some(line => typeof line !== 'string')) {
      throw new Error(`commands contract violation: ${command.name}: execute() must return string lines`);
    }
    return lines;
  }
}
