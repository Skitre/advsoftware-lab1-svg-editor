// Launches a real VSCode with this extension under development and runs suite.ts inside it.
// Uses the installed VSCode when VSCODE_EXECUTABLE is set or the macOS default path exists,
// otherwise @vscode/test-electron downloads one.
import { existsSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { runTests } from '@vscode/test-electron';

const root = resolve(__dirname, '../../..');
const local = process.env.VSCODE_EXECUTABLE ?? '/Applications/Visual Studio Code.app/Contents/MacOS/Code';
runTests({
  ...(existsSync(local) ? { vscodeExecutablePath: local } : {}),
  extensionDevelopmentPath: root,
  extensionTestsPath: join(__dirname, 'suite.js'),
  launchArgs: [join(root, 'examples'), '--disable-extensions', '--skip-welcome', '--user-data-dir', mkdtempSync(join(tmpdir(), 'svg-vscode-'))],
}).catch(error => { console.error(error); process.exit(1); });
