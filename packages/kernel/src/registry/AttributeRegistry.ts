import type { Shape } from '../domain/Shape.js';
import type { SvgDocument } from '../domain/SvgDocument.js';
import type { AttributeHandler, AttributeService } from '../extension/AttributeHandler.js';
import { Registry } from './Registry.js';

/** AttributeHandler registry and the `set` flow of phase_cli_2 §3.2. */
export class AttributeRegistry extends Registry<AttributeHandler> implements AttributeService {
  constructor() { super('attributes'); }

  override nameOf(handler: AttributeHandler): string { return handler.name; }

  override validate(item: unknown): asserts item is AttributeHandler {
    super.validate(item);
    const handler = item as AttributeHandler;
    this.requireMethods(handler, ['handles', 'apply']);
    if (handler.priority !== undefined && !Number.isFinite(handler.priority)) this.violation(`${handler.name}: priority must be a finite number`);
  }

  set(document: SvgDocument, id: string, attribute: string, value: string): string {
    const shape = document.find(id);
    const fallback = `${shape.label} updated: ${attribute}=${JSON.stringify(value)}`;
    const handler = this.resolve(shape, attribute);
    if (!handler) { shape.set(attribute, value); return fallback; }
    const message = handler.apply(shape, attribute, value, document);
    if (message !== undefined && typeof message !== 'string') this.violation(`${handler.name}: apply() must return a string or nothing`);
    return message || fallback;
  }

  /** Highest priority wins; equal top priorities are rejected instead of silently overriding. */
  resolve(shape: Shape, attribute: string): AttributeHandler | undefined {
    const matches = this.values().filter(handler => this.matches(handler, shape, attribute));
    if (matches.length <= 1) return matches[0];
    const top = Math.max(...matches.map(handler => handler.priority ?? 0));
    const winners = matches.filter(handler => (handler.priority ?? 0) === top);
    if (winners.length > 1) {
      throw new Error(`ambiguous attribute handlers for ${attribute} on ${shape.label}: ${winners.map(handler => handler.name).join(', ')}`);
    }
    return winners[0];
  }

  private matches(handler: AttributeHandler, shape: Shape, attribute: string): boolean {
    let result: unknown;
    try { result = handler.handles(shape, attribute); }
    catch (error) { throw new Error(`attribute handler ${handler.name} failed: ${error instanceof Error ? error.message : String(error)}`); }
    if (typeof result !== 'boolean') this.violation(`${handler.name}: handles() must return a boolean`);
    return result;
  }
}
