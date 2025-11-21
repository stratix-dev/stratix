import { fileSystem } from '../infrastructure/FileSystem.js';
import { logger } from '../infrastructure/Logger.js';
import type { GeneratedFile } from '../core/types.js';
import path from 'path';
import chalk from 'chalk';

/**
 * File writer utility for generators
 * Handles writing generated files to disk
 */
export class FileWriter {
    /**
     * Write generated files to disk
     */
    async writeFiles(
        files: GeneratedFile[],
        projectRoot: string,
        options: {
            dryRun?: boolean;
            force?: boolean;
        } = {}
    ): Promise<void> {
        const { dryRun = false, force = false } = options;

        if (dryRun) {
            logger.info('Dry run - no files will be written');
            this.logFiles(files, projectRoot);
            return;
        }

        for (const file of files) {
            const fullPath = path.join(projectRoot, file.path);

            // Check if file exists
            const exists = await fileSystem.exists(fullPath);

            if (exists && !force) {
                logger.warn(`File already exists: ${file.path} (use --force to overwrite)`);
                continue;
            }

            // Write file
            await fileSystem.writeFile(fullPath, file.content);

            const action = exists ? 'Updated' : 'Created';
            console.log(chalk.green(`  ${action}: ${file.path}`));
        }
    }

    /**
     * Log files that would be created (for dry run)
     */
    private logFiles(files: GeneratedFile[], projectRoot: string): void {
        console.log(chalk.yellow('\nFiles that would be created:\n'));
        for (const file of files) {
            const fullPath = path.join(projectRoot, file.path);
            console.log(chalk.gray(`  ${file.path}`));
            console.log(chalk.dim(`    → ${fullPath}`));
        }
        console.log();
    }

    /**
     * Delete files (for rollback)
     */
    async deleteFiles(files: GeneratedFile[], projectRoot: string): Promise<void> {
        for (const file of files) {
            const fullPath = path.join(projectRoot, file.path);
            const exists = await fileSystem.exists(fullPath);

            if (exists) {
                await fileSystem.remove(fullPath);
                logger.info(`Deleted: ${file.path}`);
            }
        }
    }
}

/**
 * Singleton instance
 */
export const fileWriter = new FileWriter();
