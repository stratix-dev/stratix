import { readFile } from 'fs/promises';
import { load as yamlLoad } from 'js-yaml';
import { ConfigParseError } from '@stratix/core';

/**
 * Load and parse YAML configuration file
 */
export async function loadYamlFile(filePath: string): Promise<Record<string, unknown>> {
  try {
    const content = await readFile(filePath, 'utf-8');
    const data = yamlLoad(content);

    if (typeof data !== 'object' || data === null) {
      throw new ConfigParseError(`Invalid YAML in ${filePath}: root must be an object`);
    }

    return data as Record<string, unknown>;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new ConfigParseError(`Configuration file not found: ${filePath}`);
    }
    if (error instanceof ConfigParseError) {
      throw error;
    }
    throw new ConfigParseError(
      `Failed to load YAML file: ${filePath}`,
      error as Error
    );
  }
}
