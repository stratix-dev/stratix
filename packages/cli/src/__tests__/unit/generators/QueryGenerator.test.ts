import { describe, it, expect, beforeEach } from 'vitest';
import { QueryGenerator } from '../../../generators/core/QueryGenerator.js';
import type { GeneratorContext } from '../../../core/types.js';

describe('QueryGenerator', () => {
    let generator: QueryGenerator;
    let context: GeneratorContext;

    beforeEach(async () => {
        generator = new QueryGenerator();
        await generator.initialize();

        context = {
            projectRoot: '/test/project',
            options: {
                name: 'GetUser',
                returnType: 'User',
                generateHandler: true
            }
        };
    });

    it('should have correct name', () => {
        expect(generator.name).toBe('query');
    });

    it('should generate query and handler files', async () => {
        const result = await generator.generate(context);

        expect(result.files).toHaveLength(2);
        expect(result.files[0].path).toContain('GetUser.ts');
        expect(result.files[1].path).toContain('GetUserHandler.ts');
    });

    it('should generate only query when handler is disabled', async () => {
        context.options.generateHandler = false;
        const result = await generator.generate(context);

        expect(result.files).toHaveLength(1);
        expect(result.files[0].path).toContain('GetUser.ts');
    });

    it('should include Query class', async () => {
        const result = await generator.generate(context);
        const content = result.files[0].content;

        expect(content).toContain('GetUserQuery');
        expect(content).toContain('Query');
    });

    it('should include return type in handler', async () => {
        const result = await generator.generate(context);
        const handlerContent = result.files[1].content;

        expect(handlerContent).toContain('GetUserHandler');
        expect(handlerContent).toContain('User');
    });

    it('should validate options', async () => {
        context.options.name = '';

        await expect(generator.generate(context)).rejects.toThrow();
    });
});
