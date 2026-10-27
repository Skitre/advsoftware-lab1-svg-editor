import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readdirSync, readFileSync } from 'node:fs';
import { basename, dirname, relative, resolve } from 'node:path';
import ts from 'typescript';

const files = readdirSync('src', { recursive: true }).map(String).filter(path => path.endsWith('.ts'));
const allowed: Readonly<Record<string, readonly string[]>> = {
  domain: ['domain'], application: ['application', 'domain'],
  infrastructure: ['infrastructure', 'domain', 'application'], cli: ['cli', 'application', 'domain'],
};

test('module imports obey declared dependency directions and storage depends only on the port', () => {
  for (const file of files) {
    if (file === 'main.ts') continue;
    const layer = file.split('/')[0]!;
    const ast = ts.createSourceFile(file, readFileSync(`src/${file}`, 'utf8'), ts.ScriptTarget.Latest, true);
    for (const statement of ast.statements) {
      if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier)) continue;
      const name = statement.moduleSpecifier.text;
      if (name.startsWith('.')) {
        const target = relative(resolve('src'), resolve('src', dirname(file), name));
        assert.ok(allowed[layer]?.includes(target.split('/')[0]!), `${file} -> ${name}`);
        if (layer === 'infrastructure' && target.startsWith('application/')) {
          assert.equal(target, 'application/DocumentStore.js');
          assert.ok(statement.importClause?.isTypeOnly, 'storage port must be a type-only dependency');
        }
      } else if (layer === 'domain' || layer === 'application') {
        assert.fail(`${file} imports external runtime ${name}`);
      }
    }
  }
});

test('production classes have one class per matching file, with no switch dispatch', () => {
  for (const file of files) {
    const ast = ts.createSourceFile(file, readFileSync(`src/${file}`, 'utf8'), ts.ScriptTarget.Latest, true);
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
