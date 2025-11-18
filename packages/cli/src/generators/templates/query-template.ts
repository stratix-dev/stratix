import type { TemplateData } from '../../types/index.js';

export const queryTemplate = (data: TemplateData): string => {
  const { entityName, props } = data;

  return `import type { Query } from '@stratix/abstractions';

export interface ${entityName}Query {
${props.map(p => `  ${p.name}: ${p.type};`).join('\n')}
}

export class ${entityName} implements Query {
  constructor(public readonly data: ${entityName}Query) {}
}
`;
};

export const queryHandlerTemplate = (data: TemplateData, outputType: string): string => {
  const { entityName } = data;

  return `import type { QueryHandler } from '@stratix/abstractions';
import { Success, Failure, type Result } from '@stratix/primitives';
import { ${entityName} } from './${entityName}.js';

export class ${entityName}Handler implements QueryHandler<${entityName}, Result<${outputType}, Error>> {
  async handle(query: ${entityName}): Promise<Result<${outputType}, Error>> {
    try {
      // TODO: Implement query logic
      console.log('Executing ${entityName}:', query.data);
      
      // Return dummy data for now
      return Success.create({} as ${outputType});
    } catch (error) {
      return Failure.create(
        error instanceof Error ? error : new Error('Unknown error')
      );
    }
  }
}
`;
};
