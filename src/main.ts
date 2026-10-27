import { EditorSession } from './application/EditorSession.js';
import { CommandFactory } from './cli/CommandFactory.js';
import { Repl } from './cli/Repl.js';
import { FileDocumentStore } from './infrastructure/FileDocumentStore.js';

const session = new EditorSession(new FileDocumentStore());
const interactive = Boolean(process.stdin.isTTY && process.stdout.isTTY);
const success = await new Repl(new CommandFactory(session)).run(process.stdin, process.stdout, process.stderr, interactive);
if (!success && !interactive) process.exitCode = 1;
