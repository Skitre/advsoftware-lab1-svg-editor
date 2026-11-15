import type { Plugin, PluginContext } from '@svgframe/kernel';
import { DirCommand } from './DirCommand.js';
import type { DirectoryReader } from './DirectoryReader.js';
import { NodeDirectoryReader } from './NodeDirectoryReader.js';

/** Contributes `dir`; the directory access and the working directory are injectable for tests. */
export class DirPlugin implements Plugin {
  constructor(private readonly reader: DirectoryReader = new NodeDirectoryReader(),
    private readonly workingDirectory: () => string = () => process.cwd()) {}

  activate(context: PluginContext): void { context.registerCommand(new DirCommand(this.reader, this.workingDirectory)); }
}
