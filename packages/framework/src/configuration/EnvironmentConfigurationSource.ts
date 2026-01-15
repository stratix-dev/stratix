import { ConfigurationSource } from '@stratix/core';

export interface EnvironmentSourceOptions {
  prefix?: string;
  separator?: string;
  lowercase?: boolean;
}

export class EnvironmentConfigurationSource implements ConfigurationSource {
  readonly name = 'environment';
  private readonly options: Required<EnvironmentSourceOptions>;

  constructor(options: EnvironmentSourceOptions = {}) {
    this.options = {
      prefix: options.prefix ?? '',
      separator: options.separator ?? '__',
      lowercase: options.lowercase ?? true
    };
  }

  async load(): Promise<Record<string, unknown>> {
    const config: Record<string, unknown> = {};
    const prefix = this.options.prefix;

    for (const [key, value] of Object.entries(process.env)) {
      // Skip if doesn't match prefix
      if (prefix && !key.startsWith(prefix)) {
        continue;
      }

      // Remove prefix
      let configKey = prefix ? key.slice(prefix.length) : key;

      // Convert separator to dots
      configKey = configKey.replace(new RegExp(this.options.separator, 'g'), '.');

      // Lowercase if needed
      if (this.options.lowercase) {
        configKey = configKey.toLowerCase();
      }

      // Set nested value
      this.setNestedValue(config, configKey, value);
    }

    return config;
  }

  async isAvailable(): Promise<boolean> {
    return true; // Environment always available
  }

  private setNestedValue(obj: Record<string, any>, path: string, value: string | undefined): void {
    const keys = path.split('.');
    let current = obj;

    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!(key in current) || typeof current[key] !== 'object') {
        current[key] = {};
      }
      current = current[key];
    }

    const lastKey = keys[keys.length - 1];
    current[lastKey] = this.parseValue(value);
  }

  private parseValue(value: string | undefined): unknown {
    if (value === undefined) return undefined;

    // Boolean
    if (value === 'true') return true;
    if (value === 'false') return false;

    // Number
    if (/^-?\d+$/.test(value)) return parseInt(value, 10);
    if (/^-?\d+\.\d+$/.test(value)) return parseFloat(value);

    // String
    return value;
  }
}
