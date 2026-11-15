import { extensionCategories } from '@svgframe/kernel/host';
import type { ExtensionCategory } from '@svgframe/kernel/host';

/** Registration names per extension category, as declared in `contributes` or actually registered. */
export class Contributions {
  private constructor(private readonly names: ReadonlyMap<ExtensionCategory, ReadonlySet<string>>) {}

  static of(entries: Iterable<readonly [ExtensionCategory, string]>): Contributions {
    const names = new Map<ExtensionCategory, Set<string>>(extensionCategories.map(category => [category, new Set<string>()]));
    for (const [category, name] of entries) names.get(category)!.add(name);
    return new Contributions(names);
  }

  /** Parses a manifest `contributes` value; missing categories are empty, anything else is invalid. */
  static parse(value: unknown): Contributions {
    if (value === undefined) return Contributions.of([]);
    if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new Error('contributes must be an object');
    const entries: [ExtensionCategory, string][] = [];
    for (const [key, list] of Object.entries(value)) {
      const category = extensionCategories.find(item => item === key);
      if (!category) throw new Error(`unknown contributes category: ${key}`);
      if (!Array.isArray(list) || list.some(name => typeof name !== 'string')) throw new Error(`contributes.${key} must list names`);
      for (const name of list as string[]) entries.push([category, name]);
    }
    return Contributions.of(entries);
  }

  equals(other: Contributions): boolean { return this.format() === other.format(); }

  /** e.g. `shapes=[box] attributes=[box-attributes]`, categories in kernel order, names sorted. */
  format(): string {
    const parts = extensionCategories
      .map(category => [category, [...this.names.get(category)!].sort()] as const)
      .filter(([, names]) => names.length)
      .map(([category, names]) => `${category}=[${names.join(' ')}]`);
    return parts.length ? parts.join(' ') : 'none';
  }
}
