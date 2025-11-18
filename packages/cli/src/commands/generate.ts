import { Command } from 'commander';
import chalk from 'chalk';
import { EntityGenerator } from '../generators/EntityGenerator.js';
import { ValueObjectGenerator } from '../generators/ValueObjectGenerator.js';
import { CommandGenerator } from '../generators/CommandGenerator.js';
import { QueryGenerator } from '../generators/QueryGenerator.js';
import { ContextGenerator } from '../generators/ContextGenerator.js';
import { RepositoryGenerator } from '../generators/RepositoryGenerator.js';
import { EventHandlerGenerator } from '../generators/EventHandlerGenerator.js';
import { PluginGenerator } from '../generators/PluginGenerator.js';
import type { GenerateCommandOptions } from '../types/index.js';

export function createGenerateCommand(): Command {
  const command = new Command('generate');

  command
    .alias('g')
    .description('Generate code artifacts');

  command
    .command('context <name>')
    .description('Generate a complete bounded context')
    .option('--props <props>', 'Entity properties (e.g., "name:string,price:number")')
    .option('--dry-run', 'Preview generated files without writing')
    .option('--force', 'Overwrite existing files')
    .action(async (name: string, options: GenerateCommandOptions) => {
      try {
        console.log(chalk.blue.bold('\nGenerate Bounded Context\n'));
        
        const generator = new ContextGenerator(name, options);
        await generator.generate();
        
        console.log(chalk.green.bold('\nBounded Context created!\n'));
        console.log(chalk.gray('The context includes:\n'));
        console.log(chalk.white('  - Domain Entity (AggregateRoot)'));
        console.log(chalk.white('  - Repository interface'));
        console.log(chalk.white('  - Domain Events'));
        console.log(chalk.white('  - CRUD Commands + Handlers'));
        console.log(chalk.white('  - Queries (GetById, List) + Handlers'));
        console.log(chalk.white('  - InMemory Repository implementation'));
        console.log(chalk.white('  - Context Plugin (auto-wiring)\n'));
        console.log(chalk.gray(`Next: Register ${name}ContextPlugin in your ApplicationBuilder\n`));
      } catch (error) {
        console.error(chalk.red('\nFailed to generate context\n'));
        console.error(error instanceof Error ? error.message : error);
        process.exit(1);
      }
    });

  command
    .command('entity <name>')
    .description('Generate a domain entity or aggregate root')
    .option('--props <props>', 'Properties (e.g., "name:string,age:number")')
    .option('--context <context>', 'Generate inside a specific bounded context')
    .option('--no-aggregate', 'Generate as Entity instead of AggregateRoot')
    .option('--dry-run', 'Preview generated files without writing')
    .option('--force', 'Overwrite existing files')
    .action(async (name: string, options: GenerateCommandOptions) => {
      try {
        console.log(chalk.blue.bold('\nGenerate Entity\n'));
        
        const generator = new EntityGenerator(name, options);
        await generator.generate();
        
        const contextInfo = options.context ? ` in ${options.context} context` : '';
        console.log(chalk.gray(`\nNext: Import and use ${name}${contextInfo} in your application\n`));
      } catch (error) {
        console.error(chalk.red('\nFailed to generate entity\n'));
        console.error(error instanceof Error ? error.message : error);
        process.exit(1);
      }
    });

  command
    .command('value-object <name>')
    .alias('vo')
    .description('Generate a domain value object')
    .option('--props <props>', 'Properties (e.g., "street:string,city:string")')
    .option('--context <context>', 'Generate inside a specific bounded context')
    .option('--dry-run', 'Preview generated files without writing')
    .option('--force', 'Overwrite existing files')
    .action(async (name: string, options: GenerateCommandOptions) => {
      try {
        console.log(chalk.blue.bold('\nGenerate Value Object\n'));
        
        const generator = new ValueObjectGenerator(name, options);
        await generator.generate();
        
        const contextInfo = options.context ? ` in ${options.context} context` : '';
        console.log(chalk.gray(`\nNext: Use ${name}${contextInfo} in your entities\n`));
      } catch (error) {
        console.error(chalk.red('\nFailed to generate value object\n'));
        console.error(error instanceof Error ? error.message : error);
        process.exit(1);
      }
    });

  command
    .command('command <name>')
    .description('Generate a CQRS command with handler')
    .option('--input <props>', 'Input properties (e.g., "userId:string,amount:number")')
    .option('--props <props>', 'Alias for --input')
    .option('--context <context>', 'Generate inside a specific bounded context')
    .option('--dry-run', 'Preview generated files without writing')
    .option('--force', 'Overwrite existing files')
    .action(async (name: string, options: GenerateCommandOptions) => {
      try {
        console.log(chalk.blue.bold('\nGenerate Command\n'));
        
        const generator = new CommandGenerator(name, options);
        await generator.generate();
        
        const contextInfo = options.context ? ` in ${options.context} context` : '';
        console.log(chalk.gray(`\nNext: Register ${name}Handler${contextInfo} with your command bus\n`));
      } catch (error) {
        console.error(chalk.red('\nFailed to generate command\n'));
        console.error(error instanceof Error ? error.message : error);
        process.exit(1);
      }
    });

  command
    .command('query <name>')
    .description('Generate a CQRS query with handler')
    .option('--input <props>', 'Input properties (e.g., "id:string")')
    .option('--output <type>', 'Output type (e.g., "Product" or "Product[]")', 'any')
    .option('--props <props>', 'Alias for --input')
    .option('--context <context>', 'Generate inside a specific bounded context')
    .option('--dry-run', 'Preview generated files without writing')
    .option('--force', 'Overwrite existing files')
    .action(async (name: string, options: GenerateCommandOptions) => {
      try {
        console.log(chalk.blue.bold('\nGenerate Query\n'));
        
        const generator = new QueryGenerator(name, options);
        await generator.generate();
        
        const contextInfo = options.context ? ` in ${options.context} context` : '';
        console.log(chalk.gray(`\nNext: Register ${name}Handler${contextInfo} with your query bus\n`));
      } catch (error) {
        console.error(chalk.red('\nFailed to generate query\n'));
        console.error(error instanceof Error ? error.message : error);
        process.exit(1);
      }
    });

  command
    .command('repository <entityName>')
    .alias('repo')
    .description('Generate a repository interface and implementation')
    .option('--no-implementation', 'Generate only the interface')
    .option('--context <context>', 'Generate inside a specific bounded context')
    .option('--dry-run', 'Preview generated files without writing')
    .option('--force', 'Overwrite existing files')
    .action(async (entityName: string, options: GenerateCommandOptions & { implementation?: boolean }) => {
      try {
        console.log(chalk.blue.bold('\nGenerate Repository\n'));
        
        const generator = new RepositoryGenerator({
          entityName,
          withImplementation: options.implementation !== false,
          context: options.context,
        });
        const files = await generator.generate();
        await generator['writeFiles'](files, options.dryRun);
        
        console.log(chalk.green.bold('\nRepository generated!\n'));
        if (options.implementation !== false) {
          console.log(chalk.gray('Generated:\n'));
          console.log(chalk.white('  - Repository interface'));
          console.log(chalk.white('  - InMemory implementation\n'));
        }
        const contextInfo = options.context ? ` in ${options.context} context` : '';
        console.log(chalk.gray(`Next: Inject ${entityName}Repository${contextInfo} in your handlers\n`));
      } catch (error) {
        console.error(chalk.red('\nFailed to generate repository\n'));
        console.error(error instanceof Error ? error.message : error);
        process.exit(1);
      }
    });

  command
    .command('event-handler <eventName>')
    .alias('eh')
    .description('Generate a domain event handler')
    .option('--handler <name>', 'Custom handler name')
    .option('--context <context>', 'Generate inside a specific bounded context')
    .option('--dry-run', 'Preview generated files without writing')
    .option('--force', 'Overwrite existing files')
    .action(async (eventName: string, options: GenerateCommandOptions & { handler?: string }) => {
      try {
        console.log(chalk.blue.bold('\nGenerate Event Handler\n'));
        
        const generator = new EventHandlerGenerator({
          eventName,
          handlerName: options.handler,
          context: options.context,
        });
        const files = await generator.generate();
        await generator['writeFiles'](files, options.dryRun);
        
        console.log(chalk.green.bold('\nEvent Handler generated!\n'));
        const contextInfo = options.context ? ` in ${options.context} context` : '';
        console.log(chalk.gray(`Next: Register handler${contextInfo} with EventBus\n`));
      } catch (error) {
        console.error(chalk.red('\nFailed to generate event handler\n'));
        console.error(error instanceof Error ? error.message : error);
        process.exit(1);
      }
    });

  command
    .command('plugin <name>')
    .description('Generate a custom plugin')
    .option('--no-health-check', 'Generate without health check method')
    .option('--dry-run', 'Preview generated files without writing')
    .option('--force', 'Overwrite existing files')
    .action(async (name: string, options: GenerateCommandOptions & { healthCheck?: boolean }) => {
      try {
        console.log(chalk.blue.bold('\nGenerate Plugin\n'));
        
        const generator = new PluginGenerator({
          pluginName: name,
          withHealthCheck: options.healthCheck !== false,
        });
        const files = await generator.generate();
        await generator['writeFiles'](files, options.dryRun);
        
        console.log(chalk.green.bold('\nPlugin generated!\n'));
        console.log(chalk.gray(`Next: Use .usePlugin(new ${name}Plugin()) in ApplicationBuilder\n`));
      } catch (error) {
        console.error(chalk.red('\nFailed to generate plugin\n'));
        console.error(error instanceof Error ? error.message : error);
        process.exit(1);
      }
    });

  return command;
}
