import { readFileSync, writeFileSync, renameSync, rmSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { randomUUID } from 'node:crypto';
import type { DocumentStore } from '../application/DocumentStore.js';
import type { SvgDocument } from '../domain/SvgDocument.js';
import { SvgCodec } from './SvgCodec.js';

export class FileDocumentStore implements DocumentStore {
  constructor(private readonly codec = new SvgCodec()) {}

  read(path: string): { document: SvgDocument; warnings: readonly string[] } {
    let source: string;
    try { source = readFileSync(path, 'utf8'); }
    catch { throw new Error(`cannot read file: ${path}`); }
    return this.codec.decode(source);
  }

  write(path: string, document: SvgDocument): void {
    const source = this.codec.encode(document);
    const temporary = join(dirname(path), `.${basename(path)}.${randomUUID()}.tmp`);
    try {
      writeFileSync(temporary, source, { encoding: 'utf8', flag: 'wx' });
      renameSync(temporary, path);
    } catch {
      throw new Error(`cannot write file: ${path}`);
    } finally {
      rmSync(temporary, { force: true });
    }
  }
}
