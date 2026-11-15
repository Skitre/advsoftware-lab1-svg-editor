import type { EditorSession, ExtensionPoints } from '@svgframe/kernel/host';
import type { Diagnostics } from './Diagnostics.js';
import { PluginManifest } from './PluginManifest.js';
import { StagingContext } from './StagingContext.js';

/** A plugin ready to install, whether imported in code (method A) or loaded from config (method B). */
export type PluginSource = {
  /** Module specifier, used as the plugin name when the package has no name. */
  readonly module: string;
  /** The module's default export. */
  readonly plugin: unknown;
  /** The plugin package's package.json content, if any. */
  readonly packageJson?: unknown;
  readonly options?: Readonly<Record<string, unknown>>;
};

/**
 * The single registration and validation path shared by code assembly and config assembly:
 * manifest → activate (staged) → duplicate check → manifest comparison → commit.
 * Any failure is reported and rolls back every staged registration of that plugin.
 */
export class PluginInstaller {
  private readonly names: string[] = [];

  constructor(private readonly extensions: ExtensionPoints, private readonly session: EditorSession,
    private readonly diagnostics: Diagnostics) {}

  async install(source: PluginSource): Promise<boolean> {
    const name = PluginManifest.nameOf(source.packageJson, source.module);
    let manifest: PluginManifest;
    try { manifest = PluginManifest.from(source.packageJson, source.module); }
    catch (error) { return this.reject(`plugin manifest mismatch: ${name} (declared: invalid contributes [${this.reason(error)}], registered: none)`); }

    const plugin = source.plugin as { activate?: unknown } | null | undefined;
    if (typeof plugin !== 'object' || plugin === null || typeof plugin.activate !== 'function') {
      return this.reject(`plugin failed to activate: ${name} (default export does not implement activate(context))`);
    }
    const context = new StagingContext(this.extensions, Object.freeze({ ...(source.options ?? {}) }), this.extensions.shapes);
    try {
      await (plugin.activate as (context: StagingContext) => unknown).call(plugin, context);
    } catch (error) {
      context.close();
      return this.reject(`plugin failed to activate: ${name} (${this.reason(error)})`);
    }
    const duplicates = context.duplicates();
    if (duplicates.length) {
      context.close();
      for (const duplicate of duplicates) this.diagnostics.error(`duplicate registration: ${duplicate}`);
      return false;
    }
    const registered = context.registered();
    if (!manifest.contributes.equals(registered)) {
      context.close();
      return this.reject(`plugin manifest mismatch: ${name} (declared: ${manifest.contributes.format()}, registered: ${registered.format()})`);
    }
    context.commit(this.session);
    const options = source.options ?? {};
    this.names.push(Object.keys(options).length ? `${name} ${JSON.stringify(options)}` : name);
    return true;
  }

  /** Successfully installed plugins in installation order, each with its options when given. */
  installed(): readonly string[] { return [...this.names]; }

  private reject(message: string): false {
    this.diagnostics.error(message);
    return false;
  }

  private reason(error: unknown): string { return error instanceof Error ? error.message : String(error); }
}
