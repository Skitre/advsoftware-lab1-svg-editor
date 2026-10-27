import { createInterface } from 'node:readline';
import type { Readable, Writable } from 'node:stream';
import { CommandFactory } from './CommandFactory.js';
import { Lexer } from './Lexer.js';

export class Repl {
  constructor(private readonly commands: CommandFactory, private readonly lexer = new Lexer()) {}

  async run(input: Readable, output: Writable, errors: Writable, interactive: boolean): Promise<boolean> {
    const lines = createInterface({ input, output, terminal: interactive, crlfDelay: Infinity });
    output.write("svg-editor 0.1 — type 'help' for commands\n");
    let successful = true;
    if (interactive) { lines.setPrompt('svg> '); lines.prompt(); }
    for await (const line of lines) {
      try {
        for (const result of this.commands.execute(this.lexer.tokenize(line))) output.write(`${result}\n`);
      } catch (error) {
        successful = false;
        const message = error instanceof Error ? error.message : String(error);
        errors.write(`error: ${message.replace(/[\r\n]+/g, ' ')}\n`);
      }
      if (interactive) lines.prompt();
    }
    return successful;
  }
}
