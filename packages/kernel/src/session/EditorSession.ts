import { SvgDocument } from '../domain/SvgDocument.js';
import type { DocumentStore } from './DocumentStore.js';
import { History } from './History.js';
import type { EditCommand } from './EditCommand.js';
import type { SessionObserver } from './SessionObserver.js';

export class EditorSession {
  private current?: SvgDocument;
  private path?: string;
  private readonly history = new History();
  private readonly observers: SessionObserver[] = [];

  constructor(private readonly store: DocumentStore) {}

  /** Registers an observer; returns a function that removes it again. */
  observe(observer: SessionObserver): () => void {
    this.observers.push(observer);
    return () => { const index = this.observers.indexOf(observer); if (index >= 0) this.observers.splice(index, 1); };
  }

  snapshot(): SvgDocument { return this.requireDocument().clone(); }

  init(width = 800, height = 600): string {
    const document = new SvgDocument(width, height);
    this.current = document; this.path = undefined; this.history.barrier();
    this.notify('baseline');
    return `canvas ${width}x${height} created`;
  }

  read(path: string): string[] {
    const result = this.store.read(path);
    this.current = result.document; this.path = path; this.history.barrier();
    this.notify('baseline');
    return [...result.warnings, `read ${path} (${result.document.count} elements)`];
  }

  save(path = this.path): string {
    const document = this.requireDocument();
    if (!path) throw new Error('no file path. use save <file.svg>');
    this.store.write(path, document);
    this.path = path; this.history.barrier();
    this.notify('baseline');
    return `saved to ${path} (${document.count} elements)`;
  }

  canvas(width?: number, height?: number): string {
    const document = this.requireDocument();
    if (width === undefined && height === undefined) return `canvas ${document.width}x${document.height}`;
    if (width === undefined || height === undefined) throw new Error('usage: canvas [w h]');
    const draft = document.clone(); draft.resize(width, height);
    this.current = draft; this.history.barrier();
    this.notify('changed');
    return `canvas resized to ${width}x${height}`;
  }

  edit(command: EditCommand): string {
    const result = this.history.execute(command, this.requireDocument());
    this.current = result.document;
    this.notify('changed');
    return result.message;
  }

  undo(): string {
    this.requireDocument();
    const result = this.history.undo(); this.current = result.document;
    this.notify('changed');
    return result.message;
  }

  redo(): string {
    this.requireDocument();
    const result = this.history.redo(); this.current = result.document;
    this.notify('changed');
    return result.message;
  }

  private notify(event: 'baseline' | 'changed'): void {
    const failures: string[] = [];
    for (const observer of [...this.observers]) {
      try { observer[event]?.(this.requireDocument().clone()); }
      catch (error) { failures.push(error instanceof Error ? error.message : String(error)); }
    }
    if (failures.length) throw new Error(`session observer failed after the command completed (${failures.join('; ')})`);
  }

  private requireDocument(): SvgDocument {
    if (!this.current) throw new Error("no document. use 'init' or 'read' first");
    return this.current;
  }
}
