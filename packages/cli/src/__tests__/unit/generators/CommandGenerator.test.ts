import { describe, it, expect, beforeEach } from 'vitest';
import { CommandGenerator } from '../../../generators/core/CommandGenerator.js';
import type { GeneratorContext } from '../../../core/types.js';

describe('CommandGenerator', () => {
    let generator: CommandGenerator;
    let context: GeneratorContext;

    beforeEach(async () => {
        generator = new CommandGenerator();
        await generator.initialize();

        context = {
            projectRoot: '/test/project',
            options: {
                name: 'CreateUser',
                generateHandler: true
            }
        };
    });

    it('should have correct name', () => {
        expect(generator.name).toBe('command');
    });

    it('should generate command and handler files', async () => {
        const result = await generator.generate(context);

        expect(result.files).toHaveLength(2);
        expect(result.files[0].path).toContain('CreateUser.ts');
        expect(result.files[1].path).toContain('CreateUserHandler.ts');
    });

    it('should generate only command when handler is disabled', async () => {
        context.options.generateHandler = false;
        const result = await generator.generate(context);

        expect(result.files).toHaveLength(1);
        expect(result.files[0].path).toContain('CreateUser.ts');
    });

    it('should include Command class', async () => {
        const result = await generator.generate(context);
        const content = result.files[0].content;

        expect(content).toContain('CreateUserCommand');
        expect(content).toContain('Command');
    });

    it('should include Handler class when enabled', async () => {
        const result = await generator.generate(context);
        const handlerContent = result.files[1].content;

        expect(handlerContent).toContain('CreateUserHandler');
        expect(handlerContent).toContain('CommandHandler');
    });

    it('should validate options', async () => {
        context.options.name = '';

        await expect(generator.generate(context)).rejects.toThrow();
    });
});
