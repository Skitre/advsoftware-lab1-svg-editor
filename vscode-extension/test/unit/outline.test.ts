import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { SvgElementNode } from '../../src/core/SvgElementNode';
import { SvgOutlineParser } from '../../src/core/SvgOutlineParser';
import { SvgFileFilter } from '../../src/core/SvgFileFilter';

const parser = new SvgOutlineParser();
/** Outline as VSCode would label it: `tag#id` or `tag`, children indented. */
const outline = (text: string): string[] | undefined => {
  const roots = parser.parse(text);
  const lines = (nodes: readonly SvgElementNode[], depth: number): string[] =>
    nodes.flatMap(node => [`${'  '.repeat(depth)}${node.id === undefined ? node.tag : `${node.tag}#${node.id}`}`, ...lines(node.children, depth + 1)]);
  return roots && lines(roots, 0);
};
const example = readFileSync(join(__dirname, '../../../examples/example.svg'), 'utf8');

test('nested groups, containers and leaves; elements without id show only the tag', () => {
  assert.deepEqual(outline(example), [
    'svg', '  rect#start', '  text', '  g#flowchart', '    g#n1', '      rect#n1-rect', '      text#n1-label',
    '    line#arrow1', '    defs', '      path',
  ]);
});

test('offsets locate the element (range) and its tag name (selection), e.g. rect#start on line 3', () => {
  const rect = parser.parse(example)![0]!.children[0]!;
  const line = (offset: number) => example.slice(0, offset).split('\n').length;
  assert.equal(line(rect.start), 3);
  assert.equal(example.slice(rect.start, rect.end), '<rect id="start" x="120" y="100" width="160" height="60" fill="#4a90d9"/>');
  assert.equal(example.slice(rect.nameStart, rect.nameEnd), 'rect');
  const group = parser.parse(example)![0]!.children[2]!;
  assert.ok(example.slice(group.start, group.end).startsWith('<g id="flowchart">') && example.slice(group.start, group.end).endsWith('</g>'));
});

test('edit update: parsing the edited text reflects inserted, renamed and removed elements', () => {
  const edited = example.replace('<text x="155"', '<circle id="new" r="3"/>\n  <text id="title" x="155"').replace('<line id="arrow1"', '<line id="arrow2"')
    .replace(/<defs>.*<\/defs>/, '');
  assert.deepEqual(outline(edited), [
    'svg', '  rect#start', '  circle#new', '  text#title', '  g#flowchart', '    g#n1', '      rect#n1-rect', '      text#n1-label', '    line#arrow2',
  ]);
});

test('incomplete or malformed XML yields no outline instead of throwing', () => {
  const broken = readFileSync(join(__dirname, '../../../examples/broken.svg'), 'utf8');
  for (const text of [broken, '<svg><g id="a"></svg>', '<svg><rec', '<svg><rect id="x', '<svg><rect id=x/></svg>',
    '<svg><!-- open comment', '<svg></g>', '</svg>', '<svg><rect id="a"id="b"/></svg>', '<svg><text>a < b</text></svg>',
    example.slice(0, example.length / 2)]) {
    assert.doesNotThrow(() => parser.parse(text));
    assert.equal(parser.parse(text), undefined, text);
  }
  assert.deepEqual(parser.parse(''), []);
});

test('markup that is not an element is skipped: prolog, doctype subset, comments, CDATA, PIs; ids are decoded', () => {
  const text = '<?xml version="1.0"?>\n<!DOCTYPE svg [<!ENTITY a "<g>">]>\n<!-- <rect id="no"/> -->\n<svg id="a&amp;b">'
    + '<![CDATA[<rect id="no"/>]]><?pi <x/>?><g id=\'q\' class="x>y"><text id="&#x4e2d;&#25991;">t</text></g></svg>';
  assert.deepEqual(outline(text), ['svg#a&b', '  g#q', '    text#中文']);
});

test('only regular files named *.svg (any case) get the badge', () => {
  const filter = new SvgFileFilter();
  assert.deepEqual([['a.svg', true], ['A.SVG', true], ['folder.svg', false], ['notes.txt', true], ['svg', true], ['a.svg.txt', true]]
    .map(([path, isFile]) => filter.isSvgFile(path as string, isFile as boolean)), [true, true, false, false, false, false]);
});
