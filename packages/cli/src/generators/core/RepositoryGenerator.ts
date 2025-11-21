import { z } from 'zod';
import { Generator } from '../../core/Generator.js';
import { HandlebarsTemplate, TemplateEngine, TemplateRegistry, TemplateLoader } from '../../templates/index.js';
import type { GeneratorContext, GeneratorResult, GeneratedFile } from '../../core/types.js';
import { fileSystem } from '../../infrastructure/FileSystem.js';
import { logger } from '../../infrastructure/Logger.js';
import path from 'path';

/**
 * Repository generator options schema
 */
const RepositoryOptionsSchema = z.object({
    entityName: z.string().min(1, 'Entity name is required'),
    outputDir: z.string().optional().default('src/domain/repositories'),
    implOutputDir: z.string().optional().default('src/infrastructure/repositories'),
    generateImpl: z.boolean().optional().default(true)
});



/**
 * Repository generator using Handlebars templates
 * 
 * Generates Repository interface and optionally InMemory implementation
 */
export class RepositoryGenerator extends Generator {
    name = 'repository';
    description = 'Generate Repository interface and InMemory implementation';
    private interfaceTemplate?: HandlebarsTemplate;
    private implTemplate?: HandlebarsTemplate;
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
        this.interfaceTemplate = await this.loader.loadTemplate(
            'repository',
            'repository.hbs',
            RepositoryOptionsSchema
        );

        this.implTemplate = await this.loader.loadTemplate(
            'repository-impl',
            'repository-impl.hbs'
        );
    }

    /**
     * Generate repository files
     */
    async generate(context: GeneratorContext): Promise<GeneratorResult> {
        // Ensure templates are loaded
        if (!this.interfaceTemplate || !this.implTemplate) {
            await this.initialize();
        }

        // Validate options
        const options = RepositoryOptionsSchema.parse(context.options);

        const files: GeneratedFile[] = [];

        // Check if entity exists
        const entityPath = path.join(context.projectRoot, 'src/domain/entities', `${options.entityName}.ts`);
        const entityExists = await fileSystem.exists(entityPath);

        if (!entityExists) {
            logger.warn(`Entity ${options.entityName} does not exist. Creating it first...`);

            // Load entity generator
            const { EntityGenerator } = await import('./EntityGenerator.js');
            const entityGenerator = new EntityGenerator();
            await entityGenerator.initialize();

            // Generate entity with basic structure
            const entityResult = await entityGenerator.generate({
                projectRoot: context.projectRoot,
                options: {
                    name: options.entityName,
                    props: [],
                    aggregate: true
                }
            });

            // Add entity files to the result
            files.push(...entityResult.files);
        }

        logger.info(`Generating repository for: ${options.entityName}`);

        // Generate interface
        const interfaceContent = this.interfaceTemplate!.render({
            entityName: options.entityName
        });

        const interfacePath = path.join(
            options.outputDir,
            `${options.entityName}Repository.ts`
        );

        files.push({
            path: interfacePath,
            content: interfaceContent,
            action: 'create'
        });

        // Generate implementation if requested
        if (options.generateImpl) {
            const implContent = this.implTemplate!.render({
                entityName: options.entityName
            });

            const implPath = path.join(
                options.implOutputDir,
                `InMemory${options.entityName}Repository.ts`
            );

            files.push({
                path: implPath,
                content: implContent,
                action: 'create'
            });
        }

        logger.info(`Repository files will be created`);

        return { files };
    }

    /**
     * Rollback repository generation
     */
    async rollback(context: GeneratorContext): Promise<void> {
        const options = RepositoryOptionsSchema.parse(context.options);

        const interfacePath = path.join(
            options.outputDir,
            `${options.entityName}Repository.ts`
        );
        const interfaceFullPath = path.join(context.projectRoot, interfacePath);

        const implPath = path.join(
            options.implOutputDir,
            `InMemory${options.entityName}Repository.ts`
        );
        const implFullPath = path.join(context.projectRoot, implPath);

        if (await fileSystem.exists(interfaceFullPath)) {
            await fileSystem.remove(interfaceFullPath);
            logger.info(`Rolled back: ${interfacePath}`);
        }

        if (await fileSystem.exists(implFullPath)) {
            await fileSystem.remove(implFullPath);
            logger.info(`Rolled back: ${implPath}`);
        }
    }
}
