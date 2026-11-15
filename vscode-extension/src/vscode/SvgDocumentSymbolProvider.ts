import * as vscode from 'vscode';
import type { SvgElementNode } from '../core/SvgElementNode';
import { SvgOutlineParser } from '../core/SvgOutlineParser';

/**
 * Adapter between the parser's element tree and VSCode's Outline: each element becomes a
 * DocumentSymbol named `tag#id` (or `tag`), spanning the element, selecting its tag name.
 * VSCode asks again after edits, so the outline follows the text; malformed text yields no symbols.
 */
export class SvgDocumentSymbolProvider implements vscode.DocumentSymbolProvider {
  constructor(private readonly parser = new SvgOutlineParser()) {}

  provideDocumentSymbols(document: vscode.TextDocument): vscode.DocumentSymbol[] {
    const roots = this.parser.parse(document.getText()) ?? [];
    return roots.map(node => this.symbol(document, node, true));
  }

  private symbol(document: vscode.TextDocument, node: SvgElementNode, root: boolean): vscode.DocumentSymbol {
    const kind = root ? vscode.SymbolKind.File : node.children.length ? vscode.SymbolKind.Namespace : vscode.SymbolKind.Object;
    const range = new vscode.Range(document.positionAt(node.start), document.positionAt(node.end));
    const selection = new vscode.Range(document.positionAt(node.nameStart), document.positionAt(node.nameEnd));
    const symbol = new vscode.DocumentSymbol(node.id === undefined ? node.tag : `${node.tag}#${node.id}`, '', kind, range, selection);
    symbol.children = node.children.map(child => this.symbol(document, child, false));
    return symbol;
  }
}
