/** One element of an SVG/XML text with source offsets (UTF-16 indices into the document text). */
export interface SvgElementNode {
  readonly tag: string;
  readonly id?: string;
  /** Offset of `<` of the start tag. */
  readonly start: number;
  /** Offset just after the `>` that closes the element (end tag or `/>`). */
  readonly end: number;
  /** Offsets of the tag name inside the start tag (the symbol's selection range). */
  readonly nameStart: number;
  readonly nameEnd: number;
  readonly children: readonly SvgElementNode[];
}
