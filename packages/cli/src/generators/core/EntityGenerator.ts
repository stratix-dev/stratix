import { z } from 'zod';
import { Generator } from '../../core/Generator.js';
import { HandlebarsTemplate, TemplateEngine, TemplateRegistry, TemplateLoader } from '../../templates/index.js';
import type { GeneratorContext, GeneratorResult, GeneratedFile } from '../../core/types.js';
import { fileSystem } from '../../infrastructure/FileSystem.js';
import { logger } from '../../infrastructure/Logger.js';
import path from 'path';

/**
 * Entity generator options schema
 */
const EntityOptionsSchema = z.object({
    name: z.string().min(1, 'Entity name is required'),
    aggregate: z.boolean().optional().default(false),
    props: z.array(z.object({
        name: z.string(),
        type: z.string()
    })).optional().default([]),
    outputDir: z.string().optional().default('src/domain/entities')
});



/**
 * Entity generator using Handlebars templates
 * 
 * Generates Entity or AggregateRoot classes with properties
 */
export class EntityGenerator extends Generator {
    name = 'entity';
    description = 'Generate Entity or AggregateRoot classes with properties';
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
            'entity',
            'entity.hbs',
            EntityOptionsSchema
        );
    }

    /**
     * Generate entity files
     */
    async generate(context: GeneratorContext): Promise<GeneratorResult> {
        // Ensure template is loaded
        if (!this.template) {
            await this.initialize();
        }

        // Validate options
        const options = EntityOptionsSchema.parse(context.options);

        logger.info(`Generating ${options.aggregate ? 'aggregate' : 'entity'}: ${options.name}`);

        // Filter out reserved property names that conflict with Entity base class
        const reservedProps = ['id', 'createdAt', 'updatedAt'];
        const filteredProps = options.props.filter(prop => {
            if (reservedProps.includes(prop.name)) {
                logger.warn(`Skipping reserved property '${prop.name}' - this is already provided by Entity base class`);
                return false;
            }
            return true;
        });

        // Render template
        const content = this.template!.render({
            name: options.name,
            aggregate: options.aggregate,
            props: filteredProps
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

        logger.info(`Entity will be created at: ${relativePath}`);

        return { files };
    }

    /**
     * Rollback entity generation
     */
    async rollback(context: GeneratorContext): Promise<void> {
        const options = EntityOptionsSchema.parse(context.options);
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
