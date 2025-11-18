import { NamingUtils } from '../../utils/naming.js';

export function generateRepositoryInterface(entityName: string): string {

  return `import type { Repository } from '@stratix/abstractions';
import type { ${entityName} } from '../entities/${entityName}.js';
import type { ${entityName}Id } from '../entities/${entityName}.js';

export interface ${entityName}Repository extends Repository<${entityName}, ${entityName}Id> {
  findByName(name: string): Promise<${entityName} | null>;
  findAll(): Promise<${entityName}[]>;
}
`;
}

export function generateInMemoryRepository(entityName: string): string {
  const entityCamel = NamingUtils.toCamelCase(entityName);

  return `import type { ${entityName}Repository } from '../../domain/repositories/${entityName}Repository.js';
import type { ${entityName} } from '../../domain/entities/${entityName}.js';
import type { ${entityName}Id } from '../../domain/entities/${entityName}.js';

export class InMemory${entityName}Repository implements ${entityName}Repository {
  private ${entityCamel}s: Map<string, ${entityName}> = new Map();

  async save(${entityCamel}: ${entityName}): Promise<void> {
    this.${entityCamel}s.set(${entityCamel}.id.toString(), ${entityCamel});
  }

  async findById(id: ${entityName}Id): Promise<${entityName} | null> {
    return this.${entityCamel}s.get(id.toString()) ?? null;
  }

  async findByName(name: string): Promise<${entityName} | null> {
    for (const ${entityCamel} of this.${entityCamel}s.values()) {
      if (${entityCamel}.name === name) {
        return ${entityCamel};
      }
    }
    return null;
  }

  async findAll(): Promise<${entityName}[]> {
    return Array.from(this.${entityCamel}s.values());
  }

  async delete(id: ${entityName}Id): Promise<void> {
    this.${entityCamel}s.delete(id.toString());
  }

  async exists(id: ${entityName}Id): Promise<boolean> {
    return this.${entityCamel}s.has(id.toString());
  }
}
`;
}
