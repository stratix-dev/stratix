import { z } from 'zod';
import { Generator } from '../../core/Generator.js';
import { HandlebarsTemplate, TemplateEngine, TemplateRegistry, TemplateLoader } from '../../templates/index.js';
import type { GeneratorContext, GeneratorResult, GeneratedFile } from '../../core/types.js';
import { fileSystem } from '../../infrastructure/FileSystem.js';
import { logger } from '../../infrastructure/Logger.js';
import path from 'path';

/**
 * Query generator options schema
 */
const QueryOptionsSchema = z.object({
    name: z.string().min(1, 'Query name is required'),
    props: z.array(z.object({
        name: z.string(),
        type: z.string()
    })).default([]),
    output: z.string().default('any'),
    outputDir: z.string().optional().default('src/application/queries'),
    entityDir: z.string().optional().default('src/domain/entities'),
    ensureEntity: z.boolean().optional().default(true),
    generateHandler: z.boolean().optional().default(true)
});



/**
 * Query generator using Handlebars templates
 * 
 * Generates Query and optionally QueryHandler
 */
export class QueryGenerator extends Generator {
    name = 'query';
    description = 'Generate Query and QueryHandler classes';
    private queryTemplate?: HandlebarsTemplate;
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
        this.queryTemplate = await this.loader.loadTemplate(
            'query',
            'query.hbs',
            QueryOptionsSchema
        );

        this.handlerTemplate = await this.loader.loadTemplate(
            'query-handler',
            'query-handler.hbs'
        );
    }

    /**
     * Generate query files
     */
    async generate(context: GeneratorContext): Promise<GeneratorResult> {
        // Ensure templates are loaded
        if (!this.queryTemplate || !this.handlerTemplate) {
            await this.initialize();
        }

        // Validate options
        const options = QueryOptionsSchema.parse(context.options);

        logger.info(`Generating query: ${options.name}`);

        const files: GeneratedFile[] = [];

        // Check if entity exists (if output is not 'any')
        if (options.output !== 'any' && options.ensureEntity) {
            const entityPath = path.join(context.projectRoot, options.entityDir, `${options.output}.ts`);
            const entityExists = await fileSystem.exists(entityPath);

            if (!entityExists) {
                logger.warn(`Entity ${options.output} does not exist. Creating it first...`);

                // Load entity generator
                const { EntityGenerator } = await import('./EntityGenerator.js');
                const entityGenerator = new EntityGenerator();
                await entityGenerator.initialize();

                // Generate entity with basic structure
                const entityResult = await entityGenerator.generate({
                    projectRoot: context.projectRoot,
                    options: {
                        name: options.output,
                        props: [],
                        aggregate: true
                    }
                });

                // Add entity files to the result
                files.push(...entityResult.files);
            }
        }

        // Generate query
        const queryContent = this.queryTemplate!.render({
            name: options.name,
            props: options.props,
            output: options.output
        });

        const queryPath = path.join(
            options.outputDir,
            `${options.name}.ts`
        );

        files.push({
            path: queryPath,
            content: queryContent,
            action: 'create'
        });

        // Generate handler if requested
        if (options.generateHandler) {
            const handlerContent = this.handlerTemplate!.render({
                name: options.name,
                output: options.output
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

        logger.info(`Query files will be created in: ${options.outputDir}`);

        return { files };
    }

    /**
     * Rollback query generation
     */
    async rollback(context: GeneratorContext): Promise<void> {
        const options = QueryOptionsSchema.parse(context.options);

        const queryPath = path.join(
            options.outputDir,
            `${options.name}.ts`
        );
        const queryFullPath = path.join(context.projectRoot, queryPath);

        const handlerPath = path.join(
            options.outputDir,
            `${options.name}Handler.ts`
        );
        const handlerFullPath = path.join(context.projectRoot, handlerPath);

        if (await fileSystem.exists(queryFullPath)) {
            await fileSystem.remove(queryFullPath);
            logger.info(`Rolled back: ${queryPath}`);
        }

        if (await fileSystem.exists(handlerFullPath)) {
            await fileSystem.remove(handlerFullPath);
            logger.info(`Rolled back: ${handlerPath}`);
        }
    }
}
