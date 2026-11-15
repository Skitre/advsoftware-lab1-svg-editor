import * as vscode from 'vscode';
import { SvgDocumentSymbolProvider } from './vscode/SvgDocumentSymbolProvider';
import { SvgFileDecorationProvider } from './vscode/SvgFileDecorationProvider';

/** Entry point VSCode calls on activation: register both providers; VSCode owns when they are called. */
export function activate(context: vscode.ExtensionContext): void {
  context.subscriptions.push(
    vscode.window.registerFileDecorationProvider(new SvgFileDecorationProvider()),
    vscode.languages.registerDocumentSymbolProvider([{ pattern: '**/*.svg' }, { language: 'svg' }], new SvgDocumentSymbolProvider()),
  );
}

export function deactivate(): void {}
