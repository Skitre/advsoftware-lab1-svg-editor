import type { Shape, SvgDocument } from '@svgframe/kernel';

/**
 * Content identity used for dirty tracking. A shape's fingerprint covers its own state only — type,
 * tag, attributes, text, and the ids of its direct children in order — so editing a child does not
 * change its container's fingerprint, while adding, removing or reordering children does.
 */
export class ContentFingerprint {
  static ofShape(shape: Shape): string {
    return JSON.stringify([shape.type, shape.tag, shape.attributes(), shape.textContent ?? null, shape.children.map(child => child.id)]);
  }

  /** Per-id fingerprints of every shape in the document. */
  static ofShapes(document: SvgDocument): ReadonlyMap<string, string> {
    return new Map(document.all().map(shape => [shape.id, ContentFingerprint.ofShape(shape)]));
  }

  /** The whole document: canvas size, viewBox, root presentation and every shape in document order. */
  static ofDocument(document: SvgDocument): string {
    return JSON.stringify([document.width, document.height, document.viewBox, document.canvasPresentation(),
      document.children.map(child => child.id), [...ContentFingerprint.ofShapes(document)]]);
  }
}
