import { readdirSync } from 'node:fs';
import type { Dirent } from 'node:fs';
import type { DirectoryEntry, DirectoryReader, EntryKind } from './DirectoryReader.js';

/**
 * Adapter pattern — Adapter: implements DirectoryReader on top of the Adaptee `node:fs`
 * (`readdirSync` with `Dirent` file types). Entries are classified without following symbolic
 * links, so a link to a directory is reported as a link and is never traversed.
 */
export class NodeDirectoryReader implements DirectoryReader {
  list(path: string): readonly DirectoryEntry[] {
    return readdirSync(path, { withFileTypes: true }).map(entry => ({ name: entry.name, kind: this.kind(entry) }));
  }

  private kind(entry: Dirent): EntryKind {
    if (entry.isDirectory()) return 'directory';
    if (entry.isFile()) return 'file';
    if (entry.isSymbolicLink()) return 'symlink';
    return 'other';
  }
}
