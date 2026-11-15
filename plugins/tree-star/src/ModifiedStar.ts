import type { SessionObserver, SvgDocument, TreeDecorator, TreeLine } from '@svgframe/kernel';
import { ContentFingerprint } from './ContentFingerprint.js';

/**
 * Tree label `*` for unsaved changes. Dirty means "content differs from the last saved state"
 * (the document after the last successful init, read or save), so undoing back to the save point
 * clears the mark. A newly created shape is dirty at once. Containers are not marked for changes
 * inside their children (no ancestor propagation) but are marked when their own attributes or
 * direct membership/order change. The root `svg` line is marked when anything in the document,
 * including the canvas, differs. All state lives in this instance; one instance per activation.
 */
export class ModifiedStar implements TreeDecorator, SessionObserver {
  readonly name = 'modified-star';
  private savedShapes: ReadonlyMap<string, string> = new Map();
  private savedDocument?: string;

  baseline(document: SvgDocument): void {
    this.savedShapes = ContentFingerprint.ofShapes(document);
    this.savedDocument = ContentFingerprint.ofDocument(document);
  }

  label(line: TreeLine): string | undefined {
    const dirty = line.shape
      ? this.savedShapes.get(line.shape.id) !== ContentFingerprint.ofShape(line.shape)
      : this.savedDocument !== ContentFingerprint.ofDocument(line.document);
    return dirty ? '*' : undefined;
  }
}
