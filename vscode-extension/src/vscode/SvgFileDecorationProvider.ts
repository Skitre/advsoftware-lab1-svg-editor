import * as vscode from 'vscode';
import { SvgFileFilter } from '../core/SvgFileFilter';

/**
 * VSCode calls provideFileDecoration for every Explorer entry it renders; this provider answers
 * with a `[]` badge for SVG files and nothing for other files and folders (including a folder
 * named `x.svg`). It decorates the view only; file names and contents are never touched.
 */
export class SvgFileDecorationProvider implements vscode.FileDecorationProvider {
  static readonly badge = '[]';

  constructor(private readonly filter = new SvgFileFilter()) {}

  async provideFileDecoration(uri: vscode.Uri): Promise<vscode.FileDecoration | undefined> {
    if (!this.filter.isSvgName(uri.path)) return undefined;
    let isFile = false;
    try { isFile = ((await vscode.workspace.fs.stat(uri)).type & vscode.FileType.File) !== 0; } catch { return undefined; }
    if (!this.filter.isSvgFile(uri.path, isFile)) return undefined;
    return new vscode.FileDecoration(SvgFileDecorationProvider.badge, 'SVG file');
  }
}
