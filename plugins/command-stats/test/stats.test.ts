import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CommandArguments, GeometryShape, Group, SvgDocument } from '@svgframe/kernel';
import type { Command, CommandContext, PluginContext } from '@svgframe/kernel';
import { StatsPlugin } from '../src/StatsPlugin.js';

/** Leaf double: any type name, no dependency on the built-in shapes plugin. */
class Leaf extends GeometryShape {
  constructor(id: string, private readonly kind: string) { super(id, { x: 0 }, ['x'], [], []); }
  override get tag(): string { return this.kind; }
  override describeGeometry(): string { return ''; }
  override clone(): Leaf { return new Leaf(this.id, this.kind); }
}
/** Composite double standing in for box: a container with its own type name. */
class Composite extends Group {
  override get type(): string { return 'box'; }
  override clone(): Composite { const copy = new Composite(this.id); for (const child of this.children) copy.insert(child.clone()); return copy; }
}

const activate = (): Command => {
  const commands: Command[] = [];
  new StatsPlugin().activate({ registerCommand: (command: Command) => commands.push(command) } as unknown as PluginContext);
  assert.equal(commands.length, 1);
  return commands[0]!;
};
const run = (document: SvgDocument, ...args: string[]) => activate().execute(
  new CommandArguments(args.map(value => ({ value, quoted: false })), 'stats'),
  { session: { snapshot: () => document.clone() } } as unknown as CommandContext,
);

test('stats plugin registers one document command named stats', () => {
  const command = activate();
  assert.deepEqual([command.name, command.syntax, command.requiresDocument], ['stats', 'stats', true]);
});

test('empty document', () => assert.deepEqual(run(new SvgDocument()), ['(total 0, containers 0)']));

test('leaves by first appearance in depth-first child order; g and box count only as containers', () => {
  const document = new SvgDocument();
  document.create(new Leaf('t1', 'text'));
  document.create(new Group('scene'));
  document.create(new Leaf('r1', 'rect'), 'scene');
  document.create(new Composite('n1'), 'scene');
  document.create(new Leaf('n1-rect', 'rect'), 'n1');
  document.create(new Leaf('n1-label', 'text'), 'n1');
  document.create(new Leaf('c1', 'circle'));
  document.create(new Group('empty'));
  assert.deepEqual(run(document), ['text: 2  rect: 2  circle: 1  (total 5, containers 3)']);
  document.reorder('c1', false);
  assert.deepEqual(run(document), ['circle: 1  text: 2  rect: 2  (total 5, containers 3)']);
});

test('stats takes no arguments', () => assert.throws(() => run(new SvgDocument(), 'x'), /usage: stats/));
