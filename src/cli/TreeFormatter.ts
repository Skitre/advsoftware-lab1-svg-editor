import type { Shape } from '../domain/Shape.js';
import type { SvgDocument } from '../domain/SvgDocument.js';

export class TreeFormatter {
  tree(document: SvgDocument, id?: string): string[] {
    if (id !== undefined) {
      const shape = document.find(id);
      return [shape.describe(), ...this.branches(shape.children, '')];
    }
    return [`svg (${document.width}x${document.height})`, ...this.branches(document.children, '')];
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

  private branches(children: readonly Shape[], prefix: string): string[] {
    return children.flatMap((shape, index) => {
      const last = index === children.length - 1;
      return [`${prefix}${last ? '└── ' : '├── '}${shape.describe()}`,
        ...this.branches(shape.children, `${prefix}${last ? '    ' : '│   '}`)];
    });
  }
}
