import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readdirSync, readFileSync } from 'node:fs';
import { basename, dirname, relative, resolve } from 'node:path';
import ts from 'typescript';

// Production code lives in three zones: kernel (packages/kernel), plugins (plugins/*), host (src).
const kernelRoot = 'packages/kernel/src';
const files = [
  ...readdirSync('src', { recursive: true }).map(path => `src/${path}`),
  ...readdirSync(kernelRoot, { recursive: true }).map(path => `${kernelRoot}/${path}`),
  ...readdirSync('plugins').flatMap(plugin => [
    `plugins/${plugin}/index.ts`,
    ...readdirSync(`plugins/${plugin}/src`, { recursive: true }).map(path => `plugins/${plugin}/src/${path}`),
  ]),
].map(String).filter(path => path.endsWith('.ts'));

type Import = { name: string; typeOnly: boolean };
const imports = (file: string): Import[] => {
  const ast = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
  return ast.statements.flatMap(statement => {
    if ((!ts.isImportDeclaration(statement) && !ts.isExportDeclaration(statement)) || !statement.moduleSpecifier
      || !ts.isStringLiteral(statement.moduleSpecifier)) return [];
    const typeOnly = ts.isImportDeclaration(statement) ? Boolean(statement.importClause?.isTypeOnly) : statement.isTypeOnly;
    return [{ name: statement.moduleSpecifier.text, typeOnly }];
  });
};
const target = (file: string, name: string) => relative(resolve('.'), resolve(dirname(file), name));

// Kernel layers, inner to outer; each may import only the listed layers and external modules.
const kernelLayers: Readonly<Record<string, { layers: readonly string[]; external: readonly string[] }>> = {
  domain: { layers: ['domain'], external: [] },
  session: { layers: ['session', 'domain'], external: [] },
  extension: { layers: ['extension', 'session', 'domain'], external: [] },
  registry: { layers: ['registry', 'extension', 'session', 'domain'], external: [] },
  cli: { layers: ['cli', 'registry', 'extension', 'session', 'domain'], external: ['node:readline', 'node:stream'] },
  io: { layers: ['io', 'registry', 'extension', 'session', 'domain'], external: ['node:fs', 'node:path', 'node:crypto', '@xmldom/xmldom'] },
};

test('kernel depends only inward on its own layers and never on plugins or the host', () => {
  for (const file of files.filter(path => path.startsWith(`${kernelRoot}/`))) {
    const inner = file.slice(kernelRoot.length + 1);
    const layer = inner.includes('/') ? inner.split('/')[0]! : undefined; // index.ts / host.ts re-export the kernel
    for (const { name, typeOnly } of imports(file)) {
      if (name.startsWith('.')) {
        const path = target(file, name);
        assert.ok(path.startsWith(`${kernelRoot}/`), `${file} -> ${name} leaves the kernel`);
        const targetLayer = path.slice(kernelRoot.length + 1).split('/')[0]!;
        if (layer) assert.ok(kernelLayers[layer]!.layers.includes(targetLayer), `${file} -> ${name}`);
        if (layer === 'io' && targetLayer === 'session') assert.ok(typeOnly, `${file}: storage port must be type-only`);
      } else {
        assert.ok(layer && kernelLayers[layer]!.external.includes(name), `${file} imports external ${name}`);
      }
    }
  }
});

test('plugins depend only on the public kernel API, never on the host, kernel internals or other plugins', () => {
  for (const file of files.filter(path => path.startsWith('plugins/'))) {
    const plugin = file.split('/').slice(0, 2).join('/');
    for (const { name } of imports(file)) {
      if (name.startsWith('.')) assert.ok(target(file, name).startsWith(`${plugin}/`), `${file} -> ${name} leaves its plugin`);
      else assert.ok(name === '@svgframe/kernel' || name.startsWith('node:'), `${file} imports ${name}`);
    }
  }
});

test('only the composition root names concrete plugins; host and loader use string module names', () => {
  for (const file of files.filter(path => path.startsWith('src/'))) {
    for (const { name } of imports(file)) {
      if (name.startsWith('.')) assert.ok(target(file, name).startsWith('src/'), `${file} -> ${name} leaves the host`);
      else if (name.startsWith('@svgframe/plugin-')) assert.equal(file, 'src/main.ts', `${file} imports plugin ${name}`);
      else assert.ok(['@svgframe/kernel', '@svgframe/kernel/host'].includes(name) || name.startsWith('node:'), `${file} imports ${name}`);
    }
  }
});

test('kernel does not enumerate plugin-provided shape types or command names', () => {
  const manifests = readdirSync('plugins').map(plugin => JSON.parse(readFileSync(`plugins/${plugin}/package.json`, 'utf8')));
  const names = new Set<string>(manifests.flatMap(manifest => [
    ...(manifest.contributes?.shapes ?? []), ...(manifest.contributes?.commands ?? []),
  ]));
  // `g` is the tag of the kernel's own Group (the canvas root); `text` is also a ShapeProvider content kind.
  for (const allowed of ['g', 'text']) names.delete(allowed);
  for (const file of files.filter(path => path.startsWith(`${kernelRoot}/`))) {
    const ast = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
    const visit = (node: ts.Node): void => {
      const methodList = node.parent !== undefined && ts.isArrayLiteralExpression(node.parent) && ts.isCallExpression(node.parent.parent)
        && ts.isPropertyAccessExpression(node.parent.parent.expression) && node.parent.parent.expression.name.text === 'requireMethods';
      if ((ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) && names.has(node.text) && !methodList
        && !ts.isImportDeclaration(node.parent) && !ts.isExportDeclaration(node.parent)) {
        assert.fail(`${file}: kernel names plugin-provided "${node.text}"`);
      }
      ts.forEachChild(node, visit);
    };
    visit(ast);
  }
});

test('production classes have one class per matching file, with no switch dispatch', () => {
  for (const file of files) {
    const ast = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
    const classes = ast.statements.filter(ts.isClassDeclaration);
    assert.ok(classes.length <= 1, file);
    if (classes.length) assert.equal(classes[0]!.name?.text, basename(file, '.ts'));
    assert.ok(!ast.statements.some(ts.isFunctionDeclaration), `${file}: top-level procedural function`);
    const visit = (node: ts.Node): void => {
      assert.ok(!ts.isSwitchStatement(node), `${file}: unexpected switch dispatch`);
      ts.forEachChild(node, visit);
    };
    visit(ast);
  }
});
