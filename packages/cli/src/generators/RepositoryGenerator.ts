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
  context?: string;
  projectRoot?: string;
}

export class RepositoryGenerator extends BaseGenerator {
  constructor(private options: RepositoryGeneratorOptions) {
    super(options.projectRoot);
  }

  async generate(): Promise<GeneratedFile[]> {
    const { entityName, withImplementation = true, context } = this.options;
    const entityPascal = this.naming.toPascalCase(entityName);
    
    const structure = await this.detectProjectStructure();

    const files: GeneratedFile[] = [];

    let repoPath: string;
    let implPath: string;

    if (context) {
      // Generate inside bounded context
      const contextPath = structure.contextsPath 
        ? path.join(structure.contextsPath, this.naming.toKebabCase(context))
        : path.join(structure.sourceRoot, 'contexts', this.naming.toKebabCase(context));
      repoPath = path.join(contextPath, 'domain', 'repositories');
      implPath = path.join(contextPath, 'infrastructure', 'persistence');
    } else {
      // Generate in global domain/infrastructure
      repoPath = structure.domainPath 
        ? path.join(structure.domainPath, 'repositories')
        : path.join(structure.sourceRoot, 'domain', 'repositories');
      implPath = structure.infrastructurePath
        ? path.join(structure.infrastructurePath, 'persistence')
        : path.join(structure.sourceRoot, 'infrastructure', 'persistence');
    }

    files.push({
      path: path.join(repoPath, `${entityPascal}Repository.ts`),
      content: generateRepositoryInterface(entityPascal),
      action: 'create',
    });

    if (withImplementation) {
      files.push({
        path: path.join(implPath, `InMemory${entityPascal}Repository.ts`),
        content: generateInMemoryRepository(entityPascal),
        action: 'create',
      });
    }

    return files;
  }
}
