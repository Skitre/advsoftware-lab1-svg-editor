import type { ExtensionCategory } from '../extension/ExtensionCategory.js';

/**
 * Ordered, name-unique registry for one extension point. Iteration follows registration order,
 * which is also the order of the plugin configuration.
 */
export abstract class Registry<T> {
  private readonly items = new Map<string, T>();
  private readonly keys = new Set<string>();

  constructor(readonly category: ExtensionCategory) {}

  /** Registration name as listed in the manifest. */
  abstract nameOf(item: T): string;

  /** Throws `<category> contract violation: ...` when the item does not implement the interface. */
  validate(item: unknown): asserts item is T {
    if (typeof item !== 'object' || item === null) this.violation('registration must be an object');
    const name = this.nameOf(item as T);
    if (typeof name !== 'string' || !/^[^\s\x00-\x1f]+$/.test(name)) this.violation('registration name must be a non-empty word');
  }

  /** Unique keys the item occupies; a second item with any of these keys is a duplicate. */
  keysOf(item: T): readonly string[] { return [this.nameOf(item)]; }
  occupied(key: string): boolean { return this.keys.has(key); }

  register(item: unknown): void {
    this.validate(item);
    const keys = this.keysOf(item);
    const duplicate = keys.find(key => this.keys.has(key));
    if (duplicate !== undefined) throw new Error(`duplicate registration: ${this.category}/${duplicate}`);
    for (const key of keys) this.keys.add(key);
    this.items.set(this.nameOf(item), item);
  }

  has(name: string): boolean { return this.items.has(name); }
  get(name: string): T | undefined { return this.items.get(name); }
  values(): readonly T[] { return [...this.items.values()]; }
  names(): readonly string[] { return [...this.items.keys()]; }

  protected violation(reason: string): never {
    throw new Error(`${this.category} contract violation: ${reason}`);
  }

  protected requireMethods(item: object, methods: readonly string[]): void {
    for (const method of methods) {
      if (typeof (item as Record<string, unknown>)[method] !== 'function') this.violation(`missing method ${method}()`);
    }
  }
}
