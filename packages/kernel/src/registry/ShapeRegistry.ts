import { Shape } from '../domain/Shape.js';
import type { ShapeCatalog } from '../extension/ShapeCatalog.js';
import type { ShapeProvider, ShapeRestoreContext, SvgElementSource } from '../extension/ShapeProvider.js';
import { Registry } from './Registry.js';

/** ShapeProvider registry: the only shape-type dispatch point of the kernel. */
export class ShapeRegistry extends Registry<ShapeProvider> implements ShapeCatalog {
  constructor() { super('shapes'); }

  override nameOf(provider: ShapeProvider): string { return provider.type; }

  override validate(item: unknown): asserts item is ShapeProvider {
    super.validate(item);
    const provider = item as ShapeProvider;
    this.requireMethods(provider, ['create', 'restore']);
    if (typeof provider.element !== 'string' || !provider.element) this.violation(`${provider.type}: element must be a tag name`);
    if (provider.kind !== undefined && (typeof provider.kind !== 'string' || !provider.kind)) this.violation(`${provider.type}: kind must be a non-empty string`);
    if (!['none', 'text', 'shapes'].includes(provider.content)) this.violation(`${provider.type}: content must be none, text or shapes`);
    if (typeof provider.syntax !== 'string') this.violation(`${provider.type}: syntax must be a string`);
  }

  /** A provider also claims its SVG element (plus data-kind), so read-back is unambiguous. */
  override keysOf(provider: ShapeProvider): readonly string[] {
    return [provider.type, this.elementKey(provider.element, provider.kind)];
  }

  create(type: string, id: string, params: readonly string[]): Shape {
    const shape = this.provider(type).create(id, params);
    if (!(shape instanceof Shape) || shape.id !== id || shape.type !== type) {
      this.violation(`${type}: create() must return a ${type} shape with id ${id}`);
    }
    return shape;
  }

  /** Provider for an SVG element: a data-kind specific provider first, else the plain one. */
  providerFor(element: string, kind?: string): ShapeProvider {
    const provider = this.values().find(item => kind !== undefined && item.element === element && item.kind === kind)
      ?? this.values().find(item => item.element === element && item.kind === undefined);
    if (!provider) throw new Error(`unknown shape type: ${element} (is the plugin loaded?)`);
    return provider;
  }

  restore(provider: ShapeProvider, source: SvgElementSource, children: readonly Shape[], context: ShapeRestoreContext): Shape {
    const shape = provider.restore(source, children, context);
    if (!(shape instanceof Shape) || shape.id !== source.id) {
      this.violation(`${provider.type}: restore() must return a shape with id ${source.id}`);
    }
    return shape;
  }

  syntaxes(): readonly string[] { return this.values().map(provider => provider.syntax); }

  private provider(type: string): ShapeProvider {
    const provider = this.get(type);
    if (!provider) throw new Error(`unknown shape type: ${type} (is the plugin loaded?)`);
    return provider;
  }

  private elementKey(element: string, kind?: string): string {
    return kind === undefined ? `<${element}>` : `<${element} data-kind="${kind}">`;
  }
}
