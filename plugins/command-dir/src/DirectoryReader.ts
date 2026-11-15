export type EntryKind = 'directory' | 'file' | 'symlink' | 'other';

export interface DirectoryEntry {
  readonly name: string;
  readonly kind: EntryKind;
}

/**
 * Adapter pattern — Target: the directory access `dir` needs, in the command's own terms.
 * `list` returns the direct children of `path` (any order) and throws when it cannot be read.
 */
export interface DirectoryReader {
  list(path: string): readonly DirectoryEntry[];
}
