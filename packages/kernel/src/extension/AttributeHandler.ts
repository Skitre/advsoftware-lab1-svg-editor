import type { Shape } from '../domain/Shape.js';
import type { SvgDocument } from '../domain/SvgDocument.js';

/**
 * Extension point: the domain meaning of setting one attribute on one kind of shape.
 * Kernel caller: AttributeRegistry.set, used by the `set` command inside an undoable edit.
 *
 * Contract:
 * - `handles` is a pure query; it must not modify the shape or the document.
 * - `apply` modifies `shape` and other parts through their public methods. It always runs
 *   on a draft copy of the document, so the whole `set` is one undo unit and an exception
 *   discards every partial change without touching undo/redo history.
 * - When several handlers match, the highest `priority` (default 0) wins; a tie is an error.
 * - A failing handler never falls back to the default attribute rules.
 */
export interface AttributeHandler {
  /** Stable registration name (manifest `attributes`). */
  readonly name: string;
  readonly priority?: number;
  handles(shape: Shape, attribute: string): boolean;
  /** Returns the feedback line, or nothing for the default `<label> updated: attr="value"`. */
  apply(shape: Shape, attribute: string, value: string, document: SvgDocument): string | void;
}

/** Kernel service running the `set` flow: matching handler first, then the shape's own whitelist. */
export interface AttributeService {
  set(document: SvgDocument, id: string, attribute: string, value: string): string;
}
