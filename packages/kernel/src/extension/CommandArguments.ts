import { Numbers } from '../domain/Numbers.js';
import type { Token } from './Token.js';

export class CommandArguments {
  constructor(private readonly tokens: readonly Token[], private readonly syntax: string) {}
  get length(): number { return this.tokens.length; }

  count(minimum: number, maximum = minimum): this {
    if (this.length < minimum || this.length > maximum) throw new Error(`usage: ${this.syntax}`);
    return this;
  }

  at(index: number): string {
    const token = this.tokens[index];
    if (!token) throw new Error(`usage: ${this.syntax}`);
    return token.value;
  }

  number(index: number, label: string): number { return Numbers.parse(this.at(index), label); }
  values(start = 0): string[] { return this.tokens.slice(start).map(token => token.value); }

  creation(): { type: string; id: string; params: readonly string[]; containerId?: string } {
    this.count(2, Infinity);
    const suffix = this.tokens[this.length - 2];
    const hasContainer = this.length >= 4 && suffix?.value === 'in' && !suffix.quoted;
    return {
      type: this.at(0), id: this.at(1),
      params: this.tokens.slice(2, hasContainer ? -2 : undefined).map(token => token.value),
      containerId: hasContainer ? this.at(this.length - 1) : undefined,
    };
  }
}
