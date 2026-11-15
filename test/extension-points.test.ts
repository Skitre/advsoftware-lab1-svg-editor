import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Group } from '@svgframe/kernel/host';
import type {
  AttributeHandler, Command, PluginContext, Shape, ShapeProvider, SvgDocument, SvgElementSource, TreeDecorator,
} from '@svgframe/kernel/host';
import type { PluginSource } from '../src/host/PluginInstaller.js';
import { TestEditor } from './support/TestEditor.js';

/** Test double plugin: registers whatever the test hands it, with a matching manifest. */
const plugin = (name: string, register: (context: PluginContext) => void, contributes: Record<string, string[]>): PluginSource => ({
  module: name, plugin: { activate: register }, packageJson: { name, contributes },
});

/** A composite double: owns `<id>-part`, cannot be ungrouped, reports its composition. */
class Pair extends Group {
  override get type(): string { return 'pair'; }
  override get dissolvable(): boolean { return false; }
  override ownsPart(child: Shape): boolean { return child.id === `${this.id}-part`; }
  override describeComposition(): string { return `(${this.children.map(child => child.label).join(' + ')})`; }
  override clone(): Pair { const copy = new Pair(this.id); this.copyPresentationTo(copy); for (const child of this.children) copy.insert(child.clone()); return copy; }
}

const pairProvider = (shapes: PluginContext['shapes']): ShapeProvider => ({
  type: 'pair', element: 'g', kind: 'pair', content: 'shapes', syntax: 'pair <id>',
  create(id: string): Shape {
    const pair = new Pair(id); pair.insert(shapes.create('rect', `${id}-part`, ['0', '0', '1', '1'])); return pair;
  },
  restore(source: SvgElementSource, children: readonly Shape[]): Shape {
    const pair = new Pair(source.id); for (const child of children) pair.insert(child); return pair;
  },
});

test('ShapeProvider: registered type is creatable, listed in help, composed through the catalog and read back by data-kind', async () => {
  const editor = await TestEditor.create([plugin('pair-plugin', c => c.registerShape(pairProvider(c.shapes)), { shapes: ['pair'] })]);
  editor.run('init');
  assert.deepEqual(editor.run('create pair p'), ['pair#p created (rect#p-part)']);
  assert.ok(editor.run('help').includes('  pair <id>'));
  assert.deepEqual(editor.run('tree'), ['svg (800x600)', '└── g#p', '    └── rect#p-part  x=0 y=0 w=1 h=1']);
  assert.throws(() => editor.run('ungroup p'), /cannot ungroup composite shape: p/);
  for (const line of ['delete p-part', 'group x p-part', 'create g other', 'addto other p-part']) {
    if (line === 'create g other') { editor.run(line); continue; }
    assert.throws(() => editor.run(line), /cannot detach part of composite shape: p-part/, line);
  }
  const xml = editor.codec().encode(editor.session.snapshot());
  assert.equal(editor.codec().decode(xml.replace('<g id="p"', '<g id="p" data-kind="pair"')).document.find('p').type, 'pair');
});

test('ShapeProvider default: without the plugin a data-kind group reads back as plain g, unknown types fail', async () => {
  const editor = await TestEditor.create();
  const { document } = editor.codec().decode('<svg><g id="p" data-kind="pair"><rect id="p-part"/></g></svg>');
  assert.equal(document.find('p').type, 'g');
  assert.match(editor.codec().encode(document), /data-kind="pair"/);
  editor.run('init');
  assert.throws(() => editor.run('create pair p'), /unknown shape type: pair \(is the plugin loaded\?\)/);
});

test('ShapeProvider contract: create() must return a shape of its type with the requested id', async () => {
  const liar: ShapeProvider = { ...pairProvider({ create: () => new Group('x'), has: () => true, syntaxes: () => [] }),
    create: () => new Group('wrong') };
  const editor = await TestEditor.create([plugin('liar', c => c.registerShape(liar), { shapes: ['pair'] })]);
  editor.run('init');
  assert.throws(() => editor.run('create pair p'), /shapes contract violation: pair: create\(\) must return a pair shape with id p/);
  assert.deepEqual(editor.run('tree'), ['svg (800x600)']);
});

test('Command: plugin command is dispatched, listed in help, may run without a document, and must return lines', async () => {
  const echo: Command = { name: 'echo', syntax: 'echo <text>', requiresDocument: false, execute: a => [a.at(0)] };
  const broken: Command = { name: 'broken', syntax: 'broken', requiresDocument: true, execute: () => 'oops' as unknown as string[] };
  const editor = await TestEditor.create([plugin('cmds', c => { c.registerCommand(echo); c.registerCommand(broken); },
    { commands: ['echo', 'broken'] })]);
  assert.deepEqual(editor.run('echo "hi there"'), ['hi there']);
  assert.ok(editor.run('help').includes('  echo <text>'));
  assert.throws(() => editor.run('broken'), /no document/);
  editor.run('init');
  assert.throws(() => editor.run('broken'), /commands contract violation: broken: execute\(\) must return string lines/);
  assert.throws(() => editor.run('missing'), /unknown command: missing/);
});

test('TreeDecorator: labels are appended in registration order to root and shape lines; none means baseline output', async () => {
  const first: TreeDecorator = { name: 'first', label: line => line.shape ? `[${line.shape.type}]` : '<root>' };
  const second: TreeDecorator = { name: 'second', label: line => line.shape?.id === 'r' ? '*' : undefined };
  const editor = await TestEditor.create([
    plugin('one', c => c.registerTreeDecorator(first), { decorators: ['first'] }),
    plugin('two', c => c.registerTreeDecorator(second), { decorators: ['second'] }),
  ]);
  editor.run('init'); editor.run('create g g1'); editor.run('create rect r 1 2 3 4 in g1');
  assert.deepEqual(editor.run('tree'), ['svg (800x600) <root>', '└── g#g1 [g]', '    └── rect#r  x=1 y=2 w=3 h=4 [rect] *']);
  assert.deepEqual(editor.run('tree r'), ['rect#r  x=1 y=2 w=3 h=4 [rect] *']);
  assert.deepEqual(editor.run('show r'), ['rect#r  parent=g#g1', '  x=1 y=2 width=3 height=4']);
});

test('TreeDecorator contract: throwing or multi-line labels are reported, not rendered', async () => {
  for (const label of [() => { throw new Error('boom'); }, () => 'a\nb']) {
    const editor = await TestEditor.create([plugin('bad', c => c.registerTreeDecorator({ name: 'bad', label }), { decorators: ['bad'] })]);
    editor.run('init');
    assert.throws(() => editor.run('tree'), /tree decorator bad failed: boom|decorators contract violation: bad: label must be a single-line string/);
  }
});

/** Handler double: on `pair` shapes, `fill` goes to the part; optionally fails after a partial change. */
const partFill = (name: string, priority?: number, failAfterPartialChange = false): AttributeHandler => ({
  name, priority,
  handles: (shape, attribute) => shape.type === 'pair' && attribute === 'fill',
  apply(shape: Shape, _attribute: string, value: string, document: SvgDocument): string {
    document.find(`${shape.id}-part`).set('fill', value);
    shape.set('stroke', value); // a second sub-change inside the same undo unit
    if (failAfterPartialChange) throw new Error('handler failed midway');
    return `${shape.label} fill propagated to ${shape.id}-part by ${name}`;
  },
});
const withHandlers = (...handlers: AttributeHandler[]) => TestEditor.create([plugin('attrs', c => {
  c.registerShape(pairProvider(c.shapes)); for (const handler of handlers) c.registerAttributeHandler(handler);
}, { shapes: ['pair'], attributes: handlers.map(handler => handler.name) })]);
const state = (editor: TestEditor) => editor.run('tree').join('\n');

test('AttributeHandler: one set is one undo unit even when it changes several parts', async () => {
  const editor = await withHandlers(partFill('part-fill'));
  editor.run('init'); editor.run('create pair p');
  const before = state(editor);
  assert.deepEqual(editor.run('set p fill red'), ['pair#p fill propagated to p-part by part-fill']);
  const after = state(editor);
  assert.match(after, /g#p {2}stroke=red\n.*rect#p-part .* fill=red/);
  editor.run('undo'); assert.equal(state(editor), before);
  editor.run('redo'); assert.equal(state(editor), after);
});

test('AttributeHandler default: without a matching handler the whitelist applies; unknown attributes fail', async () => {
  const editor = await withHandlers(partFill('part-fill'));
  editor.run('init'); editor.run('create pair p'); editor.run('create rect r 0 0 1 1');
  assert.deepEqual(editor.run('set r fill blue'), ['rect#r updated: fill="blue"']);
  assert.deepEqual(editor.run('set p stroke blue'), ['pair#p updated: stroke="blue"']);
  assert.throws(() => editor.run('set r label x'), /unknown attribute: label/);
});

test('AttributeHandler conflicts: highest priority wins, equal top priority is rejected without changes', async () => {
  const ranked = await withHandlers(partFill('low', 1), partFill('high', 5));
  ranked.run('init'); ranked.run('create pair p');
  assert.deepEqual(ranked.run('set p fill red'), ['pair#p fill propagated to p-part by high']);
  const tied = await withHandlers(partFill('a', 2), partFill('b', 2), partFill('c', 1));
  tied.run('init'); tied.run('create pair p'); const before = state(tied);
  assert.throws(() => tied.run('set p fill red'), /ambiguous attribute handlers for fill on pair#p: a, b/);
  assert.equal(state(tied), before);
});

test('AttributeHandler failure after a partial change restores the document and keeps undo/redo history', async () => {
  const editor = await withHandlers(partFill('failing', 0, true));
  editor.run('init'); editor.run('create pair p'); editor.run('create rect r 0 0 1 1'); editor.run('move r 1 1'); editor.run('undo');
  const before = state(editor);
  assert.throws(() => editor.run('set p fill red'), /handler failed midway/);
  assert.equal(state(editor), before);
  assert.deepEqual(editor.run('redo'), ['redone: rect#r moved by (1,1)']);
  assert.deepEqual(editor.run('undo'), ['undone: rect#r moved by (1,1)']);
  assert.deepEqual(editor.run('undo'), ['undone: rect#r created']);
});

test('AttributeHandler contract: handles() must be a pure boolean query', async () => {
  const editor = await withHandlers({ name: 'odd', handles: () => 'yes' as unknown as boolean, apply: () => undefined });
  editor.run('init'); editor.run('create pair p');
  assert.throws(() => editor.run('set p fill red'), /attributes contract violation: odd: handles\(\) must return a boolean/);
});

test('a throwing session observer is reported after the command completed', async () => {
  const editor = await TestEditor.create([plugin('noisy', c => c.observeSession({ changed: () => { throw new Error('noise'); } }), {})]);
  editor.run('init');
  assert.throws(() => editor.run('create rect r 0 0 1 1'), /session observer failed after the command completed \(noise\)/);
  assert.equal(editor.session.snapshot().count, 1);
});

test('session observers see baseline on init/read/save and changes on edit/undo/redo/canvas, as private copies', async () => {
  const events: string[] = [];
  const editor = await TestEditor.create([plugin('observer', c => c.observeSession({
    baseline: document => { events.push(`baseline ${document.count}`); if (document.count) document.delete(document.children[0]!.id); },
    changed: document => events.push(`changed ${document.count}`),
  }), {})]);
  editor.run('init'); editor.run('create rect r 0 0 1 1'); editor.run('undo'); editor.run('redo');
  assert.throws(() => editor.run('save'), /no file path/);
  editor.run('save a.svg'); editor.run('canvas 10 10'); editor.run('read a.svg');
  assert.deepEqual(events, ['baseline 0', 'changed 1', 'changed 0', 'changed 1', 'baseline 1', 'changed 1', 'baseline 1']);
  assert.equal(editor.session.snapshot().count, 1, 'observer mutations never reach the session');
});
