import { readFile } from 'fs/promises';
import { ConfigParseError } from '@stratix/core';

/**
 * Load and parse JSON configuration file
 */
export async function loadJsonFile(filePath: string): Promise<Record<string, unknown>> {
  try {
    const content = await readFile(filePath, 'utf-8');
    return JSON.parse(content) as Record<string, unknown>;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new ConfigParseError(`Configuration file not found: ${filePath}`);
    }
    if (error instanceof SyntaxError) {
      throw new ConfigParseError(`Invalid JSON in ${filePath}: ${error.message}`, error);
    }
    throw new ConfigParseError(
      `Failed to load configuration file: ${filePath}`,
      error as Error
    );
  }
}
