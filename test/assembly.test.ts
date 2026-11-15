import assert from 'node:assert/strict';
import { test } from 'node:test';
import { resolve } from 'node:path';
import { TranscriptRunner } from './support/TranscriptRunner.js';

// phase_cli_2 §6: the same session under method A (code assembly, no arguments) and method B
// (`--config plugins.config.json`) must produce byte-identical output with the same plugin set,
// order and options, initial files and working directory. Plugin sessions must also match the
// recorded, reviewed expectation in doc/transcript/expected/.
const runner = new TranscriptRunner();
const methodB = ['--config', resolve('plugins.config.json')];
const sessions = ['cli-1', 'cli-2-flowchart', 'cli-3-regression', 'cli-4-commands'];
const recorded = ['cli-4-commands'];

for (const session of sessions) {
  test(`method A and method B are byte-identical: ${session}`, () => {
    const a = runner.run(session);
    const b = runner.run(session, methodB);
    assert.equal(b.output.toString('utf8'), a.output.toString('utf8'));
    assert.ok(a.output.equals(b.output), 'output bytes differ');
    assert.equal(a.status, b.status);
    assert.deepEqual([...a.files.keys()].sort(), [...b.files.keys()].sort());
    for (const [name, content] of a.files) assert.ok(b.files.get(name)?.equals(content), `saved file differs: ${name}`);
    if (recorded.includes(session)) {
      const expected = runner.expected(session);
      assert.equal(a.output.toString('utf8'), expected.output.toString('utf8'));
      assert.equal(a.status, expected.status);
    }
  });
}
