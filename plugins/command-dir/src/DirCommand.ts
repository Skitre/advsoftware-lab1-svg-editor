import type { Command, CommandArguments } from '@svgframe/kernel';
import type { DirectoryEntry, DirectoryReader, EntryKind } from './DirectoryReader.js';

/**
 * `dir`: lists the direct children of the process working directory — Adapter pattern Client.
 * Directories first, then every other entry; each group sorted by name in UTF-16 code unit order
 * (locale independent, so the output is stable). Hidden entries are included, `.` and `..` are not.
 * Never touches the SVG document, its dirty state, the working directory or undo/redo history.
 */
export class DirCommand implements Command {
  readonly name = 'dir';
  readonly syntax = 'dir';
  readonly requiresDocument = false;
  /** Markers padded to one width so names line up: `[DIR]  docs` / `[FILE] demo.svg`. */
  private readonly markers: Readonly<Record<EntryKind, string>> = {
    directory: '[DIR] ', file: '[FILE]', symlink: '[LINK]', other: '[SPEC]',
  };

  constructor(private readonly reader: DirectoryReader, private readonly workingDirectory: () => string) {}

  execute(args: CommandArguments): readonly string[] {
    args.count(0);
    let path = '.';
    let entries: readonly DirectoryEntry[];
    try {
      path = this.workingDirectory();
      entries = this.reader.list(path);
    } catch {
      throw new Error(`cannot read directory: ${path}`);
    }
    const visible = entries.filter(entry => entry.name !== '.' && entry.name !== '..');
    if (!visible.length) return ['(empty directory)'];
    const byName = (a: DirectoryEntry, b: DirectoryEntry) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0);
    return [
      ...visible.filter(entry => entry.kind === 'directory').sort(byName),
      ...visible.filter(entry => entry.kind !== 'directory').sort(byName),
    ].map(entry => `${this.markers[entry.kind]} ${this.display(entry.name)}`);
  }

  /** Names with control characters (e.g. a newline) are shown JSON-escaped to keep one entry per line. */
  private display(name: string): string { return /[\x00-\x1f\x7f]/.test(name) ? JSON.stringify(name) : name; }
}
