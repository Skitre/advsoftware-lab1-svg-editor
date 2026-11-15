import type { Shape } from '../domain/Shape.js';
import type { SvgDocument } from '../domain/SvgDocument.js';

/** One line of the structure tree: the root `svg (WxH)` line has no shape. */
export interface TreeLine {
  readonly document: SvgDocument;
  readonly shape?: Shape;
}

/**
 * Extension point: a label appended to tree lines. Kernel caller: TreeRenderer.decorate.
 * Labels of all decorators are appended in registration order, each preceded by one space.
 * Returning undefined or '' adds nothing; labels must be single-line strings.
 */
export interface TreeDecorator {
  /** Stable registration name (manifest `decorators`). */
  readonly name: string;
  label(line: TreeLine): string | undefined;
}

/** Renders `tree` (decorated) and `show` output. */
export interface TreeView {
  tree(document: SvgDocument, id?: string): string[];
  show(document: SvgDocument, id: string): string[];
}
