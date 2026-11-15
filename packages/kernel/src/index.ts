// Public kernel API for plugins: domain abstractions and extension point interfaces only.
export { Shape } from './domain/Shape.js';
export { GeometryShape } from './domain/GeometryShape.js';
export { Group } from './domain/Group.js';
export { SvgDocument } from './domain/SvgDocument.js';
export { Numbers } from './domain/Numbers.js';
export { EditCommand } from './session/EditCommand.js';
export { CommandArguments } from './extension/CommandArguments.js';
export type { EditorSession } from './session/EditorSession.js';
export type { DocumentStore } from './session/DocumentStore.js';
export type { SessionObserver } from './session/SessionObserver.js';
export type { Token } from './extension/Token.js';
export type { ShapeProvider, ShapeRestoreContext, SvgElementSource } from './extension/ShapeProvider.js';
export type { ShapeCatalog } from './extension/ShapeCatalog.js';
export type { Command, CommandCatalog, CommandContext } from './extension/Command.js';
export type { TreeDecorator, TreeLine, TreeView } from './extension/TreeDecorator.js';
export type { AttributeHandler, AttributeService } from './extension/AttributeHandler.js';
export type { Plugin, PluginContext } from './extension/Plugin.js';
export type { ExtensionCategory } from './extension/ExtensionCategory.js';
