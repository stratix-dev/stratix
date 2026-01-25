import path from 'node:path';
import { ContextScanner } from '../../core/ports/ContextScanner.js';
import { ContextScannerConfig } from '../../core/types/ContextScannerConfig.js';
import { glob } from 'node:fs/promises';

export class GlobContextScanner implements ContextScanner {
  constructor(private readonly config: ContextScannerConfig) {}

  async scan(): Promise<string[]> {
    const files: string[] = [];

    for (const dir of this.config.scanDirs) {
      console.info(`Scanning directory: ${dir}`);
      for await (const entry of glob(this.config.patterns, {
        cwd: dir,
        exclude: this.config.ignore
      })) {
        console.info(`Found file: ${entry}`);
        files.push(path.resolve(dir, entry));
        console.info(`Resolved path: ${path.resolve(dir, entry)}`);
      }
    }

    return files;
  }
}
