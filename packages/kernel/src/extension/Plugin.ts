import type { SessionObserver } from '../session/SessionObserver.js';
import type { AttributeHandler } from './AttributeHandler.js';
import type { Command } from './Command.js';
import type { ShapeCatalog } from './ShapeCatalog.js';
import type { ShapeProvider } from './ShapeProvider.js';
import type { TreeDecorator } from './TreeDecorator.js';

/**
 * What a plugin sees while it activates. Registrations are staged: they take effect only if
 * activation succeeds, names are unique, and they match the plugin's `contributes` manifest.
 */
export interface PluginContext {
  /** The `options` object from the plugin configuration (empty when none is given). */
  readonly options: Readonly<Record<string, unknown>>;
  /** Shape types registered by any plugin, resolved when used (not at activation time). */
  readonly shapes: ShapeCatalog;
  registerShape(provider: ShapeProvider): void;
  registerCommand(command: Command): void;
  registerTreeDecorator(decorator: TreeDecorator): void;
  registerAttributeHandler(handler: AttributeHandler): void;
  observeSession(observer: SessionObserver): void;
}

/** A plugin module's default export: an instance of a class implementing this interface. */
export interface Plugin {
  activate(context: PluginContext): void | Promise<void>;
}
