import { describe, it, expect, beforeEach } from 'vitest';
import { EntityGenerator } from '../../../generators/core/EntityGenerator.js';
import type { GeneratorContext } from '../../../core/types.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('EntityGenerator', () => {
    let generator: EntityGenerator;
    let context: GeneratorContext;

    beforeEach(async () => {
        generator = new EntityGenerator();
        await generator.initialize();

        context = {
            projectRoot: '/test/project',
            options: {
                name: 'User',
                aggregate: true,
                props: [
                    { name: 'email', type: 'string' },
                    { name: 'age', type: 'number' }
                ]
            }
        };
    });

    it('should have correct name', () => {
        expect(generator.name).toBe('entity');
    });

    it('should generate entity file', async () => {
        const result = await generator.generate(context);

        expect(result.files).toHaveLength(1);
        expect(result.files[0].path).toContain('User.ts');
        expect(result.files[0].action).toBe('create');
    });

    it('should generate aggregate root when specified', async () => {
        const result = await generator.generate(context);
        const content = result.files[0].content;

        expect(content).toContain('AggregateRoot');
        expect(content).toContain('class User');
    });

    it('should generate entity when aggregate is false', async () => {
        context.options.aggregate = false;
        const result = await generator.generate(context);
        const content = result.files[0].content;

        expect(content).toContain('Entity');
        expect(content).not.toContain('AggregateRoot');
    });

    it('should include all props', async () => {
        const result = await generator.generate(context);
        const content = result.files[0].content;

        expect(content).toContain('email');
        expect(content).toContain('age');
        expect(content).toContain('string');
        expect(content).toContain('number');
    });

    it('should validate options', async () => {
        context.options.name = '';

        await expect(generator.generate(context)).rejects.toThrow();
    });
});
