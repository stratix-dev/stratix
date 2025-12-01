import { Command } from 'commander';
import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
import path from 'path';
import fs from 'fs-extra';
import { ValidationUtils } from '../utils/validation.js';
import { PackageManagerUtils } from '../utils/package-manager.js';
import { ProjectScaffolder } from '../scaffolding/project-scaffolder.js';
import type { NewCommandOptions } from '../types/index.js';

/**
 * Creates the 'new' command for scaffolding Stratix projects.
 *
 * Supports single-context and multi-context structures with interactive prompts.
 *
 * @returns Command instance
 *
 * @example
 * ```bash
 * stratix new my-app
 * stratix new my-app --pm pnpm --structure multi-context
 * stratix new my-app --no-git --skip-install
 * ```
 */
export function createNewCommand(): Command {
  const command = new Command('new');

  command
    .description('Create a new Stratix project')
    .argument('[project-name]', 'Project name')
    .option('--pm <manager>', 'Package manager (npm, pnpm, yarn)')
    .option('--structure <type>', 'Project structure (single-context, multi-context)', 'single-context')
    .option('--no-git', 'Skip git initialization')
    .option('--skip-install', 'Skip dependency installation')
    .option('--with <extensions>', 'Extensions to install (comma-separated, e.g., http,postgres,validation)')
    .action(
      async (
        projectName?: string,
        options?: NewCommandOptions & { skipInstall?: boolean },
      ): Promise<void> => {
        try {
          console.log(chalk.blue.bold('\nCreate Stratix Project\n'));

          if (!projectName) {
            const answer = await inquirer.prompt<{ name: string }>([
              {
                type: 'input',
                name: 'name',
                message: 'Project name:',
                default: 'my-stratix-app',
                validate: (input: string) => {
                  const result = ValidationUtils.validateProjectName(input);
                  return result.valid || result.error!;
                },
              },
            ]);
            projectName = answer.name;
          }

          const validation = ValidationUtils.validateProjectName(projectName);
          if (!validation.valid) {
            console.error(chalk.red(`\n${validation.error}\n`));
            process.exit(1);
          }

          const projectPath = path.join(process.cwd(), projectName);
          if (await fs.pathExists(projectPath)) {
            console.error(chalk.red(`\nDirectory "${projectName}" already exists!\n`));
            process.exit(1);
          }

          interface NewProjectAnswers {
            packageManager?: 'npm' | 'pnpm' | 'yarn';
            structure?: 'single-context' | 'multi-context';
            git?: boolean;
          }

          const answers = await inquirer.prompt<NewProjectAnswers>([
            {
              type: 'list',
              name: 'packageManager',
              message: 'Package manager:',
              choices: [
                { name: 'pnpm (recommended)', value: 'pnpm' },
                { name: 'npm', value: 'npm' },
                { name: 'yarn', value: 'yarn' },
              ],
              when: !options?.pm,
            },
            {
              type: 'list',
              name: 'structure',
              message: 'Project structure:',
              choices: [
                { name: 'Single Context (single domain)', value: 'single-context' },
                { name: 'Multi Context (multiple domains)', value: 'multi-context' },
              ],
              default: 'single-context',
              when: !options?.structure,
            },
            {
              type: 'confirm',
              name: 'git',
              message: 'Initialize git repository?',
              default: true,
              when: options?.git !== false,
            },
          ]);

          const packageManager = (options?.pm || answers.packageManager || 'npm') as
            | 'npm'
            | 'pnpm'
            | 'yarn';
          const structure = (options?.structure || answers.structure || 'single-context') as 'single-context' | 'multi-context';
          const git = options?.git !== false && answers.git !== false;

          const spinner = ora('Creating project...').start();

          const scaffolder = new ProjectScaffolder({
            projectName,
            packageManager,
            structure,
            git,
          });

          await scaffolder.generate();
          spinner.succeed('Project created!');

          if (!options?.skipInstall) {
            spinner.start('Installing dependencies...');
            await PackageManagerUtils.install(packageManager, projectPath);
            spinner.succeed('Dependencies installed!');
          }

          // Install extensions if --with flag is provided
          if (options?.with) {
            const extensions = options.with.split(',').map(ext => ext.trim());
            const { installExtension } = await import('./add.js');

            for (const ext of extensions) {
              spinner.start(`Installing extension: ${ext}...`);
              try {
                await installExtension(ext, packageManager, projectPath, options?.skipInstall || false);
                spinner.succeed(`Installed extension: ${ext}`);
              } catch (error) {
                spinner.warn(`Failed to install extension: ${ext}`);
                console.error(chalk.yellow(`  ${error instanceof Error ? error.message : String(error)}`));
              }
            }
          }

          console.log(chalk.green.bold('\nYour Stratix project is ready!\n'));
          console.log(chalk.cyan('Next steps:\n'));
          console.log(chalk.white(`  cd ${projectName}`));

          if (options?.skipInstall) {
            console.log(chalk.white(`  ${PackageManagerUtils.getInstallCommand(packageManager)}`));
          }

          console.log(chalk.white(`  ${PackageManagerUtils.getRunCommand(packageManager, 'dev')}\n`));

          if (structure === 'multi-context') {
            console.log(chalk.gray('Generate your first context:\n'));
            console.log(chalk.white('  stratix generate context Product --props \'[{"name":"name","type":"string"},{"name":"price","type":"number"}]\'\n'));
          } else {
            console.log(chalk.gray('Generate your first entity:\n'));
            console.log(chalk.white('  stratix generate entity Product --props \'[{"name":"name","type":"string"},{"name":"price","type":"number"}]\'\n'));
          }

          console.log(chalk.gray('Or explore available generators:\n'));
          console.log(chalk.white('  stratix generate --help\n'));
          console.log(chalk.gray('Happy coding!\n'));

        } catch (error) {
          console.error(chalk.red('\nFailed to create project\n'));
          console.error(error);
          process.exit(1);
        }
      });

  return command;
}
