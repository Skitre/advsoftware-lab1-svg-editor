// Assembly API for the host side (composition root, plugin installer, loader). Not for plugins.
export * from './index.js';
export { EditorSession } from './session/EditorSession.js';
export { History } from './session/History.js';
export { extensionCategories } from './extension/ExtensionCategory.js';
export { Registry } from './registry/Registry.js';
export { ShapeRegistry } from './registry/ShapeRegistry.js';
export { CommandRegistry } from './registry/CommandRegistry.js';
export { DecoratorRegistry } from './registry/DecoratorRegistry.js';
export { AttributeRegistry } from './registry/AttributeRegistry.js';
export { ExtensionPoints } from './registry/ExtensionPoints.js';
export { Lexer } from './cli/Lexer.js';
export { Repl } from './cli/Repl.js';
export { CommandDispatcher } from './cli/CommandDispatcher.js';
export { TreeRenderer } from './cli/TreeRenderer.js';
export { SvgCodec } from './io/SvgCodec.js';
export { FileDocumentStore } from './io/FileDocumentStore.js';
