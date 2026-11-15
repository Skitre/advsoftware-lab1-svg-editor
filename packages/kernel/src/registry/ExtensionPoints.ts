import { AttributeRegistry } from './AttributeRegistry.js';
import { CommandRegistry } from './CommandRegistry.js';
import { DecoratorRegistry } from './DecoratorRegistry.js';
import type { Registry } from './Registry.js';
import { ShapeRegistry } from './ShapeRegistry.js';
import type { ExtensionCategory } from '../extension/ExtensionCategory.js';

/** The four kernel registries, one per extension point. */
export class ExtensionPoints {
  readonly shapes = new ShapeRegistry();
  readonly commands = new CommandRegistry();
  readonly decorators = new DecoratorRegistry();
  readonly attributes = new AttributeRegistry();

  registry(category: ExtensionCategory): Registry<unknown> {
    const registries: Readonly<Record<ExtensionCategory, Registry<unknown>>> = {
      shapes: this.shapes, commands: this.commands, decorators: this.decorators, attributes: this.attributes,
    };
    return registries[category];
  }
}
