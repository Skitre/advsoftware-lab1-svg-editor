# SVG Badge & Outline (VSCode extension, Phase 2 Part 1)

- **Explorer badge**: every regular file named `*.svg` (any case) shows the badge `[]` with tooltip `SVG file`. Folders whose name ends in `.svg` and other files get nothing.
- **Outline**: an SVG file's element tree appears in VSCode's native Outline view (and breadcrumbs / `Ctrl+Shift+O`). Entries are named `tag#id`, or just `tag` when there is no id. Clicking an entry moves the cursor to that element's tag name. The outline follows edits. When the XML is incomplete or malformed, it is left empty instead of throwing.

## Layout

| Path | Role |
| --- | --- |
| `src/core/SvgOutlineParser.ts` | Offset-preserving XML scanner → `SvgElementNode` tree, or `undefined` for malformed input. No `vscode` import. |
| `src/core/SvgFileFilter.ts` | "Is this a regular `*.svg` file" rule. No `vscode` import. |
| `src/vscode/SvgFileDecorationProvider.ts` | Adapter to `FileDecorationProvider`: `fs.stat`, then the filter, then `[]`. |
| `src/vscode/SvgDocumentSymbolProvider.ts` | Adapter to `DocumentSymbolProvider`: node offsets become `DocumentSymbol` ranges. |
| `src/extension.ts` | `activate` registers both providers. VSCode decides when to call them. |
| `test/unit/` | `node:test` tests of the core, without VSCode. |
| `test/integration/` | `@vscode/test-electron` runs a real VSCode against `examples/`. |
| `examples/` | `example.svg` (nested groups, elements without id), `broken.svg` (incomplete), `notes.txt`, `folder.svg/` (a directory). |

## Install and run

```bash
cd vscode-extension
npm install
npm test               # compile + unit tests
npm run test:vscode    # compile + integration test in VSCode (uses the installed app on macOS, otherwise downloads one)
```

To try it interactively, open the `vscode-extension/` folder in VSCode and press **F5** ("Run SVG Badge & Outline"). An Extension Development Host window opens on `examples/`:

1. In the Explorer, `example.svg` and `broken.svg` show `[]`, while `notes.txt` and `folder.svg/` do not.
2. Open `example.svg`, then open the Outline view (Explorer sidebar → OUTLINE). Click `rect#n1-rect` and the cursor jumps to line 7.
3. Type a new element such as `<circle id="c"/>` and the outline updates. Delete `</svg>` and the outline empties; undo restores it.

To set a different VSCode binary for the integration test: `VSCODE_EXECUTABLE=/path/to/Code npm run test:vscode`.
