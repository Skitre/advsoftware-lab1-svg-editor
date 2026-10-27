import type { DocumentStore } from '../../src/application/DocumentStore.js';
import type { SvgDocument } from '../../src/domain/SvgDocument.js';
export class MemoryDocumentStore implements DocumentStore {
  private readonly files = new Map<string, SvgDocument>();
  read(path: string): { document: SvgDocument; warnings: readonly string[] } {
    const document = this.files.get(path);
    if (!document) throw new Error(`cannot read file: ${path}`);
    return { document: document.clone(), warnings: [] };
  }
  write(path: string, document: SvgDocument): void {
    if (path === 'unwritable.svg') throw new Error(`cannot write file: ${path}`);
    this.files.set(path, document.clone());
  }
}
