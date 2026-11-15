import assert from 'node:assert/strict';
import { test } from 'node:test';
import { resolve } from 'node:path';
import { TranscriptRunner } from './support/TranscriptRunner.js';

// Expected results were generated from the `final` tag by scripts/generate-baseline.sh and must
// stay byte-identical while the CLI is refactored into a plugin framework. "Built-in only" means
// every optional plugin is disabled: method B with an empty plugin list. Method A (no arguments)
// is compared too while the code assembly contains no optional plugins.
const runner = new TranscriptRunner();
const sessions = ['cli-1', 'cli-2-flowchart', 'cli-3-regression'];
const modes: Readonly<Record<string, readonly string[]>> = {
  'built-in only (--config builtin-only.config.json)': ['--config', resolve('doc/transcript/builtin-only.config.json')],
  'code assembly (no arguments)': [],
};

for (const [mode, args] of Object.entries(modes)) {
  for (const session of sessions) {
    test(`Phase 1 baseline is byte-identical to final: ${session}, ${mode}`, () => {
      const expected = runner.expected(session);
      const actual = runner.run(session, args);
      assert.equal(actual.output.toString('utf8'), expected.output.toString('utf8'));
      assert.ok(actual.output.equals(expected.output), 'output bytes differ');
      assert.equal(actual.status, expected.status, 'exit status');
      assert.deepEqual([...actual.files.keys()].sort(), [...expected.files.keys()].sort(), 'created files');
      for (const [name, content] of expected.files) {
        assert.ok(actual.files.get(name)?.equals(content), `saved file differs: ${name}`);
      }
    });
  }
}

test('startup problems are reported with error: lines and the editor still starts with built-ins', () => {
  const missing = runner.run('cli-2-flowchart', ['--config', resolve('doc/transcript/does-not-exist.json')]);
  const expected = runner.expected('cli-2-flowchart').output.toString('utf8');
  assert.equal(missing.output.toString('utf8'), `error: invalid plugin config\n${expected}`);
  assert.equal(missing.status, 0);
  const usage = runner.run('cli-2-flowchart', ['--bogus']);
  assert.equal(usage.output.toString('utf8'), 'error: usage: svg-editor [--config <plugins.config.json>]\n');
  assert.equal(usage.status, 2);
});
