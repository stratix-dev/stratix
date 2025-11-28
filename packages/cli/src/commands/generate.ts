import { Command } from 'commander';
import chalk from 'chalk';
import { generatorRegistry } from '../core/GeneratorRegistry.js';
import type { GeneratorContext } from '../core/types.js';
import { fileWriter } from '../utils/FileWriter.js';

/**
 * Creates the 'generate' command for generating code artifacts.
 *
 * Supports entity, value-object, command, query, repository, context, and quality generators.
 *
 * @returns Command instance
 *
 * @example
 * ```bash
 * stratix generate entity Product --props '[{"name":"name","type":"string"}]'
 * stratix g command CreateOrder --props '[{"name":"userId","type":"string"}]'
 * stratix g query GetUserById --props '[{"name":"id","type":"string"}]' --return-type User
 * stratix g repository Product
 * stratix g context Billing
 * stratix g quality
 * stratix g list
 * ```
 */
export function createGenerateCommand(): Command {
  const command = new Command('generate');

  command
    .alias('g')
    .description('Generate code artifacts using v2 generators');

  // Entity generator
  command
    .command('entity <name>')
    .description('Generate a domain entity or aggregate root')
    .option('--props <props>', 'Properties as JSON array: [{"name":"id","type":"string"}]')
    .option('--aggregate', 'Generate as AggregateRoot (default: true)', true)
    .option('--dry-run', 'Preview generated files without writing')
    .option('--force', 'Overwrite existing files')
    .action(async (name: string, options: any) => {
      try {
        console.log(chalk.blue.bold('\n🔨 Generate Entity\n'));

        const generator = await generatorRegistry.get('entity');
        if (!generator) {
          throw new Error('Entity generator not found');
        }

        const props = options.props ? JSON.parse(options.props) : [];

        const context: GeneratorContext = {
          projectRoot: process.cwd(),
          options: {
            name,
            props,
            aggregate: options.aggregate
          }
        };

        const result = await generator.generate(context);

        // Write files
        await fileWriter.writeFiles(result.files, context.projectRoot, {
          dryRun: options.dryRun,
          force: options.force
        });

        if (!options.dryRun) {
          console.log(chalk.green.bold('\n✅ Entity generated successfully!\n'));
        }
      } catch (error) {
        console.error(chalk.red('\n❌ Failed to generate entity\n'));
        console.error(error instanceof Error ? error.message : error);
        process.exit(1);
      }
    });

  // Value Object generator
  command
    .command('value-object <name>')
    .alias('vo')
    .description('Generate a domain value object')
    .option('--props <props>', 'Properties as JSON array: [{"name":"value","type":"string"}]')
    .option('--dry-run', 'Preview generated files without writing')
    .action(async (name: string, options: any) => {
      try {
        console.log(chalk.blue.bold('\nGenerate Value Object\n'));

        const generator = await generatorRegistry.get('value-object');
        if (!generator) {
          throw new Error('Value Object generator not found');
        }

        const props = options.props ? JSON.parse(options.props) : [];

        const context: GeneratorContext = {
          projectRoot: process.cwd(),
          options: { name, props }
        };

        const result = await generator.generate(context);

        // Write files
        await fileWriter.writeFiles(result.files, context.projectRoot, {
          dryRun: options.dryRun,
          force: options.force
        });

        if (!options.dryRun) {
          console.log(chalk.green.bold('\nValue Object generated!\n'));
        } else {
          console.log(chalk.yellow.bold('\nDry run - no files written\n'));
          result.files.forEach(f => console.log(chalk.gray(`  ${f.path}`)));
        }
      } catch (error) {
        console.error(chalk.red('\nFailed to generate value object\n'));
        console.error(error instanceof Error ? error.message : error);
        process.exit(1);
      }
    });

  // Command generator
  command
    .command('command <name>')
    .description('Generate a CQRS command with handler')
    .option('--props <props>', 'Properties as JSON array: [{"name":"userId","type":"string"}]')
    .option('--no-handler', 'Skip handler generation')
    .option('--dry-run', 'Preview generated files without writing')
    .action(async (name: string, options: any) => {
      try {
        console.log(chalk.blue.bold('\nGenerate Command\n'));

        const generator = await generatorRegistry.get('command');
        if (!generator) {
          throw new Error('Command generator not found');
        }

        const props = options.props ? JSON.parse(options.props) : [];

        const context: GeneratorContext = {
          projectRoot: process.cwd(),
          options: {
            name,
            props,
            generateHandler: options.handler !== false
          }
        };

        const result = await generator.generate(context);

        // Write files
        await fileWriter.writeFiles(result.files, context.projectRoot, {
          dryRun: options.dryRun,
          force: options.force
        });

        if (!options.dryRun) {
          console.log(chalk.green.bold('\nCommand generated!\n'));
        } else {
          console.log(chalk.yellow.bold('\nDry run - no files written\n'));
          result.files.forEach(f => console.log(chalk.gray(`  ${f.path}`)));
        }
      } catch (error) {
        console.error(chalk.red('\nFailed to generate command\n'));
        console.error(error instanceof Error ? error.message : error);
        process.exit(1);
      }
    });

  // Query generator
  command
    .command('query <name>')
    .description('Generate a CQRS query with handler')
    .option('--props <props>', 'Properties as JSON array: [{"name":"id","type":"string"}]')
    .option('--return-type <type>', 'Return type for the query', 'any')
    .option('--no-handler', 'Skip handler generation')
    .option('--dry-run', 'Preview generated files without writing')
    .action(async (name: string, options: any) => {
      try {
        console.log(chalk.blue.bold('\nGenerate Query\n'));

        const generator = await generatorRegistry.get('query');
        if (!generator) {
          throw new Error('Query generator not found');
        }

        const props = options.props ? JSON.parse(options.props) : [];

        const context: GeneratorContext = {
          projectRoot: process.cwd(),
          options: {
            name,
            props,
            output: options.returnType,
            generateHandler: options.handler !== false
          }
        };

        const result = await generator.generate(context);

        // Write files
        await fileWriter.writeFiles(result.files, context.projectRoot, {
          dryRun: options.dryRun,
          force: options.force
        });

        if (!options.dryRun) {
          console.log(chalk.green.bold('\nQuery generated!\n'));
        } else {
          console.log(chalk.yellow.bold('\nDry run - no files written\n'));
          result.files.forEach(f => console.log(chalk.gray(`  ${f.path}`)));
        }
      } catch (error) {
        console.error(chalk.red('\nFailed to generate query\n'));
        console.error(error instanceof Error ? error.message : error);
        process.exit(1);
      }
    });

  // Repository generator
  command
    .command('repository <entityName>')
    .alias('repo')
    .description('Generate a repository interface and implementation')
    .option('--no-implementation', 'Skip implementation generation')
    .option('--dry-run', 'Preview generated files without writing')
    .action(async (entityName: string, options: any) => {
      try {
        console.log(chalk.blue.bold('\nGenerate Repository\n'));

        const generator = await generatorRegistry.get('repository');
        if (!generator) {
          throw new Error('Repository generator not found');
        }

        const context: GeneratorContext = {
          projectRoot: process.cwd(),
          options: {
            entityName,
            generateImpl: options.implementation !== false
          }
        };

        const result = await generator.generate(context);

        // Write files
        await fileWriter.writeFiles(result.files, context.projectRoot, {
          dryRun: options.dryRun,
          force: options.force
        });

        if (!options.dryRun) {
          console.log(chalk.green.bold('\nRepository generated!\n'));
        } else {
          console.log(chalk.yellow.bold('\nDry run - no files written\n'));
          result.files.forEach(f => console.log(chalk.gray(`  ${f.path}`)));
        }
      } catch (error) {
        console.error(chalk.red('\nFailed to generate repository\n'));
        console.error(error instanceof Error ? error.message : error);
        process.exit(1);
      }
    });

  // Quality generator
  command
    .command('quality')
    .description('Generate quality configuration files (Prettier, ESLint, EditorConfig)')
    .option('--no-prettier', 'Skip Prettier config')
    .option('--no-eslint', 'Skip ESLint config')
    .option('--no-editorconfig', 'Skip EditorConfig')
    .option('--no-gitignore', 'Skip .gitignore')
    .option('--dry-run', 'Preview generated files without writing')
    .action(async (options: any) => {
      try {
        console.log(chalk.blue.bold('\nGenerate Quality Configs\n'));

        const generator = await generatorRegistry.get('quality');
        if (!generator) {
          throw new Error('Quality generator not found');
        }

        const context: GeneratorContext = {
          projectRoot: process.cwd(),
          options: {
            prettier: options.prettier !== false,
            eslint: options.eslint !== false,
            editorconfig: options.editorconfig !== false,
            gitignore: options.gitignore !== false
          }
        };

        const result = await generator.generate(context);

        // Write files
        await fileWriter.writeFiles(result.files, context.projectRoot, {
          dryRun: options.dryRun,
          force: options.force
        });

        if (!options.dryRun) {
          console.log(chalk.green.bold('\nQuality configs generated!\n'));
        } else {
          console.log(chalk.yellow.bold('\nDry run - no files written\n'));
          result.files.forEach(f => console.log(chalk.gray(`  ${f.path}`)));
        }
      } catch (error) {
        console.error(chalk.red('\nFailed to generate quality configs\n'));
        console.error(error instanceof Error ? error.message : error);
        process.exit(1);
      }
    });

  // Context generator
  command
    .command('context <name>')
    .description('Generate a complete context with domain, application, and infrastructure layers')
    .option('--props <props>', 'Properties as JSON array: [{"name":"name","type":"string"}]')
    .option('--dry-run', 'Preview generated files without writing')
    .action(async (name: string, options: any) => {
      try {
        console.log(chalk.blue.bold('\nGenerate Context\n'));

        const generator = await generatorRegistry.get('context');
        if (!generator) {
          throw new Error('Context generator not found');
        }

        const props = options.props ? JSON.parse(options.props) : [];

        const context: GeneratorContext = {
          projectRoot: process.cwd(),
          options: {
            name,
            props
          }
        };

        const result = await generator.generate(context);

        // Write files
        await fileWriter.writeFiles(result.files, context.projectRoot, {
          dryRun: options.dryRun,
          force: options.force
        });

        if (!options.dryRun) {
          console.log(chalk.green.bold('\nContext generated!\n'));
        } else {
          console.log(chalk.yellow.bold('\nDry run - no files written\n'));
          result.files.forEach(f => console.log(chalk.gray(`  ${f.path}`)));
        }
      } catch (error) {
        console.error(chalk.red('\nFailed to generate context\n'));
        console.error(error instanceof Error ? error.message : error);
        process.exit(1);
      }
    });

  // List available generators
  command
    .command('list')
    .description('List all available generators')
    .action(() => {
      console.log(chalk.blue.bold('\nAvailable Generators:\n'));
      const generators = generatorRegistry.list();
      generators.forEach(gen => {
        console.log(chalk.white(`  ${gen.name.padEnd(15)} - ${gen.description}`));
      });
      console.log();
    });

  return command;
}
