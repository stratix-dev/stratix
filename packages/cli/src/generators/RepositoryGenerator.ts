import path from 'path';
import { BaseGenerator } from './BaseGenerator.js';
import type { GeneratedFile } from '../types/index.js';
import {
  generateRepositoryInterface,
  generateInMemoryRepository,
} from './templates/repository-template.js';

export interface RepositoryGeneratorOptions {
  entityName: string;
  withImplementation?: boolean;
  projectRoot?: string;
}

export class RepositoryGenerator extends BaseGenerator {
  constructor(private options: RepositoryGeneratorOptions) {
    super(options.projectRoot);
  }

  async generate(): Promise<GeneratedFile[]> {
    const { entityName, withImplementation = true } = this.options;
    const entityPascal = this.naming.toPascalCase(entityName);

    await Promise.resolve();

    const files: GeneratedFile[] = [];

    files.push({
      path: path.join(this.projectRoot, `src/domain/repositories/${entityPascal}Repository.ts`),
      content: generateRepositoryInterface(entityPascal),
      action: 'create',
    });

    if (withImplementation) {
      files.push({
        path: path.join(
          this.projectRoot,
          `src/infrastructure/persistence/InMemory${entityPascal}Repository.ts`
        ),
        content: generateInMemoryRepository(entityPascal),
        action: 'create',
      });
    }

    return files;
  }
}
