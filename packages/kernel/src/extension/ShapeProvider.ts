import type { Shape } from '../domain/Shape.js';

/** One SVG element as read from a file, handed to the provider that restores it. */
export interface SvgElementSource {
  readonly tag: string;
  /** Explicit or generated id (generated ids have already produced a warning). */
  readonly id: string;
  /** All attributes of the element except namespace declarations, including `id` when present. */
  readonly attributes: Readonly<Record<string, string>>;
  readonly text: string;
}

export interface ShapeRestoreContext {
  /** Emits `warning: ...` lines for `read` (e.g. a provider degrading malformed input). */
  warn(message: string): void;
}

/**
 * Extension point: one shape type. Kernel callers: ShapeRegistry.create (`create`),
 * ShapeRegistry.restore via SvgCodec.readShape (`read`), and the help command (syntax).
 */
export interface ShapeProvider {
  /** Registration name and `create <type>` keyword. */
  readonly type: string;
  /** SVG element name this provider writes and reads back. */
  readonly element: string;
  /** `data-kind` value that selects this provider instead of the plain provider of the element. */
  readonly kind?: string;
  /** What the element may contain when read back. */
  readonly content: 'none' | 'text' | 'shapes';
  /** Help line without the leading `create`, e.g. `rect <id> <x> <y> <w> <h> [fill]`. */
  readonly syntax: string;
  /** Builds a new, detached shape whose `id` and `type` equal the arguments. */
  create(id: string, params: readonly string[]): Shape;
  /** Rebuilds a shape from SVG; `children` are the already restored child shapes in document order. */
  restore(source: SvgElementSource, children: readonly Shape[], context: ShapeRestoreContext): Shape;
}
