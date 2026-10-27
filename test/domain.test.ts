import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ShapeFactory } from '../src/domain/ShapeFactory.js';
import { SvgDocument } from '../src/domain/SvgDocument.js';
import { Group } from '../src/domain/Group.js';
import { Rect } from '../src/domain/Rect.js';

const factory = new ShapeFactory();

test('all six shapes have polymorphic movement, scaling, cloning and default style', () => {
  const inputs = [
    ['rect', ['1', '2', '3', '4']], ['circle', ['1', '2', '3']],
    ['ellipse', ['1', '2', '3', '4']], ['line', ['1', '2', '3', '4']],
    ['text', ['1', '2', 'hello']], ['g', []],
  ] as const;
  for (const [type, params] of inputs) {
    const shape = factory.create(type, type, params);
    const original = shape.attributes();
    shape.move(2, 3); shape.scale(2);
    assert.equal(shape.attributes().fill, undefined);
    assert.deepEqual(shape.clone().attributes(), shape.attributes());
    if (type !== 'g') assert.notDeepEqual(shape.attributes(), original);
  }
});

test('nested composite recursively moves/scales geometry and uses inherited group styles', () => {
  const doc = new SvgDocument(); doc.create(new Group('scene')); doc.create(new Group('node'), 'scene');
  doc.create(new Rect('r', 10, 20, 30, 40), 'node');
  doc.find('scene').move(2, 3); doc.find('scene').scale(2); doc.find('scene').set('fill', 'red');
  assert.deepEqual(doc.find('r').geometry(), { x: 24, y: 46, width: 60, height: 80 });
  assert.equal(doc.find('scene').attributes().fill, 'red');
  assert.equal(doc.find('r').attributes().fill, undefined);
});

test('group uses existing document order; nested ungroup occupies original slot', () => {
  const doc = new SvgDocument(); doc.create(new Group('outer'));
  for (const id of ['a', 'b', 'c']) doc.create(new Rect(id, 0, 0, 1, 1), 'outer');
  doc.group('inner', ['c', 'a']);
  assert.deepEqual(doc.find('inner').children.map(s => s.id), ['a', 'c']);
  doc.ungroup('inner');
  assert.deepEqual(doc.find('outer').children.map(s => s.id), ['a', 'c', 'b']);
  assert.throws(() => doc.ungroup('outer'), /cannot ungroup top-level/);
});

test('identity, ownership, and cycles are checked before mutation', () => {
  const doc = new SvgDocument(); doc.create(new Group('a')); doc.create(new Group('b'), 'a');
  doc.create(new Rect('r', 0, 0, 1, 1), 'b');
  assert.throws(() => doc.group('bad', ['r', 'a']), /cannot group.*a/);
  assert.throws(() => doc.addTo('b', 'a'), /own descendant/);
  assert.throws(() => doc.create(new Group('r')), /id already exists: r/);
  assert.throws(() => doc.create(new Group('x'), 'missing'), /no such container: missing/);
  assert.throws(() => doc.create(new Group('x'), 'r'), /not a container: r/);
  assert.equal(doc.count, 3); assert.equal(doc.parentLabel('r'), 'g#b');
});

test('invalid geometry, unknown attributes, and unsupported phase 2 shapes fail', () => {
  const rect = new Rect('r', 1, 2, 3, 4);
  assert.throws(() => rect.scale(0), /scale factor must be positive/);
  assert.throws(() => rect.set('width', '-1'), /nonnegative/);
  assert.throws(() => rect.set('x', 'NaN'), /invalid number/);
  assert.throws(() => rect.set('font-size', '20'), /unknown attribute: font-size/);
  assert.throws(() => factory.create('box', 'b', []), /unknown shape type: box/);
  assert.deepEqual(rect.geometry(), { x: 1, y: 2, width: 3, height: 4 });
});

test('cross-parent group, z-order, subtree deletion, and deep copy keep tree invariants', () => {
  const doc = new SvgDocument(); doc.create(new Group('a')); doc.create(new Group('b'));
  doc.create(new Rect('r1', 0, 0, 1, 1), 'a'); doc.create(new Rect('r2', 0, 0, 1, 1), 'b');
  doc.group('g', ['r2', 'r1']);
  assert.equal(doc.parentLabel('g'), 'svg');
  assert.deepEqual(doc.find('g').children.map(s => s.id), ['r1', 'r2']);
  doc.reorder('r1', true); assert.deepEqual(doc.find('g').children.map(s => s.id), ['r2', 'r1']);
  doc.reorder('r1', false); assert.deepEqual(doc.find('g').children.map(s => s.id), ['r1', 'r2']);
  const clone = doc.clone(); clone.delete('g'); assert.equal(clone.count, 2); assert.equal(doc.count, 5);
});
