import type { SvgDocument } from '../domain/SvgDocument.js';

/** Outbound port; the application does not depend on filesystem or XML packages. */
export interface DocumentStore {
  read(path: string): { document: SvgDocument; warnings: readonly string[] };
  write(path: string, document: SvgDocument): void;
}
