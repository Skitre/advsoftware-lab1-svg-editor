import type { Group } from './Group.js';
import { Numbers } from './Numbers.js';

/** Rich domain base: owns identity/style and defines polymorphic shape operations. */
export abstract class Shape {
  private readonly styles = new Map<string, string>();
  private readonly imported = new Map<string, string>();

  constructor(private readonly identity: string) {
    if (!identity || /[\s\x00-\x1f]/.test(identity)) throw new Error(`invalid id: ${identity}`);
  }

  get id(): string { return this.identity; }
  /** SVG element name used for serialization and the structure tree. */
  abstract get tag(): string;
  /** Registered shape type (`create <type>`); equals the tag unless a plugin composes a new type. */
  get type(): string { return this.tag; }
  /** Name used in command feedback, e.g. `rect#r1` or `box#n1`. */
  get label(): string { return `${this.type}#${this.id}`; }
  /** Optional detail appended to creation feedback, e.g. the parts of a composite shape. */
  describeComposition(): string { return ''; }
  get children(): readonly Shape[] { return []; }
  get container(): Group | undefined { return undefined; }
  get textContent(): string | undefined { return undefined; }

  contains(shape: Shape): boolean {
    return this.children.some(child => child === shape || child.contains(shape));
  }

  abstract move(dx: number, dy: number): void;
  abstract scale(factor: number): void;
  abstract clone(): Shape;
  abstract geometry(): Readonly<Record<string, number>>;
  abstract describeGeometry(): string;

  set(attribute: string, value: string): void {
    if (attribute === 'fill' || attribute === 'stroke') {
      this.styles.set(attribute, value);
    } else if (attribute === 'stroke-width') {
      this.styles.set(attribute, String(Numbers.nonnegative(Numbers.parse(value, attribute), attribute)));
    } else {
      throw new Error(`unknown attribute: ${attribute}`);
    }
  }

  /** Preserve common SVG presentation metadata without extending the CLI set whitelist. */
  importAttribute(attribute: string, value: string): void {
    if (['font-size', 'font-family', 'font-weight', 'text-anchor', 'dominant-baseline',
      'opacity', 'fill-opacity', 'stroke-opacity', 'stroke-linecap', 'stroke-linejoin',
      'rx', 'ry', 'data-kind', 'transform'].includes(attribute) && !(attribute in this.geometry())) {
      this.imported.set(attribute, value);
    } else {
      this.set(attribute, value);
    }
  }

  attributes(): Readonly<Record<string, string>> {
    return Object.fromEntries([
      ['id', this.id],
      ...Object.entries(this.geometry()).map(([key, value]) => [key, String(value)]),
      ...this.styles,
      ...this.imported,
    ]);
  }

  describe(): string {
    return [`${this.tag}#${this.id}`, this.describeGeometry(), ...Array.from(this.styles, ([key, value]) => `${key}=${value}`)]
      .filter(Boolean).join('  ');
  }

  protected copyPresentationTo(target: Shape): void {
    for (const [key, value] of this.styles) target.styles.set(key, value);
    for (const [key, value] of this.imported) target.imported.set(key, value);
  }
}
