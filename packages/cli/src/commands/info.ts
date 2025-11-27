import { Command } from 'commander';
import chalk from 'chalk';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

interface PackageJson {
  name?: string;
  version?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

function readPackageJson(): PackageJson | null {
  const pkgPath = join(process.cwd(), 'package.json');
  if (!existsSync(pkgPath)) {
    return null;
  }
  try {
    return JSON.parse(readFileSync(pkgPath, 'utf-8')) as PackageJson;
  } catch {
    return null;
  }
}

function getStratixPackages(pkg: PackageJson): string[] {
  const packages: string[] = [];
  const allDeps = {
    ...pkg.dependencies,
    ...pkg.devDependencies,
  };

  Object.keys(allDeps).forEach((name) => {
    if (name.startsWith('@stratix/')) {
      packages.push(`${name}@${allDeps[name]}`);
    }
  });

  return packages.sort();
}

function detectPackageManager(): string {
  if (existsSync('pnpm-lock.yaml')) return 'pnpm';
  if (existsSync('yarn.lock')) return 'yarn';
  if (existsSync('package-lock.json')) return 'npm';
  return 'unknown';
}

function detectProjectStructure(): string {
  if (existsSync('src/contexts')) {
    return 'Multi-Context';
  }
  if (existsSync('src/domain')) {
    return 'Single-Context';
  }
  return 'Custom';
}

export function createInfoCommand(): Command {
  const command = new Command('info');

  command
    .description('Display project information')
    .action(() => {
      const pkg = readPackageJson();

      if (!pkg) {
        console.error(chalk.red('\nNo package.json found\n'));
        process.exit(1);
      }

      console.log(chalk.blue.bold('\nProject Information\n'));

      console.log(chalk.yellow('Project:'));
      console.log(chalk.white(`  Name:    ${pkg.name || 'N/A'}`));
      console.log(chalk.white(`  Version: ${pkg.version || 'N/A'}`));
      console.log();

      console.log(chalk.yellow('Environment:'));
      console.log(
        chalk.white(`  Package Manager: ${detectPackageManager()}`)
      );
      console.log(
        chalk.white(`  Project Structure: ${detectProjectStructure()}`)
      );
      console.log(chalk.white(`  Node Version: ${process.version}`));
      console.log();

      const stratixPackages = getStratixPackages(pkg);

      if (stratixPackages.length > 0) {
        console.log(chalk.yellow('Stratix Packages:'));
        stratixPackages.forEach((pkg) => {
          console.log(chalk.white(`  ${pkg}`));
        });
        console.log();
      } else {
        console.log(
          chalk.gray('No Stratix packages installed\n')
        );
      }

      console.log(chalk.yellow('Quick Commands:'));
      console.log(chalk.white('  stratix g context <name>    - Generate context'));
      console.log(chalk.white('  stratix g entity <name>     - Generate entity'));
      console.log(chalk.white('  stratix add <extension>     - Install extension'));
      console.log(chalk.white('  stratix add list            - List available extensions'));
      console.log();
    });

  return command;
}
