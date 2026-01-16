import { ConfigurationSource } from '@stratix/core';
import { readFile } from 'fs/promises';
import { parse } from 'yaml';
import { resolve } from 'path';
import { ConfigurationContentError } from '../errors/ConfigurationContentError.js';
import { ConfigurationLoadError } from '../errors/ConfigurationLoadError.js';

export class YamlConfigurationSource implements ConfigurationSource {
  readonly name: string;

  private filePath: string;
  private basePath: string;
  private encoding: BufferEncoding;

  constructor({
    filePath,
    basePath,
    encoding
  }: {
    filePath: string;
    basePath: string;
    encoding: BufferEncoding;
  }) {
    this.name = `yaml:${filePath}`;
    this.filePath = filePath;
    this.basePath = basePath;
    this.encoding = encoding;
  }

  async load(): Promise<Record<string, unknown>> {
    const fullPath = resolve(this.basePath, this.filePath);

    try {
      const content = await readFile(fullPath, this.encoding);
      const parsed: unknown = parse(content);

      if (typeof parsed !== 'object' || parsed === null) {
        throw new ConfigurationContentError(
          fullPath,
          'YAML content must be a mapping/object at the root level.'
        );
      }

      return parsed as Record<string, unknown>;
    } catch (error) {
      if (error instanceof Error) {
        throw new ConfigurationLoadError(fullPath, error.message);
      }
      throw error;
    }
  }

  async isAvailable(): Promise<boolean> {
    const fullPath = resolve(this.basePath, this.filePath);
    try {
      await readFile(fullPath, this.encoding);
      return true;
    } catch {
      return false;
    }
  }
}
