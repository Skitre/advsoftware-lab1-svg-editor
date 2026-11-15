import type { SvgElementNode } from './SvgElementNode';

type OpenElement = { tag: string; id?: string; start: number; nameStart: number; nameEnd: number; children: SvgElementNode[] };

/**
 * Tolerant-by-refusal XML element scanner for the outline: it keeps source offsets for every element
 * and returns `undefined` (no outline) for any text that is not well-formed — unclosed or mismatched
 * tags, unterminated comments/strings, attributes without quoted values. It never throws, so an
 * extension using it cannot crash while the user is typing. Not an SVG validator: every element
 * (path, defs, use, ...) is reported, whatever its name.
 */
export class SvgOutlineParser {
  private static readonly namePattern = /[\p{L}_:][\p{L}\p{N}_:.\-]*/uy;
  private static readonly space = /\s*/y;

  parse(text: string): readonly SvgElementNode[] | undefined {
    try { return this.scan(text); } catch { return undefined; }
  }

  private scan(text: string): readonly SvgElementNode[] | undefined {
    const roots: SvgElementNode[] = [];
    const stack: OpenElement[] = [];
    let index = 0;
    while ((index = text.indexOf('<', index)) >= 0) {
      if (text.startsWith('<!--', index)) index = this.after(text, '-->', index + 4);
      else if (text.startsWith('<![CDATA[', index)) index = this.after(text, ']]>', index + 9);
      else if (text.startsWith('<?', index)) index = this.after(text, '?>', index + 2);
      else if (text.startsWith('<!', index)) index = this.declaration(text, index + 2);
      else if (text.startsWith('</', index)) {
        const nameStart = index + 2;
        const tag = this.match(SvgOutlineParser.namePattern, text, nameStart);
        const close = this.skipSpace(text, nameStart + (tag?.length ?? 0));
        const open = stack.pop();
        if (!tag || text[close] !== '>' || !open || open.tag !== tag) return undefined;
        index = close + 1;
        this.attach({ ...open, end: index }, stack, roots);
      } else {
        const nameStart = index + 1;
        const tag = this.match(SvgOutlineParser.namePattern, text, nameStart);
        if (!tag) return undefined;
        const element: OpenElement = { tag, start: index, nameStart, nameEnd: nameStart + tag.length, children: [] };
        index = this.attributes(text, element);
        if (text.startsWith('/>', index)) { index += 2; this.attach({ ...element, end: index }, stack, roots); }
        else { index += 1; stack.push(element); }
      }
    }
    return stack.length ? undefined : roots;
  }

  /** Reads attributes up to (not including) `>` or `/>`, recording `id`. Returns that offset. */
  private attributes(text: string, element: OpenElement): number {
    let index = element.nameEnd;
    for (;;) {
      const next = this.skipSpace(text, index);
      if (text.startsWith('/>', next) || text[next] === '>') return next;
      if (next === index) throw new Error('attribute must be preceded by whitespace');
      const name = this.match(SvgOutlineParser.namePattern, text, next);
      if (!name) throw new Error('attribute name expected');
      const equals = this.skipSpace(text, next + name.length);
      if (text[equals] !== '=') throw new Error('= expected');
      const quoteAt = this.skipSpace(text, equals + 1);
      const quote = text[quoteAt];
      if (quote !== '"' && quote !== "'") throw new Error('quoted value expected');
      const close = text.indexOf(quote, quoteAt + 1);
      if (close < 0) throw new Error('unterminated attribute value');
      const value = text.slice(quoteAt + 1, close);
      if (value.includes('<')) throw new Error('< in attribute value');
      if (name === 'id') element.id = this.decode(value);
      index = close + 1;
    }
  }

  private attach(node: SvgElementNode, stack: readonly OpenElement[], roots: SvgElementNode[]): void {
    (stack.at(-1)?.children ?? roots).push(node);
  }

  /** `<!DOCTYPE ...>` possibly with an internal subset `[...]`. */
  private declaration(text: string, from: number): number {
    const bracket = text.indexOf('[', from);
    const close = text.indexOf('>', from);
    if (close < 0) throw new Error('unterminated declaration');
    if (bracket >= 0 && bracket < close) return this.after(text, '>', this.after(text, ']', bracket + 1));
    return close + 1;
  }

  private after(text: string, token: string, from: number): number {
    const found = text.indexOf(token, from);
    if (found < 0) throw new Error(`unterminated, expected ${token}`);
    return found + token.length;
  }

  private match(pattern: RegExp, text: string, at: number): string | undefined {
    pattern.lastIndex = at;
    return pattern.exec(text)?.[0] || undefined;
  }

  private skipSpace(text: string, at: number): number {
    SvgOutlineParser.space.lastIndex = at;
    SvgOutlineParser.space.exec(text);
    return SvgOutlineParser.space.lastIndex;
  }

  private decode(value: string): string {
    const named: Readonly<Record<string, string>> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };
    return value.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (entity, body: string) =>
      body.startsWith('#') ? String.fromCodePoint(Number.parseInt(body.slice(body[1] === 'x' || body[1] === 'X' ? 2 : 1), body[1]?.toLowerCase() === 'x' ? 16 : 10))
        : named[body.toLowerCase()] ?? entity);
  }
}
