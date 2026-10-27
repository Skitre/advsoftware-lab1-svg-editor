import { Group } from './Group.js';
import { Numbers } from './Numbers.js';
import type { Shape } from './Shape.js';

/** Aggregate root: identity uniqueness, ownership, ordering, and cycle checks. */
export class SvgDocument {
  private root = new Group('__canvas__');
  private canvasWidth: number;
  private canvasHeight: number;

  constructor(width = 800, height = 600) {
    this.canvasWidth = Numbers.positive(width, 'canvas width');
    this.canvasHeight = Numbers.positive(height, 'canvas height');
  }
  get width(): number { return this.canvasWidth; }
  get height(): number { return this.canvasHeight; }
  get children(): readonly Shape[] { return this.root.children; }
  get count(): number { return this.all().length; }

  resize(width: number, height: number): void {
    Numbers.positive(width, 'canvas width'); Numbers.positive(height, 'canvas height');
    this.canvasWidth = width; this.canvasHeight = height;
  }

  all(): readonly Shape[] {
    const result: Shape[] = [];
    const pending = [...this.children];
    while (pending.length) {
      const shape = pending.shift()!;
      result.push(shape);
      pending.unshift(...shape.children);
    }
    return result;
  }

  find(id: string): Shape {
    const shape = this.all().find(item => item.id === id);
    if (!shape) throw new Error(`no such shape: ${id}`);
    return shape;
  }

  container(id: string): Group {
    const shape = this.all().find(item => item.id === id);
    if (!shape) throw new Error(`no such container: ${id}`);
    if (!shape.container) throw new Error(`not a container: ${id}`);
    return shape.container;
  }

  parentOf(id: string): Group {
    this.find(id);
    return [this.root, ...this.all().flatMap(shape => shape.container ? [shape.container] : [])]
      .find(parent => parent.children.some(child => child.id === id))!;
  }

  parentLabel(id: string): string {
    const parent = this.parentOf(id);
    return parent === this.root ? 'svg' : parent.label;
  }

  assertAvailable(id: string): void {
    if (this.all().some(shape => shape.id === id)) throw new Error(`id already exists: ${id}`);
  }

  create(shape: Shape, containerId?: string): void {
    const target = containerId === undefined ? this.root : this.container(containerId);
    const pending = [shape];
    const ids = new Set<string>();
    while (pending.length) {
      const child = pending.pop()!;
      this.assertAvailable(child.id);
      if (ids.has(child.id)) throw new Error(`id already exists: ${child.id}`);
      ids.add(child.id); pending.push(...child.children);
    }
    target.insert(shape);
  }

  delete(id: string): Shape {
    const shape = this.find(id);
    this.parentOf(id).remove(shape);
    return shape;
  }

  group(id: string, selectedIds: readonly string[]): Group {
    this.assertAvailable(id);
    if (!selectedIds.length) throw new Error('group requires at least one shape');
    if (new Set(selectedIds).size !== selectedIds.length) throw new Error('duplicate group member');
    const requested = selectedIds.map(member => this.find(member));
    for (const shape of requested) {
      if (requested.some(other => shape.contains(other))) {
        throw new Error(`cannot group a container into its own descendant: ${shape.id}`);
      }
    }
    // Stable document preorder, independent of argument order. Shared parent keeps its slot;
    // selections across parents produce a root-level group at the end.
    const ordered = this.all().filter(shape => requested.includes(shape));
    const parents = ordered.map(shape => this.parentOf(shape.id));
    const sameParent = parents.every(parent => parent === parents[0]);
    const target = sameParent ? parents[0]! : this.root;
    const index = sameParent ? target.children.indexOf(ordered[0]!) : target.children.length;
    const group = new Group(id);
    for (const shape of ordered) { this.parentOf(shape.id).remove(shape); group.insert(shape); }
    target.insert(group, index);
    return group;
  }

  ungroup(id: string): void {
    const group = this.container(id);
    const parent = this.parentOf(id);
    if (parent === this.root) throw new Error(`cannot ungroup top-level container: ${id}`);
    const index = parent.remove(group);
    for (const [offset, child] of group.children.entries()) {
      group.remove(child); parent.insert(child, index + offset);
    }
  }

  addTo(groupId: string, id: string): void {
    const target = this.container(groupId);
    const shape = this.find(id);
    if (shape === target || shape.contains(target)) {
      throw new Error(`cannot move a container into its own descendant: ${id}`);
    }
    this.parentOf(id).remove(shape);
    target.insert(shape);
  }

  reorder(id: string, front: boolean): void {
    const parent = this.parentOf(id);
    const shape = this.find(id);
    parent.remove(shape);
    parent.insert(shape, front ? parent.children.length : 0);
  }

  clone(): SvgDocument {
    const copy = new SvgDocument(this.width, this.height);
    copy.root = this.root.clone();
    return copy;
  }
}
