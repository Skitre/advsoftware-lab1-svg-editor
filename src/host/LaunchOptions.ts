/** Command-line options of the editor: `[--config <plugins.config.json>] [--list-plugins]`. */
export class LaunchOptions {
  private constructor(readonly configPath?: string, readonly listPlugins = false) {}

  static parse(argv: readonly string[]): LaunchOptions {
    let configPath: string | undefined;
    let listPlugins = false;
    for (let index = 0; index < argv.length; index++) {
      const argument = argv[index]!;
      if (argument === '--list-plugins' && !listPlugins) listPlugins = true;
      else if (argument === '--config' && configPath === undefined && argv[index + 1]) configPath = argv[++index];
      else if (argument.startsWith('--config=') && configPath === undefined && argument.length > 9) configPath = argument.slice(9);
      else throw new Error('usage: svg-editor [--config <plugins.config.json>] [--list-plugins]');
    }
    return new LaunchOptions(configPath, listPlugins);
  }
}
