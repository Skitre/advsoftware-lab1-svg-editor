import { SvgDocument } from '../domain/SvgDocument.js';
import type { DocumentStore } from './DocumentStore.js';
import { History } from './History.js';
import type { EditCommand } from './commands/EditCommand.js';

export class EditorSession {
  private current?: SvgDocument;
  private path?: string;
  private readonly history = new History();

  constructor(private readonly store: DocumentStore) {}

  snapshot(): SvgDocument { return this.requireDocument().clone(); }

  init(width = 800, height = 600): string {
    const document = new SvgDocument(width, height);
    this.current = document; this.path = undefined; this.history.barrier();
    return `canvas ${width}x${height} created`;
  }

  read(path: string): string[] {
    const result = this.store.read(path);
    this.current = result.document; this.path = path; this.history.barrier();
    return [...result.warnings, `read ${path} (${result.document.count} elements)`];
  }

  save(path = this.path): string {
    const document = this.requireDocument();
    if (!path) throw new Error('no file path. use save <file.svg>');
    this.store.write(path, document);
    this.path = path; this.history.barrier();
    return `saved to ${path} (${document.count} elements)`;
  }

  canvas(width?: number, height?: number): string {
    const document = this.requireDocument();
    if (width === undefined && height === undefined) return `canvas ${document.width}x${document.height}`;
    if (width === undefined || height === undefined) throw new Error('usage: canvas [w h]');
    const draft = document.clone(); draft.resize(width, height);
    this.current = draft; this.history.barrier();
    return `canvas resized to ${width}x${height}`;
  }

  edit(command: EditCommand): string {
    const result = this.history.execute(command, this.requireDocument());
    this.current = result.document;
    return result.message;
  }

  undo(): string {
    this.requireDocument();
    const result = this.history.undo(); this.current = result.document;
    return result.message;
  }

  redo(): string {
    this.requireDocument();
    const result = this.history.redo(); this.current = result.document;
    return result.message;
  }

  private requireDocument(): SvgDocument {
    if (!this.current) throw new Error("no document. use 'init' or 'read' first");
    return this.current;
  }
}
