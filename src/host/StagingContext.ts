import type {
  AttributeHandler, Command, ExtensionCategory, ExtensionPoints, PluginContext, SessionObserver,
  ShapeCatalog, ShapeProvider, TreeDecorator, EditorSession, Registry,
} from '@svgframe/kernel/host';
import { Contributions } from './Contributions.js';

type Staged = { readonly category: ExtensionCategory; readonly item: unknown };

/**
 * PluginContext handed to `activate`. Registrations are validated immediately but only staged;
 * `commit` applies all of them, so a rejected plugin leaves no registration behind.
 */
export class StagingContext implements PluginContext {
  private readonly staged: Staged[] = [];
  private readonly observers: SessionObserver[] = [];
  private closed = false;

  constructor(private readonly extensions: ExtensionPoints, readonly options: Readonly<Record<string, unknown>>,
    readonly shapes: ShapeCatalog) {}

  registerShape(provider: ShapeProvider): void { this.stage('shapes', provider); }
  registerCommand(command: Command): void { this.stage('commands', command); }
  registerTreeDecorator(decorator: TreeDecorator): void { this.stage('decorators', decorator); }
  registerAttributeHandler(handler: AttributeHandler): void { this.stage('attributes', handler); }

  observeSession(observer: SessionObserver): void {
    this.assertOpen();
    if (typeof observer !== 'object' || observer === null) throw new Error('session observer must be an object');
    this.observers.push(observer);
  }

  /** `<category>/<key>` for every staged registration already taken by the kernel or by this plugin. */
  duplicates(): readonly string[] {
    const seen = new Set<string>();
    const duplicates: string[] = [];
    for (const { category, item } of this.staged) {
      const registry = this.extensions.registry(category);
      for (const key of registry.keysOf(item)) {
        const qualified = `${category}/${key}`;
        if (registry.occupied(key) || seen.has(qualified)) duplicates.push(qualified);
        seen.add(qualified);
      }
    }
    return duplicates;
  }

  registered(): Contributions {
    return Contributions.of(this.staged.map(({ category, item }) => [category, this.extensions.registry(category).nameOf(item)] as const));
  }

  commit(session: EditorSession): void {
    this.close();
    for (const { category, item } of this.staged) this.extensions.registry(category).register(item);
    for (const observer of this.observers) session.observe(observer);
  }

  /** Called on success and on rejection: later register calls from a retained context fail. */
  close(): void { this.closed = true; }

  private stage(category: ExtensionCategory, item: unknown): void {
    this.assertOpen();
    const registry: Registry<unknown> = this.extensions.registry(category);
    registry.validate(item);
    this.staged.push({ category, item });
  }

  private assertOpen(): void {
    if (this.closed) throw new Error('plugin context is closed; register extensions during activate()');
  }
}
