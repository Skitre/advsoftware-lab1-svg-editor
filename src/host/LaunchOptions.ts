/** Command-line options of the editor: `[--config <plugins.config.json>]`. */
export class LaunchOptions {
  private constructor(readonly configPath?: string) {}

  static parse(argv: readonly string[]): LaunchOptions {
    if (!argv.length) return new LaunchOptions();
    if (argv.length === 2 && argv[0] === '--config' && argv[1]) return new LaunchOptions(argv[1]);
    if (argv.length === 1 && argv[0]!.startsWith('--config=') && argv[0]!.length > 9) return new LaunchOptions(argv[0]!.slice(9));
    throw new Error('usage: svg-editor [--config <plugins.config.json>]');
  }
}
