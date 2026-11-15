import type { SvgDocument } from '../domain/SvgDocument.js';

/**
 * Observer of the editing session. Each callback receives a private copy of the document.
 * Observers must not throw; a failure is reported after the session state has been updated.
 */
export interface SessionObserver {
  /** The document now matches a saved or freshly created state (successful init, read or save). */
  baseline?(document: SvgDocument): void;
  /** The current document changed (edit, undo, redo, or canvas resize). */
  changed?(document: SvgDocument): void;
}
