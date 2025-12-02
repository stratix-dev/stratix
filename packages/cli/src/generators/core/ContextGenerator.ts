import { z } from 'zod';
import { Generator } from '../../core/Generator.js';
import type { GeneratorContext, GeneratorResult, GeneratedFile } from '../../core/types.js';
import { fileSystem } from '../../infrastructure/FileSystem.js';
import { logger } from '../../infrastructure/Logger.js';
import path from 'path';

/**
 * Context generator options schema
 */
const ContextOptionsSchema = z.object({
    name: z.string().min(1, 'Context name is required'),
    props: z.array(z.object({
        name: z.string(),
        type: z.string()
    })).default([]),
    outputDir: z.string().optional().default('src/contexts'),
    withHttp: z.boolean().optional().default(false)
});

/**
 * Context generator
 *
 * Generates a complete context with entity, repository, commands, and queries
 */
export class ContextGenerator extends Generator {
    name = 'context';
    description = 'Generate a complete context with domain, application, and infrastructure layers';

    /**
     * Initialize generator
     */
    async initialize(): Promise<void> {
        // No templates to load for context generator
        // It composes other generators
    }

    /**
     * Generate context files
     */
    async generate(context: GeneratorContext): Promise<GeneratorResult> {
        // Validate options
        const options = ContextOptionsSchema.parse(context.options);

        logger.info(`Generating context: ${options.name}`);

        const files: GeneratedFile[] = [];
        const contextPath = path.join(options.outputDir, options.name.toLowerCase());

        // Import generators
        const { EntityGenerator } = await import('./EntityGenerator.js');
        const { RepositoryGenerator } = await import('./RepositoryGenerator.js');
        const { CommandGenerator } = await import('./CommandGenerator.js');
        const { QueryGenerator } = await import('./QueryGenerator.js');

        // 1. Generate Entity
        const entityGenerator = new EntityGenerator();
        await entityGenerator.initialize();

        const entityResult = await entityGenerator.generate({
            projectRoot: context.projectRoot,
            options: {
                name: options.name,
                props: options.props,
                aggregate: true,
                outputDir: path.join(contextPath, 'domain/entities')
            }
        });
        files.push(...entityResult.files);

        // 2. Generate Repository
        const repositoryGenerator = new RepositoryGenerator();
        await repositoryGenerator.initialize();

        const repoResult = await repositoryGenerator.generate({
            projectRoot: context.projectRoot,
            options: {
                entityName: options.name,
                outputDir: path.join(contextPath, 'domain/repositories'),
                implOutputDir: path.join(contextPath, 'infrastructure/repositories'),
                generateImpl: true
            }
        });
        files.push(...repoResult.files);

        // 3. Generate Create Command
        const commandGenerator = new CommandGenerator();
        await commandGenerator.initialize();

        const createCommandResult = await commandGenerator.generate({
            projectRoot: context.projectRoot,
            options: {
                name: `Create${options.name}`,
                props: options.props,
                outputDir: path.join(contextPath, 'application/commands'),
                generateHandler: true
            }
        });
        files.push(...createCommandResult.files);

        // 4. Generate Get Query
        const queryGenerator = new QueryGenerator();
        await queryGenerator.initialize();

        const getQueryResult = await queryGenerator.generate({
            projectRoot: context.projectRoot,
            options: {
                name: `Get${options.name}ById`,
                props: [{ name: 'id', type: 'string' }],
                output: options.name,
                outputDir: path.join(contextPath, 'application/queries'),
                generateHandler: true
            }
        });
        files.push(...getQueryResult.files);

        // 5. Generate List Query
        const listQueryResult = await queryGenerator.generate({
            projectRoot: context.projectRoot,
            options: {
                name: `List${options.name}s`,
                props: [],
                output: 'any', // Use 'any' for arrays to avoid creating invalid entity
                outputDir: path.join(contextPath, 'application/queries'),
                generateHandler: true
            }
        });
        files.push(...listQueryResult.files);

        // 6. Generate HTTP routes if withHttp flag is set
        if (options.withHttp) {
            const routesContent = this.generateHttpRoutes(options.name, options.props);
            files.push({
                path: path.join(contextPath, 'infrastructure/http', `${options.name}Routes.ts`),
                content: routesContent,
                action: 'create'
            });
        }

        // 7. Generate index.ts for the context (barrel export)
        const indexContent = this.generateIndexFile(options.name);
        files.push({
            path: path.join(contextPath, 'index.ts'),
            content: indexContent,
            action: 'create'
        });

        logger.info(`Context ${options.name} will be created at: ${contextPath}`);

        return { files };
    }

    /**
     * Generate HTTP routes file
     */
    private generateHttpRoutes(contextName: string, props: Array<{ name: string; type: string }>): string {
        const entityNameLowercase = contextName.toLowerCase();
        const propsObject = props.map(p => `${p.name}: request.body.${p.name}`).join(',\n      ');

        return `import { FastifyHTTPPlugin, type HttpRequest, type HttpResponse } from '@stratix/http-fastify';
import type { CommandBus, QueryBus, Result } from '@stratix/core';
import { Create${contextName}, type Create${contextName}Command } from '../../application/commands/Create${contextName}.js';
import { Get${contextName}ById } from '../../application/queries/Get${contextName}ById.js';
import { List${contextName}s } from '../../application/queries/List${contextName}s.js';

const basePath = '/${entityNameLowercase}s';
type ${contextName}Params = { id: string };

class Create${contextName}Route {
  readonly method = 'POST';
  readonly path = basePath;

  constructor(private readonly commandBus: CommandBus) {}

  async handle(request: HttpRequest<Create${contextName}Command>): Promise<HttpResponse> {
    const command = new Create${contextName}({
      ${propsObject}
    });
    const result = await this.commandBus.dispatch<Result<unknown, Error>>(command);

    if (result.isFailure) {
      return {
        statusCode: 400,
        body: { error: result.error.message }
      };
    }

    return {
      statusCode: 201,
      body: result.value
    };
  }
}

class Get${contextName}ByIdRoute {
  readonly method = 'GET';
  readonly path = \`\${basePath}/:id\`;

  constructor(private readonly queryBus: QueryBus) {}

  async handle(request: HttpRequest<unknown, unknown, ${contextName}Params>): Promise<HttpResponse> {
    const { id } = request.params as ${contextName}Params;

    const query = new Get${contextName}ById({ id });
    const result = await this.queryBus.execute<Result<unknown, Error>>(query);

    if (result.isFailure) {
      return {
        statusCode: 404,
        body: { error: 'Not found' }
      };
    }

    return {
      statusCode: 200,
      body: result.value
    };
  }
}

class List${contextName}sRoute {
  readonly method = 'GET';
  readonly path = basePath;

  constructor(private readonly queryBus: QueryBus) {}

  async handle(): Promise<HttpResponse> {
    const query = new List${contextName}s({});
    const result = await this.queryBus.execute<Result<unknown, Error>>(query);

    if (result.isFailure) {
      return {
        statusCode: 500,
        body: { error: result.error.message }
      };
    }

    return {
      statusCode: 200,
      body: result.value || []
    };
  }
}

/**
 * Register HTTP routes for ${contextName} context
 * 
 * @param http - Fastify HTTP plugin instance
 * @param commandBus - Command bus for executing commands
 * @param queryBus - Query bus for executing queries
 */
export function register${contextName}Routes(
  http: FastifyHTTPPlugin,
  commandBus: CommandBus,
  queryBus: QueryBus
): void {
  http.routeClass(new Create${contextName}Route(commandBus));
  http.routeClass(new Get${contextName}ByIdRoute(queryBus));
  http.routeClass(new List${contextName}sRoute(queryBus));
}
`;
    }

    /**
     * Generate index.ts barrel export
     */
    private generateIndexFile(contextName: string): string {
        return `// ${contextName} Context - Barrel Exports

// Domain
export * from './domain/entities/${contextName}.js';
export * from './domain/repositories/${contextName}Repository.js';

// Application - Commands
export * from './application/commands/Create${contextName}.js';
export * from './application/commands/Create${contextName}Handler.js';

// Application - Queries
export * from './application/queries/Get${contextName}ById.js';
export * from './application/queries/Get${contextName}ByIdHandler.js';
export * from './application/queries/List${contextName}s.js';
export * from './application/queries/List${contextName}sHandler.js';

// Infrastructure
export * from './infrastructure/repositories/InMemory${contextName}Repository.js';
`;
    }

    /**
     * Rollback context generation
     */
    async rollback(context: GeneratorContext): Promise<void> {
        const options = ContextOptionsSchema.parse(context.options);
        const contextPath = path.join(
            context.projectRoot,
            options.outputDir,
            options.name.toLowerCase()
        );

        if (await fileSystem.exists(contextPath)) {
            await fileSystem.remove(contextPath);
            logger.info(`Rolled back context: ${options.name}`);
        }
    }
}
