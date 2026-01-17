import { resolve } from 'node:path';
import { YamlConfigurationSource } from '../config/index.js';

export const APP_DEFAULTS = {
  name: 'Stratix Application',
  version: '1.0.0',
  configuration: {
    sources: [YamlConfigurationSource],
    configFile: resolve(process.cwd(), 'stratix.config.yml'),
    envPrefix: 'APP_'
  },
  di: {
    injectionMode: 'PROXY',
    strict: true
  },
  contexts: []
};
