import type { Command, CommandCatalog } from '../extension/Command.js';
import { Registry } from './Registry.js';

/** Command registry: the only command-name dispatch point of the kernel. */
export class CommandRegistry extends Registry<Command> implements CommandCatalog {
  constructor() { super('commands'); }

  override nameOf(command: Command): string { return command.name; }

  override validate(item: unknown): asserts item is Command {
    super.validate(item);
    const command = item as Command;
    this.requireMethods(command, ['execute']);
    if (typeof command.syntax !== 'string') this.violation(`${command.name}: syntax must be a string`);
    if (typeof command.requiresDocument !== 'boolean') this.violation(`${command.name}: requiresDocument must be a boolean`);
  }

  lookup(name: string): Command {
    const command = this.get(name);
    if (!command) throw new Error(`unknown command: ${name}`);
    return command;
  }

  syntaxes(): readonly string[] { return this.values().map(command => command.syntax); }
}
