import { readFileSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { Diagnostics } from './Diagnostics.js';
import { PluginConfig } from './PluginConfig.js';
import type { PluginEntry } from './PluginConfig.js';
import type { PluginInstaller } from './PluginInstaller.js';

/**
 * Method B: installs the plugins listed in a config file, in order, from string module names.
 * It knows no concrete plugin. Relative module paths resolve against the config file's directory;
 * package names use Node's resolution from that directory. Every failure is reported and loading
 * continues with the next entry.
 */
export class PluginLoader {
  constructor(private readonly installer: PluginInstaller, private readonly diagnostics: Diagnostics) {}

  async load(configPath: string): Promise<void> {
    let config: PluginConfig;
    try { config = PluginConfig.read(configPath); }
    catch { this.diagnostics.error('invalid plugin config'); return; }
    for (const entry of config.entries) {
      if (entry.enabled) await this.loadEntry(entry, dirname(config.path));
    }
  }

  private async loadEntry(entry: PluginEntry, base: string): Promise<void> {
    const require = createRequire(join(base, 'plugins.config.json'));
    const isPath = entry.module.startsWith('.') || isAbsolute(entry.module);
    const specifier = isPath ? resolve(base, entry.module) : entry.module;
    let file: string;
    try { file = require.resolve(specifier); }
    catch (error) {
      if ((error as { code?: unknown }).code === 'MODULE_NOT_FOUND') this.diagnostics.error(`plugin not found: ${entry.module}`);
      else this.diagnostics.error(`plugin failed to load: ${entry.module} (${this.reason(error)})`);
      return;
    }
    let namespace: Record<string, unknown>;
    try { namespace = await import(pathToFileURL(file).href) as Record<string, unknown>; }
    catch (error) { this.diagnostics.error(`plugin failed to load: ${entry.module} (${this.reason(error)})`); return; }
    if (namespace.default === undefined) { this.diagnostics.error(`plugin has no default export: ${entry.module}`); return; }
    await this.installer.install({
      module: entry.module, plugin: namespace.default, options: entry.options,
      packageJson: this.packageJson(isPath ? join(specifier, 'package.json') : this.packagePath(require, entry.module)),
    });
  }

  /** A plugin package's manifest: `<dir>/package.json` for paths, `<name>/package.json` for packages. */
  private packagePath(require: NodeJS.Require, name: string): string | undefined {
    try { return require.resolve(`${name}/package.json`); } catch { return undefined; }
  }

  private packageJson(path: string | undefined): unknown {
    if (path === undefined) return undefined;
    try { return statSync(path).isFile() ? JSON.parse(readFileSync(path, 'utf8')) : undefined; }
    catch { return undefined; }
  }

  private reason(error: unknown): string {
    return (error instanceof Error ? error.message : String(error)).split('\n')[0]!;
  }
}
