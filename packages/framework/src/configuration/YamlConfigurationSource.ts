import { ConfigurationSource } from '@stratix/core';
import { YamlSourceOptions } from './YamlSourceOptions.js';
import { readFile } from 'fs/promises';
import { parse } from 'yaml';
import { resolve } from 'path';

export class YamlConfigurationSource implements ConfigurationSource {
  readonly name: string;
  private readonly options: Required<YamlSourceOptions>;

  constructor(options: YamlSourceOptions) {
    this.name = `yaml:${options.filePath}`;
    this.options = {
      filePath: options.filePath,
      basePath: options.basePath ?? process.cwd(),
      encoding: options.encoding ?? 'utf-8'
    };
  }

  async load(): Promise<Record<string, unknown>> {
    const fullPath = resolve(this.options.basePath, this.options.filePath);

    try {
      const content = await readFile(fullPath, this.options.encoding);
      const parsed = parse(content);

      if (typeof parsed !== 'object' || parsed === null) {
        throw new Error(
          `Invalid YAML content in ${fullPath}: expected object, got ${typeof parsed}`
        );
      }

      return parsed as Record<string, unknown>;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to load YAML from ${fullPath}: ${error.message}`);
      }
      throw error;
    }
  }

  async isAvailable(): Promise<boolean> {
    const fullPath = resolve(this.options.basePath, this.options.filePath);
    try {
      await readFile(fullPath, this.options.encoding);
      return true;
    } catch {
      return false;
    }
  }
}
