import { describe, it, expect, beforeEach } from 'vitest';
import { ValueObjectGenerator } from '../../../generators/core/ValueObjectGenerator.js';
import type { GeneratorContext } from '../../../core/types.js';

describe('ValueObjectGenerator', () => {
    let generator: ValueObjectGenerator;
    let context: GeneratorContext;

    beforeEach(async () => {
        generator = new ValueObjectGenerator();
        await generator.initialize();

        context = {
            projectRoot: '/test/project',
            options: {
                name: 'Email',
                props: [{ name: 'value', type: 'string' }]
            }
        };
    });

    it('should have correct name', () => {
        expect(generator.name).toBe('value-object');
    });

    it('should generate value object file', async () => {
        const result = await generator.generate(context);

        expect(result.files).toHaveLength(1);
        expect(result.files[0].path).toContain('Email.ts');
    });

    it('should include ValueObject class', async () => {
        const result = await generator.generate(context);
        const content = result.files[0].content;

        expect(content).toContain('class Email extends ValueObject');
    });

    it('should include all props', async () => {
        context.options.props = [
            { name: 'street', type: 'string' },
            { name: 'city', type: 'string' },
            { name: 'zipCode', type: 'string' }
        ];
        const result = await generator.generate(context);
        const content = result.files[0].content;

        expect(content).toContain('street');
        expect(content).toContain('city');
        expect(content).toContain('zipCode');
    });

    it('should generate without props', async () => {
        context.options.props = [];
        const result = await generator.generate(context);

        expect(result.files).toHaveLength(1);
        expect(result.files[0].content).toContain('class Email extends ValueObject');
    });

    it('should validate options', async () => {
        context.options.name = '';

        await expect(generator.generate(context)).rejects.toThrow();
    });
});
