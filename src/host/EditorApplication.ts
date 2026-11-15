import type { Readable, Writable } from 'node:stream';
import {
  CommandDispatcher, EditorSession, ExtensionPoints, FileDocumentStore, Lexer, Repl, SvgCodec, TreeRenderer,
} from '@svgframe/kernel/host';
import type { DocumentStore } from '@svgframe/kernel/host';
import type { Diagnostics } from './Diagnostics.js';
import { PluginInstaller } from './PluginInstaller.js';
import { PluginLoader } from './PluginLoader.js';

/** Wires the kernel together; which plugins to install is decided by the composition root. */
export class EditorApplication {
  readonly extensions = new ExtensionPoints();
  readonly session: EditorSession;
  readonly installer: PluginInstaller;
  readonly loader: PluginLoader;
  private readonly dispatcher: CommandDispatcher;
  private readonly lexer = new Lexer();

  constructor(diagnostics: Diagnostics, store?: DocumentStore) {
    this.session = new EditorSession(store ?? new FileDocumentStore(new SvgCodec(this.extensions.shapes)));
    this.dispatcher = new CommandDispatcher(this.extensions.commands, {
      session: this.session, shapes: this.extensions.shapes, attributes: this.extensions.attributes,
      commands: this.extensions.commands, tree: new TreeRenderer(this.extensions.decorators),
    });
    this.installer = new PluginInstaller(this.extensions, this.session, diagnostics);
    this.loader = new PluginLoader(this.installer, diagnostics);
  }

  execute(line: string): readonly string[] { return this.dispatcher.execute(this.lexer.tokenize(line)); }

  run(input: Readable, output: Writable, errors: Writable, interactive: boolean): Promise<boolean> {
    return new Repl(this.dispatcher, this.lexer).run(input, output, errors, interactive);
  }
}
