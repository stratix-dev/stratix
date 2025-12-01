import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { execSync } from 'child_process';
import { existsSync } from 'fs';

interface ExtensionInfo {
  package: string;
  description: string;
  dependencies?: string[];
}

const EXTENSIONS: Record<string, ExtensionInfo> = {
  postgres: {
    package: '@stratix/db-postgres',
    description: 'PostgreSQL database integration',
    dependencies: ['pg', '@types/pg'],
  },
  mongodb: {
    package: '@stratix/db-mongodb',
    description: 'MongoDB database integration',
    dependencies: ['mongodb'],
  },
  redis: {
    package: '@stratix/db-redis',
    description: 'Redis caching and session store',
    dependencies: ['redis'],
  },
  rabbitmq: {
    package: '@stratix/msg-rabbitmq',
    description: 'RabbitMQ message broker',
    dependencies: ['amqplib', '@types/amqplib'],
  },
  http: {
    package: '@stratix/http-fastify',
    description: 'Fastify HTTP server',
    dependencies: ['fastify'],
  },
  validation: {
    package: '@stratix/validation-zod',
    description: 'Zod-based validation',
    dependencies: ['zod'],
  },
  auth: {
    package: '@stratix/auth',
    description: 'JWT authentication and RBAC',
    dependencies: ['jsonwebtoken', 'bcrypt', '@types/jsonwebtoken', '@types/bcrypt'],
  },
  mappers: {
    package: '@stratix/mappers',
    description: 'Entity to DTO mapping utilities',
  },
  opentelemetry: {
    package: '@stratix/obs-opentelemetry',
    description: 'OpenTelemetry observability',
    dependencies: ['@opentelemetry/api', '@opentelemetry/sdk-node'],
  },
  'ai-openai': {
    package: '@stratix/ai-openai',
    description: 'OpenAI LLM provider',
    dependencies: ['openai'],
  },
  'ai-anthropic': {
    package: '@stratix/ai-anthropic',
    description: 'Anthropic Claude provider',
    dependencies: ['@anthropic-ai/sdk'],
  },
  'config-env': {
    package: '@stratix/config-env',
    description: 'Environment variable configuration provider',
    dependencies: ['dotenv'],
  },
  'config-file': {
    package: '@stratix/config-file',
    description: 'File-based configuration provider (JSON/YAML)',
    dependencies: ['js-yaml', 'chokidar'],
  },
  'config-composite': {
    package: '@stratix/config-composite',
    description: 'Composite configuration provider (multiple sources)',
  },
};

function detectPackageManager(): string {
  if (existsSync('pnpm-lock.yaml')) return 'pnpm';
  if (existsSync('yarn.lock')) return 'yarn';
  if (existsSync('package-lock.json')) return 'npm';
  return 'npm';
}

function getInstallCommand(pm: string, packages: string[]): string {
  const pkgList = packages.join(' ');
  switch (pm) {
    case 'pnpm':
      return `pnpm add ${pkgList} --registry https://registry.npmjs.org`;
    case 'yarn':
      return `yarn add ${pkgList} --registry https://registry.npmjs.org`;
    default:
      return `npm install ${pkgList} --registry https://registry.npmjs.org`;
  }
}

function showConfigNextSteps(extensionName: string, packageName: string): void {
  console.log(chalk.gray('\nNext steps:\n'));

  switch (extensionName) {
    case 'config-env':
      console.log(chalk.white('  1. Create a .env file in your project root:'));
      console.log(chalk.gray('     APP_PORT=3000'));
      console.log(chalk.gray('     APP_HOST=localhost'));
      console.log(chalk.gray('     APP_DATABASE__URL=postgresql://localhost:5432/mydb\n'));

      console.log(chalk.white(`  2. Import and use ${packageName}:`));
      console.log(chalk.gray(`     import { EnvConfigProvider } from '${packageName}';`));
      console.log(chalk.gray(`     const config = new EnvConfigProvider({ prefix: 'APP_' });\n`));

      console.log(chalk.white('  3. Add to ApplicationBuilder:'));
      console.log(chalk.gray('     await ApplicationBuilder.create()'));
      console.log(chalk.gray('       .useConfig(config)'));
      console.log(chalk.gray('       .build();\n'));

      console.log(chalk.cyan('  Documentation: https://stratix.dev/docs/configuration/env-provider\n'));
      break;

    case 'config-file':
      console.log(chalk.white('  1. Create a config directory and files:'));
      console.log(chalk.gray('     mkdir -p config'));
      console.log(chalk.gray('     echo \'{"server": {"port": 3000}}\' > config/default.json\n'));

      console.log(chalk.white(`  2. Import and use ${packageName}:`));
      console.log(chalk.gray(`     import { FileConfigProvider } from '${packageName}';`));
      console.log(chalk.gray(`     const config = new FileConfigProvider({`));
      console.log(chalk.gray(`       files: ['./config/default.json'],`));
      console.log(chalk.gray(`     });\n`));

      console.log(chalk.white('  3. Add to ApplicationBuilder:'));
      console.log(chalk.gray('     await ApplicationBuilder.create()'));
      console.log(chalk.gray('       .useConfig(config)'));
      console.log(chalk.gray('       .build();\n'));

      console.log(chalk.cyan('  Documentation: https://stratix.dev/docs/configuration/file-provider\n'));
      break;

    case 'config-composite':
      console.log(chalk.white('  1. Install other config providers first:'));
      console.log(chalk.gray('     stratix add config-env'));
      console.log(chalk.gray('     stratix add config-file\n'));

      console.log(chalk.white(`  2. Import and use ${packageName}:`));
      console.log(chalk.gray(`     import { CompositeConfigProvider } from '${packageName}';`));
      console.log(chalk.gray(`     import { EnvConfigProvider } from '@stratix/config-env';`));
      console.log(chalk.gray(`     import { FileConfigProvider } from '@stratix/config-file';`));
      console.log(chalk.gray(`     `));
      console.log(chalk.gray(`     const config = new CompositeConfigProvider({`));
      console.log(chalk.gray(`       providers: [`));
      console.log(chalk.gray(`         new EnvConfigProvider({ prefix: 'APP_' }),`));
      console.log(chalk.gray(`         new FileConfigProvider({ files: ['./config/default.json'] }),`));
      console.log(chalk.gray(`       ],`));
      console.log(chalk.gray(`       strategy: 'first-wins',`));
      console.log(chalk.gray(`     });\n`));

      console.log(chalk.white('  3. Add to ApplicationBuilder:'));
      console.log(chalk.gray('     await ApplicationBuilder.create()'));
      console.log(chalk.gray('       .useConfig(config)'));
      console.log(chalk.gray('       .build();\n'));

      console.log(chalk.cyan('  Documentation: https://stratix.dev/docs/configuration/composite-provider\n'));
      break;
  }
}

/**
 * Creates the 'add' command for installing Stratix extensions.
 *
 * Installs plugins with their dependencies automatically.
 *
 * @returns Command instance
 *
 * @example
 * ```bash
 * stratix add postgres
 * stratix add http
 * stratix add config-env
 * stratix add config-file
 * stratix add ai-openai
 * stratix add list
 * ```
 */
export function createAddCommand(): Command {
  const command = new Command('add');

  command
    .description('Add Stratix extensions to your project')
    .argument('<extension>', 'Extension name (e.g., postgres, redis, http)')
    .option('--dev', 'Install as dev dependency')
    .action((extensionName: string, options: { dev?: boolean }) => {
      const extension = EXTENSIONS[extensionName];

      if (!extension) {
        console.error(chalk.red(`\nUnknown extension: ${extensionName}\n`));
        console.log(chalk.gray('Available extensions:\n'));
        Object.entries(EXTENSIONS).forEach(([name, info]) => {
          console.log(chalk.white(`  ${name.padEnd(15)} - ${info.description}`));
        });
        console.log();
        process.exit(1);
      }

      const spinner = ora(
        `Installing ${chalk.cyan(extension.package)}...`
      ).start();

      try {
        const pm = detectPackageManager();
        const packages = [extension.package];

        if (extension.dependencies) {
          packages.push(...extension.dependencies);
        }

        const installCmd = getInstallCommand(pm, packages);
        const devFlag = options.dev ? ' --save-dev' : '';

        execSync(`${installCmd}${devFlag}`, {
          stdio: 'inherit',
          cwd: process.cwd(),
        });

        spinner.succeed(
          chalk.green(`Installed ${chalk.cyan(extension.package)}`)
        );

        // Show specific next steps based on extension type
        if (extensionName.startsWith('config-')) {
          showConfigNextSteps(extensionName, extension.package);
        } else {
          console.log(chalk.gray('\nNext steps:\n'));
          console.log(
            chalk.white(`  1. Import the plugin in your main file`)
          );
          console.log(
            chalk.white(`  2. Add to ApplicationBuilder with .usePlugin()`)
          );
          console.log(
            chalk.white(
              `  3. Configure plugin options (see documentation)\n`
            )
          );
        }
      } catch (error) {
        spinner.fail(chalk.red('Installation failed'));
        console.error(error instanceof Error ? error.message : error);
        process.exit(1);
      }
    });

  command
    .command('list')
    .alias('ls')
    .description('List all available Stratix extensions')
    .action(() => {
      console.log(chalk.blue.bold('\nAvailable Stratix Extensions\n'));

      console.log(chalk.yellow.bold('Production Extensions:'));
      ['http', 'validation', 'mappers', 'auth'].forEach(
        (name) => {
          const ext = EXTENSIONS[name];
          console.log(
            chalk.white(`  ${name.padEnd(15)} - ${ext.description}`)
          );
        }
      );

      console.log(chalk.yellow.bold('\nData & Infrastructure:'));
      ['postgres', 'mongodb', 'redis', 'rabbitmq', 'opentelemetry'].forEach(
        (name) => {
          const ext = EXTENSIONS[name];
          console.log(
            chalk.white(`  ${name.padEnd(15)} - ${ext.description}`)
          );
        }
      );

      console.log(chalk.yellow.bold('\nConfiguration:'));
      ['config-env', 'config-file', 'config-composite'].forEach((name) => {
        const ext = EXTENSIONS[name];
        console.log(
          chalk.white(`  ${name.padEnd(20)} - ${ext.description}`)
        );
      });

      console.log(chalk.yellow.bold('\nAI Providers:'));
      ['ai-openai', 'ai-anthropic'].forEach((name) => {
        const ext = EXTENSIONS[name];
        console.log(
          chalk.white(`  ${name.padEnd(20)} - ${ext.description}`)
        );
      });

      console.log(
        chalk.gray('\nUsage: stratix add <extension>\n')
      );
    });

  return command;
}
