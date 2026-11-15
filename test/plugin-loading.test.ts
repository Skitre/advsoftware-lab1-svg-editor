import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import type { Command, PluginContext } from '@svgframe/kernel/host';
import { TestEditor } from './support/TestEditor.js';

const command = (name: string, output = name): Command => ({ name, syntax: name, requiresDocument: false, execute: () => [output] });

// ---- Installer: the shared registration path (used directly by code assembly) ----

test('installer: activate failure is reported and rolls back everything the plugin staged', async () => {
  const editor = await TestEditor.create([{
    module: './half', packageJson: { name: 'half', contributes: { commands: ['half'] } },
    plugin: { activate(context: PluginContext) { context.registerCommand(command('half')); throw new Error('boom'); } },
  }]);
  assert.deepEqual(editor.diagnostics.messages, ['error: plugin failed to activate: half (boom)']);
  assert.throws(() => editor.run('half'), /unknown command: half/);
});

test('installer: duplicate registration rejects the plugin, keeps earlier plugins, and continues', async () => {
  const editor = await TestEditor.create([
    { module: 'a', packageJson: { name: 'a', contributes: { commands: ['hello'] } }, plugin: { activate: (c: PluginContext) => c.registerCommand(command('hello', 'from a')) } },
    { module: 'b', packageJson: { name: 'b', contributes: { commands: ['hello', 'extra'] } },
      plugin: { activate: (c: PluginContext) => { c.registerCommand(command('extra')); c.registerCommand(command('hello', 'from b')); } } },
    { module: 'c', packageJson: { name: 'c', contributes: { commands: ['tree'] } }, plugin: { activate: (c: PluginContext) => c.registerCommand(command('tree')) } },
    { module: 'd', packageJson: { name: 'd', contributes: { commands: ['twice'] } },
      plugin: { activate: (c: PluginContext) => { c.registerCommand(command('twice')); c.registerCommand(command('twice')); } } },
    { module: 'e', packageJson: { name: 'e', contributes: { commands: ['later'] } }, plugin: { activate: (c: PluginContext) => c.registerCommand(command('later')) } },
  ]);
  assert.deepEqual(editor.diagnostics.messages, [
    'error: duplicate registration: commands/hello', 'error: duplicate registration: commands/tree',
    'error: duplicate registration: commands/twice',
  ]);
  assert.deepEqual(editor.run('hello'), ['from a']);
  assert.throws(() => editor.run('extra'), /unknown command: extra/);
  assert.throws(() => editor.run('twice'), /unknown command: twice/);
  assert.deepEqual(editor.run('later'), ['later']);
  editor.run('init'); assert.deepEqual(editor.run('tree'), ['svg (800x600)']);
});

test('installer: contributes must match registrations exactly (categories and names)', async () => {
  const editor = await TestEditor.create([
    { module: 'm', packageJson: { name: 'm', contributes: { commands: ['one'], decorators: ['label'] } },
      plugin: { activate: (c: PluginContext) => { c.registerCommand(command('one')); c.registerCommand(command('two')); } } },
    { module: 'n', packageJson: { name: 'n', contributes: { themes: ['dark'] } }, plugin: { activate: () => undefined } },
  ]);
  assert.deepEqual(editor.diagnostics.messages, [
    'error: plugin manifest mismatch: m (declared: commands=[one] decorators=[label], registered: commands=[one two])',
    'error: plugin manifest mismatch: n (declared: invalid contributes [unknown contributes category: themes], registered: none)',
  ]);
  assert.throws(() => editor.run('one'), /unknown command/);
});

test('installer: invalid registrations and non-plugin exports are activation failures', async () => {
  const editor = await TestEditor.create([
    { module: 'bad-command', packageJson: { name: 'bad-command' }, plugin: { activate: (c: PluginContext) => c.registerCommand({ name: 'x y' } as Command) } },
    { module: 'not-a-plugin', plugin: { start() {} } },
  ]);
  assert.deepEqual(editor.diagnostics.messages, [
    'error: plugin failed to activate: bad-command (commands contract violation: registration name must be a non-empty word)',
    'error: plugin failed to activate: not-a-plugin (default export does not implement activate(context))',
  ]);
});

test('installer: a context kept after activation cannot register anything', async () => {
  let kept: PluginContext | undefined;
  const editor = await TestEditor.create([{ module: 'keeper', packageJson: { name: 'keeper' }, plugin: { activate: (c: PluginContext) => { kept = c; } } }]);
  assert.deepEqual(editor.diagnostics.messages, []);
  assert.throws(() => kept!.registerCommand(command('late')), /plugin context is closed/);
});

// ---- Loader: config assembly from string module names ----

/** Builds a throwaway workspace: config file, plugin packages (plain ESM) and node_modules. */
class Workspace {
  readonly root = mkdtempSync(join(tmpdir(), 'svg-plugins-'));
  file(path: string, content: string): this {
    mkdirSync(dirname(join(this.root, path)), { recursive: true }); writeFileSync(join(this.root, path), content); return this;
  }
  plugin(dir: string, name: string, contributes: object, source: string): this {
    return this.file(`${dir}/package.json`, JSON.stringify({ name, type: 'module', main: './index.mjs', contributes }))
      .file(`${dir}/index.mjs`, source);
  }
  config(plugins: unknown): string { this.file('conf/plugins.config.json', JSON.stringify({ plugins })); return join(this.root, 'conf/plugins.config.json'); }
  remove(): void { rmSync(this.root, { recursive: true, force: true }); }
}
const commandPlugin = (name: string, body = `[${JSON.stringify(name)}]`) =>
  `export default new (class { activate(c) { c.registerCommand({ name: ${JSON.stringify(name)}, syntax: ${JSON.stringify(name)}, requiresDocument: false, execute: () => ${body} }); } })();`;

test('loader: the four failure kinds are reported in config order and loading continues', async () => {
  const ws = new Workspace()
    .plugin('conf/plugins/ok', 'ok', { commands: ['ok'] }, commandPlugin('ok'))
    .plugin('conf/plugins/named', 'named', {}, 'export const plugin = {};')
    .plugin('conf/plugins/liar', 'liar', { commands: ['said'] }, commandPlugin('did'))
    .plugin('conf/plugins/thrower', 'thrower', {}, 'export default { activate() { throw new Error("nope"); } };')
    .plugin('conf/plugins/broken-dep', 'broken-dep', {}, 'import "svgframe-dependency-that-does-not-exist"; export default {};')
    .plugin('conf/plugins/eval-error', 'eval-error', {}, 'throw new Error("bad module");')
    .plugin('conf/plugins/last', 'last', { commands: ['last'] }, commandPlugin('last'));
  try {
    const editor = await TestEditor.create();
    await editor.app.loader.load(ws.config([
      { module: './plugins/missing' }, { module: '@svgframe/plugin-not-installed' }, { module: './plugins/named' },
      { module: './plugins/liar' }, { module: './plugins/thrower' }, { module: './plugins/broken-dep' },
      { module: './plugins/eval-error' }, { module: './plugins/ok' }, { module: './plugins/last' },
    ]));
    const messages = editor.diagnostics.messages;
    assert.deepEqual(messages.slice(0, 5), [
      'error: plugin not found: ./plugins/missing', 'error: plugin not found: @svgframe/plugin-not-installed',
      'error: plugin has no default export: ./plugins/named',
      'error: plugin manifest mismatch: liar (declared: commands=[said], registered: commands=[did])',
      'error: plugin failed to activate: thrower (nope)',
    ]);
    assert.match(messages[5]!, /^error: plugin failed to load: \.\/plugins\/broken-dep \(.*svgframe-dependency-that-does-not-exist/);
    assert.equal(messages[6], 'error: plugin failed to load: ./plugins/eval-error (bad module)');
    assert.equal(messages.length, 7);
    assert.deepEqual([editor.run('ok'), editor.run('last')], [['ok'], ['last']]);
    assert.throws(() => editor.run('did'), /unknown command/);
  } finally { ws.remove(); }
});

test('loader: enabled:false is skipped, options reach the plugin, packages resolve from the config directory', async () => {
  const ws = new Workspace()
    .plugin('conf/node_modules/@svgframe/plugin-echo', '@svgframe/plugin-echo', { commands: ['echo'] },
      'export default new (class { activate(c) { const text = c.options.text; c.registerCommand({ name: "echo", syntax: "echo", requiresDocument: false, execute: () => [String(text)] }); } })();')
    .plugin('conf/plugins/off', 'off', { commands: ['off'] }, commandPlugin('off'));
  try {
    const editor = await TestEditor.create();
    await editor.app.loader.load(ws.config([
      { module: './plugins/off', enabled: false }, { module: './plugins/does-not-exist', enabled: false },
      { module: '@svgframe/plugin-echo', options: { text: 'configured' } },
    ]));
    assert.deepEqual(editor.diagnostics.messages, []);
    assert.deepEqual(editor.run('echo'), ['configured']);
    assert.throws(() => editor.run('off'), /unknown command: off/);
  } finally { ws.remove(); }
});

test('loader: plugins activate in config order (visible in help and decorator order)', async () => {
  const decorator = (name: string) =>
    `export default { activate(c) { c.registerTreeDecorator({ name: ${JSON.stringify(name)}, label: () => ${JSON.stringify(name)} }); } };`;
  const ws = new Workspace()
    .plugin('conf/plugins/z', 'z', { decorators: ['z'] }, decorator('z'))
    .plugin('conf/plugins/a', 'a', { decorators: ['a'] }, decorator('a'));
  try {
    const editor = await TestEditor.create();
    await editor.app.loader.load(ws.config([{ module: './plugins/z' }, { module: './plugins/a' }]));
    editor.run('init');
    assert.deepEqual(editor.run('tree'), ['svg (800x600) z a']);
  } finally { ws.remove(); }
});

test('loader: invalid config (syntax, structure, unreadable) reports once and keeps built-ins', async () => {
  const ws = new Workspace().file('bad-json.json', '{ "plugins": [').file('bad-shape.json', '{ "plugins": [{ "module": 3 }] }')
    .file('extra-key.json', '{ "plugins": [], "x": 1 }').file('bad-options.json', '{ "plugins": [{ "module": "./p", "options": [] }] }');
  try {
    for (const name of ['bad-json.json', 'bad-shape.json', 'extra-key.json', 'bad-options.json', 'missing.json']) {
      const editor = await TestEditor.create();
      await editor.app.loader.load(join(ws.root, name));
      assert.deepEqual(editor.diagnostics.messages, ['error: invalid plugin config'], name);
      editor.run('init'); assert.deepEqual(editor.run('tree'), ['svg (800x600)'], name);
    }
  } finally { ws.remove(); }
});
