import { z } from 'zod';
import { Generator } from '../../core/Generator.js';
import type { GeneratorContext, GeneratorResult, GeneratedFile } from '../../core/types.js';
import { fileSystem } from '../../infrastructure/FileSystem.js';
import { logger } from '../../infrastructure/Logger.js';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Quality generator options schema
 */
const QualityOptionsSchema = z.object({
    prettier: z.boolean().optional().default(true),
    eslint: z.boolean().optional().default(true),
    editorconfig: z.boolean().optional().default(true),
    gitignore: z.boolean().optional().default(true)
});

/**
 * Quality configuration generator
 * 
 * Generates quality configuration files for projects
 */
export class QualityGenerator extends Generator {
    name = 'quality';
    description = 'Generate quality configuration files (Prettier, ESLint, EditorConfig)';

    async initialize(): Promise<void> {
        // No templates needed - we copy files directly
    }

    async generate(context: GeneratorContext): Promise<GeneratorResult> {
        const options = QualityOptionsSchema.parse(context.options);

        logger.info('Generating quality configuration files...');

        const files: GeneratedFile[] = [];
        const templatesDir = path.join(__dirname, '../../templates/quality');

        // Prettier
        if (options.prettier) {
            const prettierContent = await fileSystem.readFile(
                path.join(templatesDir, '.prettierrc.json')
            );
            files.push({
                path: '.prettierrc.json',
                content: prettierContent,
                action: 'create'
            });
        }

        // ESLint
        if (options.eslint) {
            const eslintContent = await fileSystem.readFile(
                path.join(templatesDir, '.eslintrc.json')
            );
            files.push({
                path: '.eslintrc.json',
                content: eslintContent,
                action: 'create'
            });
        }

        // EditorConfig
        if (options.editorconfig) {
            const editorconfigContent = await fileSystem.readFile(
                path.join(templatesDir, '.editorconfig')
            );
            files.push({
                path: '.editorconfig',
                content: editorconfigContent,
                action: 'create'
            });
        }

        // Gitignore
        if (options.gitignore) {
            const gitignoreContent = await fileSystem.readFile(
                path.join(templatesDir, '.gitignore')
            );
            files.push({
                path: '.gitignore',
                content: gitignoreContent,
                action: 'create'
            });
        }

        logger.info(`Generated ${files.length} quality configuration files`);

        return { files };
    }

    async rollback(context: GeneratorContext): Promise<void> {
        const options = QualityOptionsSchema.parse(context.options);

        const filesToRemove = [
            options.prettier && '.prettierrc.json',
            options.eslint && '.eslintrc.json',
            options.editorconfig && '.editorconfig',
            options.gitignore && '.gitignore'
        ].filter(Boolean) as string[];

        for (const file of filesToRemove) {
            const filePath = path.join(context.projectRoot, file);
            if (await fileSystem.exists(filePath)) {
                await fileSystem.remove(filePath);
                logger.info(`Rolled back: ${filePath}`);
            }
        }
    }
}
