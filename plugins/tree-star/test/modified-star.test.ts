import assert from 'node:assert/strict';
import { test } from 'node:test';
import { GeometryShape, Group, SvgDocument } from '@svgframe/kernel';
import type { PluginContext, SessionObserver, TreeDecorator } from '@svgframe/kernel';
import { ModifiedStar } from '../src/ModifiedStar.js';
import { TreeStarPlugin } from '../src/TreeStarPlugin.js';

class Leaf extends GeometryShape {
  constructor(id: string, x = 0) { super(id, { x }, ['x'], [], []); }
  override get tag(): string { return 'leaf'; }
  override describeGeometry(): string { return ''; }
  override clone(): Leaf { const copy = new Leaf(this.id, this.geometry().x); this.copyPresentationTo(copy); return copy; }
}

/** Mimics the session: a current document, its history of states, and baseline notifications. */
class Session {
  document = new SvgDocument();
  private readonly undoStack: SvgDocument[] = [];
  constructor(private readonly star: ModifiedStar) { star.baseline(this.document.clone()); } // init
  edit(change: (document: SvgDocument) => void): void {
    this.undoStack.push(this.document.clone()); const draft = this.document.clone(); change(draft); this.document = draft;
  }
  undo(): void { this.document = this.undoStack.pop()!; }
  save(): void { this.star.baseline(this.document.clone()); }
  read(document: SvgDocument): void { this.document = document; this.undoStack.length = 0; this.star.baseline(document.clone()); }
  /** Marked lines: `svg` for the root, otherwise shape ids. */
  marks(): string[] {
    const lines = [{ document: this.document, id: 'svg' }, ...this.document.all().map(shape => ({ document: this.document, shape, id: shape.id }))];
    return lines.filter(line => this.star.label(line) === '*').map(line => line.id);
  }
}

test('activation registers one instance as both the tree decorator and the session observer', () => {
  const decorators: TreeDecorator[] = []; const observers: SessionObserver[] = [];
  new TreeStarPlugin().activate({
    registerTreeDecorator: (d: TreeDecorator) => decorators.push(d), observeSession: (o: SessionObserver) => observers.push(o),
  } as unknown as PluginContext);
  assert.equal(decorators.length, 1); assert.equal(decorators[0]!.name, 'modified-star'); assert.equal(observers[0], decorators[0]);
});

test('state machine: edit → save → edit again → undo back to the save point', () => {
  const session = new Session(new ModifiedStar());
  assert.deepEqual(session.marks(), [], 'fresh init is clean');
  session.edit(d => { d.create(new Group('g')); d.create(new Leaf('a'), 'g'); });
  assert.deepEqual(session.marks(), ['svg', 'g', 'a'], 'new shapes are marked at once');
  session.save();
  assert.deepEqual(session.marks(), [], 'save clears every mark');
  session.edit(d => d.find('a').set('fill', 'red'));
  assert.deepEqual(session.marks(), ['svg', 'a'], 'only the edited shape and the root, not its container');
  session.undo();
  assert.deepEqual(session.marks(), [], 'undo back to the save point clears the mark (content-based)');
  session.undo();
  assert.deepEqual(session.marks(), ['svg'], 'undo past the save point is dirty again (shapes deleted)');
});

test('content-based: an edit reverted by another edit is clean; a failed save keeps marks', () => {
  const session = new Session(new ModifiedStar());
  session.edit(d => d.create(new Leaf('a'))); session.save();
  session.edit(d => d.find('a').move(5, 0));
  assert.deepEqual(session.marks(), ['svg', 'a']);
  session.edit(d => d.find('a').move(-5, 0));
  assert.deepEqual(session.marks(), []);
  session.edit(d => d.find('a').move(1, 0)); // a save that fails never notifies a baseline
  assert.deepEqual(session.marks(), ['svg', 'a']);
});

test('containers: membership and order changes mark the container, child edits do not; deletions mark the root', () => {
  const session = new Session(new ModifiedStar());
  session.edit(d => { d.create(new Group('g')); d.create(new Group('h')); d.create(new Leaf('a'), 'g'); d.create(new Leaf('b'), 'g'); });
  session.save();
  session.edit(d => d.find('a').move(1, 0));
  assert.deepEqual(session.marks(), ['svg', 'a']);
  session.undo(); session.edit(d => d.reorder('a', true));
  assert.deepEqual(session.marks(), ['svg', 'g']);
  session.undo(); session.edit(d => d.addTo('h', 'a'));
  assert.deepEqual(session.marks(), ['svg', 'g', 'h']);
  session.undo(); session.edit(d => d.delete('b'));
  assert.deepEqual(session.marks(), ['svg', 'g']);
  session.undo(); session.edit(d => d.resize(10, 10));
  assert.deepEqual(session.marks(), ['svg'], 'canvas changes mark only the root');
});

test('read sets a new saved state; separate instances keep separate state', () => {
  const first = new ModifiedStar(); const second = new ModifiedStar();
  const one = new Session(first); const two = new Session(second);
  one.edit(d => d.create(new Leaf('a')));
  assert.deepEqual([one.marks(), two.marks()], [['svg', 'a'], []]);
  const loaded = new SvgDocument(50, 50); loaded.create(new Leaf('z'));
  one.read(loaded);
  assert.deepEqual(one.marks(), []);
  one.edit(d => d.find('z').set('stroke', 'blue'));
  assert.deepEqual(one.marks(), ['svg', 'z']);
});
