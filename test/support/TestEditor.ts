import { SvgCodec } from '@svgframe/kernel/host';
import type { DocumentStore, EditorSession, ShapeRegistry } from '@svgframe/kernel/host';
import builtinCommands from '@svgframe/plugin-builtin-commands';
import builtinCommandsPackage from '@svgframe/plugin-builtin-commands/package.json' with { type: 'json' };
import builtinShapes from '@svgframe/plugin-builtin-shapes';
import builtinShapesPackage from '@svgframe/plugin-builtin-shapes/package.json' with { type: 'json' };
import { EditorApplication } from '../../src/host/EditorApplication.js';
import type { PluginSource } from '../../src/host/PluginInstaller.js';
import { CollectingDiagnostics } from './CollectingDiagnostics.js';
import { MemoryDocumentStore } from './MemoryDocumentStore.js';

/** The default assembly (built-in plugins only) over an in-memory store, for in-process tests. */
export class TestEditor {
  readonly diagnostics = new CollectingDiagnostics();
  readonly app: EditorApplication;

  private constructor(store: DocumentStore) { this.app = new EditorApplication(this.diagnostics, store); }

  static async create(extra: readonly PluginSource[] = [], store: DocumentStore = new MemoryDocumentStore()): Promise<TestEditor> {
    const editor = new TestEditor(store);
    for (const source of [
      { module: '@svgframe/plugin-builtin-shapes', plugin: builtinShapes, packageJson: builtinShapesPackage },
      { module: '@svgframe/plugin-builtin-commands', plugin: builtinCommands, packageJson: builtinCommandsPackage },
      ...extra,
    ]) await editor.app.installer.install(source);
    return editor;
  }

  get session(): EditorSession { return this.app.session; }
  get shapes(): ShapeRegistry { return this.app.extensions.shapes; }
  codec(): SvgCodec { return new SvgCodec(this.shapes); }
  run(line: string): readonly string[] { return this.app.execute(line); }
}
