import path from 'path';
import { BaseGenerator } from './BaseGenerator.js';
import type { GeneratedFile } from '../types/index.js';
import { generatePlugin } from './templates/plugin-template.js';

export interface PluginGeneratorOptions {
  pluginName: string;
  withHealthCheck?: boolean;
  projectRoot?: string;
}

export class PluginGenerator extends BaseGenerator {
  constructor(private options: PluginGeneratorOptions) {
    super(options.projectRoot);
  }

  async generate(): Promise<GeneratedFile[]> {
    const { pluginName, withHealthCheck = true } = this.options;
    const pluginPascal = this.naming.toPascalCase(pluginName);
    const pluginKebab = this.naming.toKebabCase(pluginName);

    await Promise.resolve();

    return [
      {
        path: path.join(this.projectRoot, `src/plugins/${pluginPascal}Plugin.ts`),
        content: generatePlugin(pluginPascal, pluginKebab, withHealthCheck),
        action: 'create',
      },
    ];
  }
}
