import type { EditorSession } from '../session/EditorSession.js';
import type { AttributeService } from './AttributeHandler.js';
import type { CommandArguments } from './CommandArguments.js';
import type { ShapeCatalog } from './ShapeCatalog.js';
import type { TreeView } from './TreeDecorator.js';

/** Read-only view of the registered commands for `help`. */
export interface CommandCatalog {
  syntaxes(): readonly string[];
}

/** Kernel services available to a command while it executes. */
export interface CommandContext {
  readonly session: EditorSession;
  readonly shapes: ShapeCatalog;
  readonly attributes: AttributeService;
  readonly commands: CommandCatalog;
  readonly tree: TreeView;
}

/**
 * Extension point: one CLI command. Kernel caller: CommandDispatcher.execute.
 * A command that changes the document must go through `session.edit` so it is undoable;
 * a failing command throws and must leave the session unchanged.
 */
export interface Command {
  /** Registration name and the first word of the input line. */
  readonly name: string;
  /** Help line, also used in `usage:` errors. */
  readonly syntax: string;
  /** When true the dispatcher rejects the command before `init`/`read`. */
  readonly requiresDocument: boolean;
  /** Returns the output lines. */
  execute(args: CommandArguments, context: CommandContext): readonly string[];
}
