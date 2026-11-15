import type { Diagnostics } from '../../src/host/Diagnostics.js';

export class CollectingDiagnostics implements Diagnostics {
  readonly messages: string[] = [];
  error(message: string): void { this.messages.push(`error: ${message}`); }
}
