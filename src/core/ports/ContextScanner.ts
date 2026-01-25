export interface ContextScanner {
  scan(): Promise<string[]>;
}
