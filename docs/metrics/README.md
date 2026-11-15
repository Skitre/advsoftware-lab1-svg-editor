# 代码指标（脚本生成，请勿手改）

由 `scripts/metrics.ts` 从 git 历史生成：基线 `final`（d826d99）对比 `HEAD`（afeef1f）。
只统计 TypeScript 源码；依赖包与构建产物不计。代码行 = 含至少一个 token 的行（空行、纯注释行不计）。
圈复杂度按 McCabe：每个函数/方法/箭头函数计 1，每个 if、?:、循环、case、catch、&&、||、?? 再加 1；嵌套函数单独计。
分区：内核 = `packages/kernel/src`；装配处 = `src`（组合根、安装器、加载器）；插件 = `plugins/*`。基线 `final` 尚无插件化目录，其 `src/main.ts` 记为装配处、其余 `src` 记为内核。

## CLI 行数与圈复杂度（内核 / 装配处 / 插件）

| 分区 | 文件数 | 物理行 | 代码行 | 复杂度 final | 复杂度 HEAD | 增量 |
|---|---|---|---|---|---|---|
| 内核 | 32 → 33 | 1048 → 1281 | 1021 → 1128 | 372 | 396 | +24 |
| 装配处 | 1 → 11 | 9 → 384 | 8 → 322 | 4 | 136 | +132 |
| 插件 | 0 → 21 | 0 → 323 | 0 → 318 | 0 | 105 | +105 |
| **CLI 合计** | | | 1029 → 1768 | 376 | 637 | +261 |

## 单独列出（不计入 CLI 重构增量）

| 分区 | 文件数 | 代码行 |
|---|---|---|
| 测试 | 6 → 12 | 350 → 869 |
| VSCode 扩展 | 0 → 0 | 0 → 0 |

## 文件清单与职责：内核

| 文件 | 代码行 | 复杂度 | 较基线 | 最复杂函数 | 职责（取自源码首个文档注释） |
|---|---|---|---|---|---|
| `packages/kernel/src/cli/CommandDispatcher.ts` | 18 | 7 | new | CommandDispatcher.execute (5) | Dispatches a tokenized line through the command registry; knows no concrete command. |
| `packages/kernel/src/cli/Lexer.ts` | 32 | 16 | new | Lexer.tokenize (16) |  |
| `packages/kernel/src/cli/Repl.ts` | 25 | 8 | new | Repl.run (7) |  |
| `packages/kernel/src/cli/TreeRenderer.ts` | 52 | 22 | new | TreeRenderer.decorate (8) | Renders `tree` and `show`. |
| `packages/kernel/src/domain/GeometryShape.ts` | 35 | 13 | new | GeometryShape.move (3) |  |
| `packages/kernel/src/domain/Group.ts` | 46 | 21 | new | Group.insert (4) |  |
| `packages/kernel/src/domain/Numbers.ts` | 26 | 9 | new | Numbers.finite (3) |  |
| `packages/kernel/src/domain/Shape.ts` | 73 | 33 | new | Shape.set (4) | Rich domain base: owns identity/style and defines polymorphic shape operations. |
| `packages/kernel/src/domain/SvgDocument.ts` | 170 | 66 | new | SvgDocument.group (9) | Aggregate root: identity uniqueness, ownership, ordering, and cycle checks. |
| `packages/kernel/src/extension/AttributeHandler.ts` | 11 | 0 | new | - | Extension point: the domain meaning of setting one attribute on one kind of shape. |
| `packages/kernel/src/extension/Command.ts` | 21 | 0 | new | - | Read-only view of the registered commands for `help`. |
| `packages/kernel/src/extension/CommandArguments.ts` | 31 | 16 | new | CommandArguments.creation (5) |  |
| `packages/kernel/src/extension/ExtensionCategory.ts` | 2 | 0 | new | - | The four extension points, named as in a plugin manifest's `contributes`. |
| `packages/kernel/src/extension/Plugin.ts` | 18 | 0 | new | - | What a plugin sees while it activates. |
| `packages/kernel/src/extension/ShapeCatalog.ts` | 6 | 0 | new | - | Read-only view of the registered shape types, resolved at call time. |
| `packages/kernel/src/extension/ShapeProvider.ts` | 19 | 0 | new | - | One SVG element as read from a file, handed to the provider that restores it. |
| `packages/kernel/src/extension/Token.ts` | 4 | 0 | new | - |  |
| `packages/kernel/src/extension/TreeDecorator.ts` | 14 | 0 | new | - | One line of the structure tree: the root `svg (WxH)` line has no shape. |
| `packages/kernel/src/host.ts` | 16 | 0 | new | - | Assembly API for the host side (composition root, plugin installer, loader). |
| `packages/kernel/src/index.ts` | 18 | 0 | new | - | Public kernel API for plugins: domain abstractions and extension point interfaces only. |
| `packages/kernel/src/io/FileDocumentStore.ts` | 29 | 5 | new | FileDocumentStore.read (2) |  |
| `packages/kernel/src/io/SvgCodec.ts` | 113 | 53 | new | SvgCodec.decode (17) |  |
| `packages/kernel/src/registry/AttributeRegistry.ts` | 45 | 23 | new | AttributeRegistry.set (5) | AttributeHandler registry and the `set` flow of phase_cli_2 §3.2. |
| `packages/kernel/src/registry/CommandRegistry.ts` | 22 | 9 | new | CommandRegistry.validate (3) | Command registry: the only command-name dispatch point of the kernel. |
| `packages/kernel/src/registry/DecoratorRegistry.ts` | 10 | 3 | new | DecoratorRegistry.constructor (1) |  |
| `packages/kernel/src/registry/ExtensionPoints.ts` | 18 | 1 | new | ExtensionPoints.registry (1) | The four kernel registries, one per extension point. |
| `packages/kernel/src/registry/Registry.ts` | 38 | 21 | new | Registry.validate (5) | Ordered, name-unique registry for one extension point. |
| `packages/kernel/src/registry/ShapeRegistry.ts` | 59 | 32 | new | ShapeRegistry.validate (8) | ShapeProvider registry: the only shape-type dispatch point of the kernel. |
| `packages/kernel/src/session/DocumentStore.ts` | 5 | 0 | new | - | Outbound port; the application does not depend on filesystem or XML packages. |
| `packages/kernel/src/session/EditCommand.ts` | 26 | 6 | new | EditCommand.undo (2) | Command + Memento: a command owns immutable-in-practice before/after copies. |
| `packages/kernel/src/session/EditorSession.ts` | 85 | 24 | new | EditorSession.canvas (5) |  |
| `packages/kernel/src/session/History.ts` | 36 | 8 | new | History.undo (2) |  |
| `packages/kernel/src/session/SessionObserver.ts` | 5 | 0 | new | - | Observer of the editing session. |

## 文件清单与职责：装配处

| 文件 | 代码行 | 复杂度 | 较基线 | 最复杂函数 | 职责（取自源码首个文档注释） |
|---|---|---|---|---|---|
| `src/host/Contributions.ts` | 34 | 22 | new | Contributions.parse (10) | Registration names per extension category, as declared in `contributes` or actually registered. |
| `src/host/Diagnostics.ts` | 3 | 0 | new | - | Where the host reports startup problems; each message is printed as `error: <message>`. |
| `src/host/EditorApplication.ts` | 29 | 4 | new | EditorApplication.constructor (2) | Wires the kernel together; which plugins to install is decided by the composition root. |
| `src/host/LaunchOptions.ts` | 9 | 9 | new | LaunchOptions.parse (8) | Command-line options of the editor: `[--config <plugins.config.json>]`. |
| `src/host/PluginConfig.ts` | 34 | 22 | new | PluginConfig.parse.(anonymous) (11) |  |
| `src/host/PluginInstaller.ts` | 53 | 14 | new | PluginInstaller.install (10) | A plugin ready to install, whether imported in code (method A) or loaded from config (method B). |
| `src/host/PluginLoader.ts` | 55 | 21 | new | PluginLoader.loadEntry (8) | Method B: installs the plugins listed in a config file, in order, from string module names. |
| `src/host/PluginManifest.ts` | 13 | 11 | new | PluginManifest.from (5) | The parts of a plugin's package.json the host relies on: its name and `contributes`. |
| `src/host/StagingContext.ts` | 60 | 22 | new | StagingContext.duplicates (5) |  |
| `src/host/StreamDiagnostics.ts` | 7 | 2 | new | StreamDiagnostics.constructor (1) |  |
| `src/main.ts` | 25 | 9 | +5 | (module) (9) | Composition root: the only file that names concrete plugins. |

## 文件清单与职责：插件

| 文件 | 代码行 | 复杂度 | 较基线 | 最复杂函数 | 职责（取自源码首个文档注释） |
|---|---|---|---|---|---|
| `plugins/builtin-commands/index.ts` | 2 | 0 | new | - |  |
| `plugins/builtin-commands/src/BuiltinCommandsPlugin.ts` | 65 | 29 | new | BuiltinCommandsPlugin.activate.(anonymous) (3) | The Phase 1 command table, registered through the Command extension point in Phase 1 order. |
| `plugins/builtin-commands/src/DelegateCommand.ts` | 6 | 2 | new | DelegateCommand.constructor (1) |  |
| `plugins/builtin-commands/src/edits/AddToEdit.ts` | 10 | 2 | new | AddToEdit.constructor (1) |  |
| `plugins/builtin-commands/src/edits/CreateEdit.ts` | 11 | 4 | new | CreateEdit.apply (3) |  |
| `plugins/builtin-commands/src/edits/DeleteEdit.ts` | 7 | 2 | new | DeleteEdit.constructor (1) |  |
| `plugins/builtin-commands/src/edits/GroupEdit.ts` | 10 | 2 | new | GroupEdit.constructor (1) |  |
| `plugins/builtin-commands/src/edits/MoveEdit.ts` | 10 | 2 | new | MoveEdit.constructor (1) |  |
| `plugins/builtin-commands/src/edits/ScaleEdit.ts` | 10 | 2 | new | ScaleEdit.constructor (1) |  |
| `plugins/builtin-commands/src/edits/SetEdit.ts` | 9 | 2 | new | SetEdit.constructor (1) | One `set` = one undo unit, whichever AttributeHandler (or the default whitelist) performs it. |
| `plugins/builtin-commands/src/edits/UngroupEdit.ts` | 9 | 2 | new | UngroupEdit.constructor (1) |  |
| `plugins/builtin-commands/src/edits/ZOrderEdit.ts` | 9 | 3 | new | ZOrderEdit.apply (2) |  |
| `plugins/builtin-shapes/index.ts` | 2 | 0 | new | - |  |
| `plugins/builtin-shapes/src/BuiltinShapesPlugin.ts` | 25 | 7 | new | BuiltinShapesPlugin.activate (2) | The six Phase 1 shape types, registered through the ShapeProvider extension point. |
| `plugins/builtin-shapes/src/Circle.ts` | 14 | 4 | new | Circle.constructor (1) |  |
| `plugins/builtin-shapes/src/Ellipse.ts` | 16 | 4 | new | Ellipse.constructor (1) |  |
| `plugins/builtin-shapes/src/GeometryShapeProvider.ts` | 32 | 17 | new | GeometryShapeProvider.create (8) |  |
| `plugins/builtin-shapes/src/GroupProvider.ts` | 20 | 6 | new | GroupProvider.restore (4) | Plain `<g>` container; also the read-back fallback for any `<g data-kind=...>` without its plugin. |
| `plugins/builtin-shapes/src/Line.ts` | 16 | 4 | new | Line.constructor (1) |  |
| `plugins/builtin-shapes/src/Rect.ts` | 16 | 4 | new | Rect.constructor (1) |  |
| `plugins/builtin-shapes/src/Text.ts` | 19 | 7 | new | Text.set (2) |  |

## 基线中已移除或改名的文件

- `src/application/DocumentStore.ts`（复杂度 0）
- `src/application/EditorSession.ts`（复杂度 16）
- `src/application/History.ts`（复杂度 8）
- `src/application/commands/AddToCommand.ts`（复杂度 2）
- `src/application/commands/CreateCommand.ts`（复杂度 3）
- `src/application/commands/DeleteCommand.ts`（复杂度 2）
- `src/application/commands/EditCommand.ts`（复杂度 6）
- `src/application/commands/GroupCommand.ts`（复杂度 2）
- `src/application/commands/MoveCommand.ts`（复杂度 2）
- `src/application/commands/ScaleCommand.ts`（复杂度 2）
- `src/application/commands/SetCommand.ts`（复杂度 2）
- `src/application/commands/UngroupCommand.ts`（复杂度 2）
- `src/application/commands/ZOrderCommand.ts`（复杂度 3）
- `src/cli/CommandArguments.ts`（复杂度 16）
- `src/cli/CommandFactory.ts`（复杂度 32）
- `src/cli/Lexer.ts`（复杂度 16）
- `src/cli/Repl.ts`（复杂度 8）
- `src/cli/Token.ts`（复杂度 0）
- `src/cli/TreeFormatter.ts`（复杂度 13）
- `src/domain/Circle.ts`（复杂度 4）
- `src/domain/Ellipse.ts`（复杂度 4）
- `src/domain/GeometryShape.ts`（复杂度 13）
- `src/domain/Group.ts`（复杂度 19）
- `src/domain/Line.ts`（复杂度 4）
- `src/domain/Numbers.ts`（复杂度 9）
- `src/domain/Rect.ts`（复杂度 4）
- `src/domain/Shape.ts`（复杂度 31）
- `src/domain/ShapeFactory.ts`（复杂度 23）
- `src/domain/SvgDocument.ts`（复杂度 62）
- `src/domain/Text.ts`（复杂度 7）
- `src/infrastructure/FileDocumentStore.ts`（复杂度 5）
- `src/infrastructure/SvgCodec.ts`（复杂度 52）

