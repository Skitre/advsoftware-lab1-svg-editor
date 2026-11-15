import type { Shape } from '../domain/Shape.js';

/** Read-only view of the registered shape types, resolved at call time. */
export interface ShapeCatalog {
  /** Creates a shape of a registered type; unknown types fail with `unknown shape type: ...`. */
  create(type: string, id: string, params: readonly string[]): Shape;
  has(type: string): boolean;
  /** Help lines of all registered providers in registration order. */
  syntaxes(): readonly string[];
}
