import { Contributions } from './Contributions.js';

/** The parts of a plugin's package.json the host relies on: its name and `contributes`. */
export class PluginManifest {
  private constructor(readonly name: string, readonly contributes: Contributions) {}

  /** Throws when `contributes` is malformed; a missing package.json yields an empty manifest. */
  static from(packageJson: unknown, fallbackName: string): PluginManifest {
    const fields = typeof packageJson === 'object' && packageJson !== null ? packageJson as Record<string, unknown> : {};
    const name = typeof fields.name === 'string' && fields.name ? fields.name : fallbackName;
    return new PluginManifest(name, Contributions.parse(fields.contributes));
  }

  static nameOf(packageJson: unknown, fallbackName: string): string {
    const name = typeof packageJson === 'object' && packageJson !== null ? (packageJson as Record<string, unknown>).name : undefined;
    return typeof name === 'string' && name ? name : fallbackName;
  }
}
