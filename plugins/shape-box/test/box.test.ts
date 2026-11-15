import assert from 'node:assert/strict';
import { test } from 'node:test';
import { GeometryShape, Group, SvgDocument } from '@svgframe/kernel';
import type {
  AttributeHandler, PluginContext, Shape, ShapeCatalog, ShapeProvider, SvgElementSource, TreeDecorator,
} from '@svgframe/kernel';
import { Box } from '../src/Box.js';
import { BoxPlugin } from '../src/BoxPlugin.js';

// Test doubles for the parts: the box plugin only needs shape types named rect and text.
class FakeRect extends GeometryShape {
  constructor(id: string, x: number, y: number, w: number, h: number) { super(id, { x, y, width: w, height: h }, ['x'], ['y'], ['width', 'height']); }
  override get tag(): string { return 'rect'; }
  override describeGeometry(): string { return ''; }
  override clone(): FakeRect { const g = this.geometry(); const c = new FakeRect(this.id, g.x!, g.y!, g.width!, g.height!); this.copyPresentationTo(c); return c; }
}
class FakeText extends GeometryShape {
  constructor(id: string, x: number, y: number, private content: string) { super(id, { x, y }, ['x'], ['y'], []); }
  override get tag(): string { return 'text'; }
  override get textContent(): string { return this.content; }
  override set(attribute: string, value: string): void { if (attribute === 'text') this.content = value; else super.set(attribute, value); }
  override describeGeometry(): string { return ''; }
  override clone(): FakeText { const g = this.geometry(); return new FakeText(this.id, g.x!, g.y!, this.content); }
}
class FakeCatalog implements ShapeCatalog {
  readonly calls: string[] = [];
  create(type: string, id: string, params: readonly string[]): Shape {
    this.calls.push(`${type} ${id} ${params.join(' ')}`);
    const n = params.map(Number);
    if (type === 'rect') { const r = new FakeRect(id, n[0]!, n[1]!, n[2]!, n[3]!); if (params[4]) r.set('fill', params[4]); return r; }
    if (type === 'text') return new FakeText(id, n[0]!, n[1]!, params[2]!);
    throw new Error(`unknown shape type: ${type}`);
  }
  has(type: string): boolean { return type === 'rect' || type === 'text'; }
  syntaxes(): readonly string[] { return []; }
}
/** Fake PluginContext collecting registrations. */
const activate = (options: Record<string, unknown> = {}) => {
  const shapes = new FakeCatalog();
  const got = { shapes: [] as ShapeProvider[], attributes: [] as AttributeHandler[], decorators: [] as TreeDecorator[] };
  new BoxPlugin().activate({
    options, shapes,
    registerShape: (p: ShapeProvider) => got.shapes.push(p),
    registerAttributeHandler: (h: AttributeHandler) => got.attributes.push(h),
    registerTreeDecorator: (d: TreeDecorator) => got.decorators.push(d),
    registerCommand: () => assert.fail('box registers no command'), observeSession: () => assert.fail('box observes nothing'),
  } as PluginContext);
  return { catalog: shapes, provider: got.shapes[0]!, handler: got.attributes[0]!, decorator: got.decorators[0]!, got };
};
const restoreWarnings: string[] = [];
const restore = (provider: ShapeProvider, children: Shape[], attributes: Record<string, string> = { id: 'n1', 'data-kind': 'box' }) =>
  provider.restore({ tag: 'g', id: 'n1', attributes, text: '' } as SvgElementSource, children, { warn: m => restoreWarnings.push(m) });

test('activation registers exactly the declared shape, attribute handler and tree label', () => {
  const { got } = activate();
  assert.deepEqual([got.shapes.map(s => s.type), got.attributes.map(a => a.name), got.decorators.map(d => d.name)],
    [['box'], ['box-attributes'], ['box-type-label']]);
  assert.deepEqual([got.shapes[0]!.element, got.shapes[0]!.kind, got.shapes[0]!.content], ['g', 'box', 'shapes']);
  assert.throws(() => activate({ fill: 3 }), /option fill must be a non-empty string/);
});

test('create builds g + frame + title from the template through the shape catalog', () => {
  const { provider, catalog } = activate();
  const box = provider.create('n1', ['120', '100', '160', '60', '开始']);
  assert.deepEqual(catalog.calls, ['rect n1-rect 120 100 160 60 #4a90d9', 'text n1-label 140 135 开始']);
  assert.deepEqual([box.type, box.tag, box.label, box.children.map(c => c.label)], ['box', 'g', 'box#n1', ['rect#n1-rect', 'text#n1-label']]);
  assert.equal(box.describeComposition(), '(g#n1 + rect#n1-rect + text#n1-label)');
  assert.equal(box.attributes()['data-kind'], 'box');
  assert.equal(activate({ fill: 'red' }).provider.create('b', ['0', '0', '1', '1', 'x']).children[0]!.attributes().fill, 'red');
  for (const params of [['1', '2', '3', '4'], ['1', '2', '3', '4', 'a', 'b'], ['x', '2', '3', '4', 'a']]) {
    assert.throws(() => provider.create('n1', params), /invalid parameters for box|invalid number for x/);
  }
});

test('id conflict anywhere in the new subtree fails the whole create and leaves nothing behind', () => {
  const { provider } = activate();
  const document = new SvgDocument(); document.create(new FakeRect('n1-label', 0, 0, 1, 1));
  assert.throws(() => document.create(provider.create('n1', ['0', '0', '1', '1', 't'])), /id already exists: n1-label/);
  assert.deepEqual(document.all().map(s => s.id), ['n1-label']);
});

test('invariants: no ungroup, parts cannot be detached, box moves as a whole and can nest', () => {
  const { provider } = activate();
  const document = new SvgDocument();
  document.create(provider.create('n1', ['0', '0', '10', '10', 'a']));
  document.create(new Group('other'));
  document.create(provider.create('n2', ['1', '1', '2', '2', 'b']), 'n1');
  assert.throws(() => document.ungroup('n1'), /cannot ungroup composite shape: n1/);
  assert.throws(() => document.delete('n1-rect'), /cannot detach part of composite shape: n1-rect/);
  assert.throws(() => document.addTo('other', 'n1-label'), /cannot detach part of composite shape: n1-label/);
  assert.throws(() => document.group('pair', ['n1-rect', 'other']), /cannot detach part of composite shape: n1-rect/);
  document.find('n1').move(5, 5);
  assert.deepEqual([document.find('n1-rect').geometry().x, document.find('n2-label').geometry().x], [5, 26]);
  document.delete('n2'); assert.equal(document.count, 4);
  assert.ok(document.clone().find('n1') instanceof Box, 'clone keeps the composite type');
});

test('attribute handler: fill goes to the frame, label to the title; other attributes and shapes are not handled', () => {
  const { provider, handler } = activate();
  const document = new SvgDocument(); document.create(provider.create('n1', ['0', '0', '1', '1', 'old']));
  const box = document.find('n1');
  assert.deepEqual(['fill', 'label', 'stroke'].map(a => handler.handles(box, a)), [true, true, false]);
  assert.equal(handler.handles(document.find('n1-rect'), 'fill'), false);
  assert.equal(handler.apply(box, 'fill', '#f5a623', document), 'box#n1 fill propagated to n1-rect');
  assert.equal(handler.apply(box, 'label', '处理数据 v2', document), 'box#n1 label updated: "处理数据 v2"');
  assert.deepEqual([document.find('n1-rect').attributes().fill, document.find('n1-label').textContent, box.attributes().fill],
    ['#f5a623', '处理数据 v2', undefined]);
});

test('tree label marks only box lines', () => {
  const { provider, decorator } = activate();
  const document = new SvgDocument(); document.create(provider.create('n1', ['0', '0', '1', '1', 'a']));
  assert.deepEqual([undefined, 'n1', 'n1-rect'].map(id => decorator.label({ document, shape: id ? document.find(id) : undefined })),
    [undefined, '(box)', undefined]);
});

test('read-back restores a complete box and degrades an incomplete one to a plain g with a warning', () => {
  const { provider } = activate();
  restoreWarnings.length = 0;
  const parts = () => [new FakeRect('n1-rect', 0, 0, 1, 1), new FakeText('n1-label', 0, 0, 't')];
  const full = restore(provider, [...parts(), new FakeRect('extra', 0, 0, 1, 1)], { id: 'n1', 'data-kind': 'box', stroke: 'red' });
  assert.ok(full instanceof Box); assert.equal(full.children.length, 3);
  assert.deepEqual(full.attributes(), { id: 'n1', stroke: 'red', 'data-kind': 'box' });
  const missing = restore(provider, [parts()[0]!]);
  const wrong = restore(provider, [parts()[0]!, new FakeRect('n1-label', 0, 0, 1, 1)]);
  for (const shape of [missing, wrong]) {
    assert.ok(!(shape instanceof Box)); assert.equal(shape.type, 'g'); assert.equal(shape.attributes()['data-kind'], 'box');
  }
  assert.deepEqual(restoreWarnings, ['missing part n1-label; read box n1 as plain g',
    'part n1-label is rect, expected text; read box n1 as plain g']);
});
