import type { TreeDecorator } from '../extension/TreeDecorator.js';
import { Registry } from './Registry.js';

export class DecoratorRegistry extends Registry<TreeDecorator> {
  constructor() { super('decorators'); }

  override nameOf(decorator: TreeDecorator): string { return decorator.name; }

  override validate(item: unknown): asserts item is TreeDecorator {
    super.validate(item);
    this.requireMethods(item as TreeDecorator, ['label']);
  }
}
