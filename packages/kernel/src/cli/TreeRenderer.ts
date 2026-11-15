import type { Shape } from '../domain/Shape.js';
import type { SvgDocument } from '../domain/SvgDocument.js';
import type { TreeLine, TreeView } from '../extension/TreeDecorator.js';
import type { DecoratorRegistry } from '../registry/DecoratorRegistry.js';

/** Renders `tree` and `show`. With no decorators the output equals Phase 1 byte for byte. */
export class TreeRenderer implements TreeView {
  constructor(private readonly decorators: DecoratorRegistry) {}

  tree(document: SvgDocument, id?: string): string[] {
    if (id !== undefined) {
      const shape = document.find(id);
      return [this.decorate(shape.describe(), { document, shape }), ...this.branches(document, shape.children, '')];
    }
    return [this.decorate(`svg (${document.width}x${document.height})`, { document }), ...this.branches(document, document.children, '')];
  }

  show(document: SvgDocument, id: string): string[] {
    const shape = document.find(id);
    const geometry = Object.entries(shape.geometry()).map(([key, value]) => `${key}=${value}`).join(' ');
    const attributes = Object.entries(shape.attributes())
      .filter(([key]) => key !== 'id' && !(key in shape.geometry()))
      .map(([key, value]) => `  ${key}=${JSON.stringify(value)}`);
    return [
      `${shape.label}  parent=${document.parentLabel(id)}`,
      ...(geometry ? [`  ${geometry}`] : []), ...attributes,
      ...(shape.textContent === undefined ? [] : [`  text=${JSON.stringify(shape.textContent)}`]),
    ];
  }

  private branches(document: SvgDocument, children: readonly Shape[], prefix: string): string[] {
    return children.flatMap((shape, index) => {
      const last = index === children.length - 1;
      return [`${prefix}${last ? '└── ' : '├── '}${this.decorate(shape.describe(), { document, shape })}`,
        ...this.branches(document, shape.children, `${prefix}${last ? '    ' : '│   '}`)];
    });
  }

  /** Appends every decorator's label in registration order, one space before each. */
  private decorate(text: string, line: TreeLine): string {
    let result = text;
    for (const decorator of this.decorators.values()) {
      let label: unknown;
      try { label = decorator.label(line); }
      catch (error) { throw new Error(`tree decorator ${decorator.name} failed: ${error instanceof Error ? error.message : String(error)}`); }
      if (label === undefined || label === '') continue;
      if (typeof label !== 'string' || /[\r\n]/.test(label)) {
        throw new Error(`decorators contract violation: ${decorator.name}: label must be a single-line string`);
      }
      result += ` ${label}`;
    }
    return result;
  }
}
