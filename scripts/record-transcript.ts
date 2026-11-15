// Records the expected result of a plugin session (output, exit status, created files) by running
// the current working tree with code assembly (method A). Review the recorded output before committing;
// tests then require method A and method B to reproduce it byte for byte.
// Usage: npx tsx scripts/record-transcript.ts <session> [cli args...]
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { TranscriptRunner } from '../test/support/TranscriptRunner.js';

const [session, ...args] = process.argv.slice(2);
if (!session) throw new Error('usage: record-transcript.ts <session> [cli args...]');
const runner = new TranscriptRunner();
const result = runner.run(session, args);
const target = join(runner.transcripts, 'expected', session);
rmSync(target, { recursive: true, force: true });
mkdirSync(join(target, 'files'), { recursive: true });
writeFileSync(join(target, 'output.txt'), result.output);
writeFileSync(join(target, 'status'), `${result.status}\n`);
for (const [name, content] of result.files) writeFileSync(join(target, 'files', name), content);
console.log(`recorded ${session}: status ${result.status}, ${result.files.size} file(s)`);
