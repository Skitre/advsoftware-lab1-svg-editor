import type { Writable } from 'node:stream';
import type { Diagnostics } from './Diagnostics.js';

export class StreamDiagnostics implements Diagnostics {
  constructor(private readonly stream: Writable) {}
  error(message: string): void { this.stream.write(`error: ${message.replace(/[\r\n]+/g, ' ')}\n`); }
}
