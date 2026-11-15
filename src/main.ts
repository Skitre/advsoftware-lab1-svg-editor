// Composition root: the only file that names concrete plugins.
import builtinCommands from '@svgframe/plugin-builtin-commands';
import builtinCommandsPackage from '@svgframe/plugin-builtin-commands/package.json' with { type: 'json' };
import builtinShapes from '@svgframe/plugin-builtin-shapes';
import builtinShapesPackage from '@svgframe/plugin-builtin-shapes/package.json' with { type: 'json' };
import commandDir from '@svgframe/plugin-command-dir';
import commandDirPackage from '@svgframe/plugin-command-dir/package.json' with { type: 'json' };
import commandStats from '@svgframe/plugin-command-stats';
import commandStatsPackage from '@svgframe/plugin-command-stats/package.json' with { type: 'json' };
import { EditorApplication } from './host/EditorApplication.js';
import { LaunchOptions } from './host/LaunchOptions.js';
import type { PluginSource } from './host/PluginInstaller.js';
import { StreamDiagnostics } from './host/StreamDiagnostics.js';

const diagnostics = new StreamDiagnostics(process.stderr);
const app = new EditorApplication(diagnostics);

// Phase 1 capabilities are always assembled in code, so the editor starts without any optional plugin.
const builtins: readonly PluginSource[] = [
  { module: '@svgframe/plugin-builtin-shapes', plugin: builtinShapes, packageJson: builtinShapesPackage },
  { module: '@svgframe/plugin-builtin-commands', plugin: builtinCommands, packageJson: builtinCommandsPackage },
];

// Method A (no --config): optional plugins assembled in code, type-checked, installed in this order.
const codeAssembled: readonly PluginSource[] = [
  { module: '@svgframe/plugin-command-stats', plugin: commandStats, packageJson: commandStatsPackage },
  { module: '@svgframe/plugin-command-dir', plugin: commandDir, packageJson: commandDirPackage },
];

let options = LaunchOptions.parse([]);
try { options = LaunchOptions.parse(process.argv.slice(2)); }
catch (error) { diagnostics.error(error instanceof Error ? error.message : String(error)); process.exit(2); }

for (const source of builtins) await app.installer.install(source);
if (options.configPath === undefined) for (const source of codeAssembled) await app.installer.install(source);
else await app.loader.load(options.configPath); // Method B: plugins.config.json decides.

if (options.listPlugins) {
  for (const name of app.installer.installed()) process.stdout.write(`${name}\n`);
  process.exit(0);
}

const interactive = Boolean(process.stdin.isTTY && process.stdout.isTTY);
const success = await app.run(process.stdin, process.stdout, process.stderr, interactive);
if (!success && !interactive) process.exitCode = 1;
