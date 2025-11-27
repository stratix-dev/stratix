import { Command } from 'commander';
import { createNewCommand } from './commands/new.js';
import { createGenerateCommand } from './commands/generate.js';
import { createAddCommand } from './commands/add.js';
import { createInfoCommand } from './commands/info.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageJson = JSON.parse(readFileSync(join(__dirname, '../package.json'), 'utf-8'));

const program = new Command();

program
  .name('stratix')
  .description('Stratix CLI - Build scalable applications with hexagonal architecture')
  .version(packageJson.version);

program.addCommand(createNewCommand());
program.addCommand(createGenerateCommand());
program.addCommand(createAddCommand());
program.addCommand(createInfoCommand());

program.parse(process.argv);

export { defineConfig } from './config/config-schema.js';
export type { StratixConfig } from './config/config-schema.js';
