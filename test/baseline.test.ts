import assert from 'node:assert/strict';
import { test } from 'node:test';
import { TranscriptRunner } from './support/TranscriptRunner.js';

// Expected results were generated from the `final` tag by scripts/generate-baseline.sh and must
// stay byte-identical while the CLI is refactored into a plugin framework.
const runner = new TranscriptRunner();
const sessions = ['cli-1', 'cli-2-flowchart', 'cli-3-regression'];

for (const session of sessions) {
  test(`Phase 1 baseline is byte-identical to final: ${session}`, () => {
    const expected = runner.expected(session);
    const actual = runner.run(session);
    assert.equal(actual.output.toString('utf8'), expected.output.toString('utf8'));
    assert.ok(actual.output.equals(expected.output), 'output bytes differ');
    assert.equal(actual.status, expected.status, 'exit status');
    assert.deepEqual([...actual.files.keys()].sort(), [...expected.files.keys()].sort(), 'created files');
    for (const [name, content] of expected.files) {
      assert.ok(actual.files.get(name)?.equals(content), `saved file differs: ${name}`);
    }
  });
}
