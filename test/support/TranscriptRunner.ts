import { spawnSync } from 'node:child_process';
import { closeSync, copyFileSync, mkdtempSync, openSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export type TranscriptResult = {
  output: Buffer;
  status: number;
  /** Files the session created (or changed) in its working directory, keyed by name. */
  files: ReadonlyMap<string, Buffer>;
};

/**
 * Black-box replay of a session file through the real CLI entry point, mirroring
 * `cli [args] < session > out 2>&1` in a fresh working directory seeded with fixtures.
 * stdout and stderr share one file descriptor so their interleaving is byte-exact.
 */
export class TranscriptRunner {
  readonly transcripts = resolve('doc/transcript');
  private readonly entry = resolve('src/main.ts');
  private readonly tsx = fileURLToPath(import.meta.resolve('tsx/cli'));

  sessionPath(name: string): string { return join(this.transcripts, `${name}.txt`); }

  run(session: string, args: readonly string[] = []): TranscriptResult {
    const workdir = mkdtempSync(join(tmpdir(), 'svg-transcript-'));
    const logdir = mkdtempSync(join(tmpdir(), 'svg-transcript-log-'));
    try {
      const fixtures = join(this.transcripts, 'fixtures');
      for (const name of readdirSync(fixtures)) copyFileSync(join(fixtures, name), join(workdir, name));
      const logPath = join(logdir, 'output.txt');
      const log = openSync(logPath, 'w');
      let status: number | null;
      try {
        const result = spawnSync(process.execPath, [this.tsx, this.entry, ...args], {
          cwd: workdir, input: readFileSync(this.sessionPath(session)), stdio: ['pipe', log, log],
        });
        if (result.error) throw result.error;
        status = result.status;
      } finally { closeSync(log); }
      const files = new Map<string, Buffer>();
      for (const name of readdirSync(workdir)) {
        const content = readFileSync(join(workdir, name));
        const fixture = join(fixtures, name);
        let original: Buffer | undefined;
        try { original = readFileSync(fixture); } catch { original = undefined; }
        if (!original?.equals(content)) files.set(name, content);
      }
      return { output: readFileSync(logPath), status: status ?? -1, files };
    } finally {
      rmSync(workdir, { recursive: true, force: true });
      rmSync(logdir, { recursive: true, force: true });
    }
  }

  expected(session: string): TranscriptResult {
    const root = join(this.transcripts, 'expected', session);
    const filesDir = join(root, 'files');
    return {
      output: readFileSync(join(root, 'output.txt')),
      status: Number(readFileSync(join(root, 'status'), 'utf8').trim()),
      files: new Map(readdirSync(filesDir).map(name => [name, readFileSync(join(filesDir, name))])),
    };
  }
}
