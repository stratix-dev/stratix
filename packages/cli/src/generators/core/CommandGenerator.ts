import { z } from 'zod';
import { Generator } from '../../core/Generator.js';
import { HandlebarsTemplate, TemplateEngine, TemplateRegistry, TemplateLoader } from '../../templates/index.js';
import type { GeneratorContext, GeneratorResult, GeneratedFile } from '../../core/types.js';
import { fileSystem } from '../../infrastructure/FileSystem.js';
import { logger } from '../../infrastructure/Logger.js';
import path from 'path';

/**
 * Command generator options schema
 */
const CommandOptionsSchema = z.object({
    name: z.string().min(1, 'Command name is required'),
    props: z.array(z.object({
        name: z.string(),
        type: z.string()
    })).default([]),
    outputDir: z.string().optional().default('src/application/commands'),
    generateHandler: z.boolean().optional().default(true)
});



/**
 * Command generator using Handlebars templates
 * 
 * Generates Command and optionally CommandHandler
 */
export class CommandGenerator extends Generator {
    name = 'command';
    description = 'Generate Command and CommandHandler classes';
    private commandTemplate?: HandlebarsTemplate;
    private handlerTemplate?: HandlebarsTemplate;
    private engine: TemplateEngine;
    private loader: TemplateLoader;

    constructor() {
        super();
        const registry = new TemplateRegistry();
        this.engine = new TemplateEngine(registry);
        this.loader = new TemplateLoader(this.engine);
    }

    /**
     * Initialize generator (load templates)
     */
    async initialize(): Promise<void> {
        this.commandTemplate = await this.loader.loadTemplate(
            'command',
            'command.hbs',
            CommandOptionsSchema
        );

        this.handlerTemplate = await this.loader.loadTemplate(
            'command-handler',
            'command-handler.hbs'
        );
    }

    /**
     * Generate command files
     */
    async generate(context: GeneratorContext): Promise<GeneratorResult> {
        // Ensure templates are loaded
        if (!this.commandTemplate || !this.handlerTemplate) {
            await this.initialize();
        }

        // Validate options
        const options = CommandOptionsSchema.parse(context.options);

        logger.info(`Generating command: ${options.name}`);

        const files: GeneratedFile[] = [];

        // Generate command
        const commandContent = this.commandTemplate!.render({
            name: options.name,
            props: options.props
        });

        const commandPath = path.join(
            options.outputDir,
            `${options.name}.ts`
        );

        files.push({
            path: commandPath,
            content: commandContent,
            action: 'create'
        });

        // Generate handler if requested
        if (options.generateHandler) {
            const handlerContent = this.handlerTemplate!.render({
                name: options.name
            });

            const handlerPath = path.join(
                options.outputDir,
                `${options.name}Handler.ts`
            );

            files.push({
                path: handlerPath,
                content: handlerContent,
                action: 'create'
            });
        }

        logger.info(`Command files will be created in: ${options.outputDir}`);

        return { files };
    }

    /**
     * Rollback command generation
     */
    async rollback(context: GeneratorContext): Promise<void> {
        const options = CommandOptionsSchema.parse(context.options);

        const commandPath = path.join(
            options.outputDir,
            `${options.name}.ts`
        );
        const commandFullPath = path.join(context.projectRoot, commandPath);

        const handlerPath = path.join(
            options.outputDir,
            `${options.name}Handler.ts`
        );
        const handlerFullPath = path.join(context.projectRoot, handlerPath);

        if (await fileSystem.exists(commandFullPath)) {
            await fileSystem.remove(commandFullPath);
            logger.info(`Rolled back: ${commandPath}`);
        }

        if (await fileSystem.exists(handlerFullPath)) {
            await fileSystem.remove(handlerFullPath);
            logger.info(`Rolled back: ${handlerPath}`);
        }
    }
}
