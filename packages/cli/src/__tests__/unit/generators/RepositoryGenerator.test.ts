import { describe, it, expect, beforeEach } from 'vitest';
import { RepositoryGenerator } from '../../../generators/core/RepositoryGenerator.js';
import type { GeneratorContext } from '../../../core/types.js';

describe('RepositoryGenerator', () => {
    let generator: RepositoryGenerator;
    let context: GeneratorContext;

    beforeEach(async () => {
        generator = new RepositoryGenerator();
        await generator.initialize();

        context = {
            projectRoot: '/test/project',
            options: {
                entityName: 'User',
                generateImpl: true
            }
        };
    });

    it('should have correct name', () => {
        expect(generator.name).toBe('repository');
    });

    it('should generate repository interface and implementation', async () => {
        const result = await generator.generate(context);

        expect(result.files).toHaveLength(2);
        expect(result.files[0].path).toContain('UserRepository.ts');
        expect(result.files[1].path).toContain('InMemoryUserRepository.ts');
    });

    it('should generate only interface when implementation is disabled', async () => {
        context.options.generateImpl = false;
        const result = await generator.generate(context);

        expect(result.files).toHaveLength(1);
        expect(result.files[0].path).toContain('UserRepository.ts');
    });

    it('should include Repository interface', async () => {
        const result = await generator.generate(context);
        const content = result.files[0].content;

        expect(content).toContain('interface UserRepository');
        expect(content).toContain('User');
    });

    it('should include implementation class when enabled', async () => {
        const result = await generator.generate(context);
        const implContent = result.files[1].content;

        expect(implContent).toContain('InMemoryUserRepository');
        expect(implContent).toContain('UserRepository');
    });

    it('should validate options', async () => {
        context.options.entityName = '';

        await expect(generator.generate(context)).rejects.toThrow();
    });
});
