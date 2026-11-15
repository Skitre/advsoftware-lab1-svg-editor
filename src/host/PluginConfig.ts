import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

export type PluginEntry = {
  readonly module: string;
  readonly enabled: boolean;
  readonly options: Readonly<Record<string, unknown>>;
};

/**
 * `plugins.config.json`: `{ "plugins": [{ "module": "...", "enabled"?: boolean, "options"?: {...} }] }`.
 * Any syntax or structure error makes the whole file invalid.
 */
export class PluginConfig {
  private constructor(readonly path: string, readonly entries: readonly PluginEntry[]) {}

  static read(path: string): PluginConfig {
    const absolute = resolve(path);
    return PluginConfig.parse(readFileSync(absolute, 'utf8'), absolute);
  }

  static parse(source: string, path: string): PluginConfig {
    const json: unknown = JSON.parse(source);
    if (!PluginConfig.isRecord(json) || Object.keys(json).some(key => key !== 'plugins') || !Array.isArray(json.plugins)) {
      throw new Error('config must be an object with a plugins array');
    }
    return new PluginConfig(path, json.plugins.map((entry: unknown, index: number) => {
      if (!PluginConfig.isRecord(entry) || Object.keys(entry).some(key => !['module', 'enabled', 'options'].includes(key))) {
        throw new Error(`plugins[${index}] must be an object with module, enabled and options`);
      }
      if (typeof entry.module !== 'string' || !entry.module) throw new Error(`plugins[${index}].module must be a string`);
      if (entry.enabled !== undefined && typeof entry.enabled !== 'boolean') throw new Error(`plugins[${index}].enabled must be a boolean`);
      if (entry.options !== undefined && !PluginConfig.isRecord(entry.options)) throw new Error(`plugins[${index}].options must be an object`);
      return { module: entry.module, enabled: entry.enabled ?? true, options: entry.options ?? {} };
    }));
  }

  private static isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }
}
