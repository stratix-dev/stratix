import { z } from 'zod';
import { Generator } from '../../core/Generator.js';
import { HandlebarsTemplate, TemplateEngine, TemplateRegistry, TemplateLoader } from '../../templates/index.js';
import type { GeneratorContext, GeneratorResult, GeneratedFile } from '../../core/types.js';
import { fileSystem } from '../../infrastructure/FileSystem.js';
import { logger } from '../../infrastructure/Logger.js';
import path from 'path';

/**
 * Value object generator options schema
 */
const ValueObjectOptionsSchema = z.object({
    name: z.string().min(1, 'Value object name is required'),
    props: z.array(z.object({
        name: z.string(),
        type: z.string()
    })).default([]),
    outputDir: z.string().optional().default('src/domain/value-objects')
});



/**
 * Value object generator using Handlebars templates
 * 
 * Generates ValueObject classes
 */
export class ValueObjectGenerator extends Generator {
    name = 'value-object';
    description = 'Generate ValueObject classes';
    private template?: HandlebarsTemplate;
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
        this.template = await this.loader.loadTemplate(
            'value-object',
            'value-object.hbs',
            ValueObjectOptionsSchema
        );
    }

    /**
     * Generate value object files
     */
    async generate(context: GeneratorContext): Promise<GeneratorResult> {
        // Ensure template is loaded
        if (!this.template) {
            await this.initialize();
        }

        // Validate options
        const options = ValueObjectOptionsSchema.parse(context.options);

        logger.info(`Generating value object: ${options.name}`);

        // Render template
        const content = this.template!.render({
            name: options.name,
            props: options.props
        });

        // Determine output path (relative to project root)
        const relativePath = path.join(
            options.outputDir,
            `${options.name}.ts`
        );

        const files: GeneratedFile[] = [
            {
                path: relativePath,
                content,
                action: 'create'
            }
        ];

        logger.info(`Value object will be created at: ${relativePath}`);

        return { files };
    }

    /**
     * Rollback value object generation
     */
    async rollback(context: GeneratorContext): Promise<void> {
        const options = ValueObjectOptionsSchema.parse(context.options);
        const relativePath = path.join(
            options.outputDir,
            `${options.name}.ts`
        );
        const fullPath = path.join(context.projectRoot, relativePath);

        if (await fileSystem.exists(fullPath)) {
            await fileSystem.remove(fullPath);
            logger.info(`Rolled back: ${relativePath}`);
        }
    }
}
