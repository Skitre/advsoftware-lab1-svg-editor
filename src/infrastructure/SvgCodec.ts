import { DOMImplementation, DOMParser, XMLSerializer } from '@xmldom/xmldom';
import type { Document, Element, Node } from '@xmldom/xmldom';
import { Numbers } from '../domain/Numbers.js';
import type { Shape } from '../domain/Shape.js';
import { ShapeFactory } from '../domain/ShapeFactory.js';
import { SvgDocument } from '../domain/SvgDocument.js';

export class SvgCodec {
  private readonly namespace = 'http://www.w3.org/2000/svg';
  constructor(private readonly factory = new ShapeFactory()) {}

  decode(source: string): { document: SvgDocument; warnings: readonly string[] } {
    if (/<!DOCTYPE|<!ENTITY/i.test(source)) throw new Error('invalid SVG: DTD and entity declarations are unsupported');
    let xml: Document;
    try {
      xml = new DOMParser({ onError: (_level, message) => { throw new Error(message); } })
        .parseFromString(source, 'image/svg+xml');
    } catch { throw new Error('invalid SVG: malformed XML'); }
    const root = xml.documentElement;
    if (!root || root.localName !== 'svg') throw new Error('invalid SVG: root must be <svg>');
    this.assertNamespace(root);
    const viewBox = root.getAttribute('viewBox')?.trim().split(/[\s,]+/);
    const width = this.dimension(root.getAttribute('width') ?? viewBox?.[2] ?? '800', 'width');
    const height = this.dimension(root.getAttribute('height') ?? viewBox?.[3] ?? '600', 'height');
    const document = new SvgDocument(width, height);
    if (root.hasAttribute('viewBox')) document.setViewBox(root.getAttribute('viewBox')!);
    for (const [name, value] of Object.entries(this.attributes(root))) {
      if (!['width', 'height', 'viewBox', 'version'].includes(name)) document.importCanvasAttribute(name, value);
    }

    // Reserve explicit IDs across the entire file before assigning any generated ones.
    const reserved = new Set<string>();
    const elements = Array.from(root.getElementsByTagName('*'));
    for (const element of elements) {
      this.assertNamespace(element);
      const id = element.getAttribute('id');
      if (id) {
        if (reserved.has(id)) throw new Error(`id already exists: ${id}`);
        reserved.add(id);
      }
    }
    const warnings: string[] = [];
    for (const element of this.elementChildren(root)) document.create(this.readShape(element, reserved, warnings));
    return { document, warnings };
  }

  encode(document: SvgDocument): string {
    const xml = new DOMImplementation().createDocument(this.namespace, 'svg', null);
    const root = xml.documentElement!;
    root.setAttribute('xmlns', this.namespace);
    root.setAttribute('width', String(document.width)); root.setAttribute('height', String(document.height));
    root.setAttribute('viewBox', document.viewBox);
    for (const [key, value] of Object.entries(document.canvasPresentation())) root.setAttribute(key, value);
    for (const shape of document.children) {
      root.appendChild(xml.createTextNode('\n  ')); root.appendChild(this.writeShape(xml, shape, 1));
    }
    if (document.children.length) root.appendChild(xml.createTextNode('\n'));
    return `<?xml version="1.0" encoding="UTF-8"?>\n${new XMLSerializer().serializeToString(xml)}\n`;
  }

  private readShape(element: Element, reserved: Set<string>, warnings: string[]): Shape {
    const type = element.localName ?? element.tagName;
    let id = element.getAttribute('id');
    if (!id) {
      let index = 1;
      while (reserved.has(`${type}${index}`)) index++;
      id = `${type}${index}`; reserved.add(id);
      warnings.push(`warning: assigned id ${id} to unnamed <${type}>`);
    }
    const shape = this.factory.fromSvg(type, id, this.attributes(element), element.textContent ?? '');
    const children = this.elementChildren(element, shape.textContent !== undefined);
    if (children.length && !shape.container) throw new Error(`invalid SVG: ${shape.label} cannot contain elements`);
    for (const child of children) shape.container!.insert(this.readShape(child, reserved, warnings));
    return shape;
  }

  private writeShape(xml: Document, shape: Shape, depth: number): Element {
    const element = xml.createElementNS(this.namespace, shape.tag);
    for (const [key, value] of Object.entries(shape.attributes())) element.setAttribute(key, value);
    if (shape.textContent !== undefined) element.appendChild(xml.createTextNode(shape.textContent));
    for (const child of shape.children) {
      element.appendChild(xml.createTextNode(`\n${'  '.repeat(depth + 1)}`));
      element.appendChild(this.writeShape(xml, child, depth + 1));
    }
    if (shape.children.length) element.appendChild(xml.createTextNode(`\n${'  '.repeat(depth)}`));
    return element;
  }

  private elementChildren(node: Node, allowText = false): Element[] {
    const result: Element[] = [];
    for (const child of Array.from(node.childNodes ?? [])) {
      if (child.nodeType === 1) result.push(child as Element);
      else if ((child.nodeType === 3 || child.nodeType === 4) && !allowText && child.nodeValue?.trim()) {
        throw new Error('invalid SVG: text outside a text element');
      }
    }
    return result;
  }

  private attributes(element: Element): Record<string, string> {
    return Object.fromEntries(Array.from(element.attributes)
      .filter(attribute => attribute.name !== 'xmlns' && !attribute.name.startsWith('xmlns:'))
      .map(attribute => [attribute.name, attribute.value]));
  }

  private assertNamespace(element: Element): void {
    if (element.namespaceURI && element.namespaceURI !== this.namespace) throw new Error('invalid SVG: unsupported namespace');
  }

  private dimension(value: string, label: string): number {
    return Numbers.parse(value.trim().replace(/px$/, ''), label);
  }
}
