/** Where the host reports startup problems; each message is printed as `error: <message>`. */
export interface Diagnostics {
  error(message: string): void;
}
