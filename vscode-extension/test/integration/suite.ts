// Runs inside the VSCode extension host. Exercises the registered outline provider through VSCode's
// own command, and the decoration provider against real workspace files.
import assert from 'node:assert/strict';
import * as vscode from 'vscode';
import { SvgFileDecorationProvider } from '../../src/vscode/SvgFileDecorationProvider';

type Named = { name: string; children: Named[]; selectionRange: vscode.Range };
const tree = (symbols: Named[], depth = 0): string[] =>
  symbols.flatMap(symbol => [`${'  '.repeat(depth)}${symbol.name}`, ...tree(symbol.children, depth + 1)]);

async function symbolsOf(uri: vscode.Uri): Promise<Named[]> {
  return (await vscode.commands.executeCommand<Named[]>('vscode.executeDocumentSymbolProvider', uri)) ?? [];
}

export async function run(): Promise<void> {
  const folder = vscode.workspace.workspaceFolders![0]!.uri;
  const file = (name: string) => vscode.Uri.joinPath(folder, name);
  const extension = vscode.extensions.getExtension('advsoftware-lab.svg-badge-outline');
  if (!extension) throw new Error('extension is not installed in the development host');
  await extension.activate();
  const evidence: string[] = [];

  const document = await vscode.workspace.openTextDocument(file('example.svg'));
  await vscode.window.showTextDocument(document);
  const symbols = await symbolsOf(document.uri);
  assert.deepEqual(tree(symbols), ['svg', '  rect#start', '  text', '  g#flowchart', '    g#n1', '      rect#n1-rect',
    '      text#n1-label', '    line#arrow1', '    defs', '      path']);
  assert.equal(symbols[0]!.children[0]!.selectionRange.start.line, 2, 'rect#start selects line 3');
  evidence.push('outline example.svg:', ...tree(symbols).map(line => `  ${line}`));

  const edit = new vscode.WorkspaceEdit();
  edit.insert(document.uri, document.positionAt(document.getText().indexOf('  <g id="flowchart">')), '  <circle id="added" r="2"/>\n');
  assert.ok(await vscode.workspace.applyEdit(edit));
  assert.ok(tree(await symbolsOf(document.uri)).includes('  circle#added'), 'outline follows edits');
  evidence.push('after inserting <circle id="added">: circle#added listed');

  const breakIt = new vscode.WorkspaceEdit();
  breakIt.delete(document.uri, new vscode.Range(document.positionAt(document.getText().lastIndexOf('</svg>')), document.positionAt(document.getText().length)));
  assert.ok(await vscode.workspace.applyEdit(breakIt));
  assert.deepEqual(await symbolsOf(document.uri), [], 'incomplete XML clears the outline');
  evidence.push('after deleting </svg>: outline empty, extension still active');
  await vscode.commands.executeCommand('undo'); await vscode.commands.executeCommand('undo');
  assert.equal(tree(await symbolsOf(document.uri)).length, 10, 'restored after undo');

  const broken = await vscode.workspace.openTextDocument(file('broken.svg'));
  assert.deepEqual(await symbolsOf(broken.uri), []);
  evidence.push('broken.svg: outline empty');

  const decorations = new SvgFileDecorationProvider();
  for (const [name, expected] of [['example.svg', '[]'], ['broken.svg', '[]'], ['notes.txt', undefined], ['folder.svg', undefined]] as const) {
    const decoration = await decorations.provideFileDecoration(file(name));
    assert.equal(decoration?.badge, expected, name);
    evidence.push(`decoration ${name}: ${decoration?.badge ?? '(none)'}`);
  }
  assert.ok(extension.isActive, 'extension survived malformed input');
  console.log(`VSCode ${vscode.version} integration evidence:\n${evidence.join('\n')}`);
}
