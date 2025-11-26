import { describe, it, expect, beforeEach } from 'vitest';
import { GeneratorRegistry } from '../../../core/GeneratorRegistry.js';

describe('GeneratorRegistry', () => {
    let registry: GeneratorRegistry;

    beforeEach(() => {
        registry = new GeneratorRegistry();
    });

    it('should register default generators', () => {
        const names = registry.getNames();

        expect(names).toContain('entity');
        expect(names).toContain('command');
        expect(names).toContain('query');
        expect(names).toContain('value-object');
        expect(names).toContain('repository');
        expect(names).toContain('quality');
    });

    it('should get generator by name', async () => {
        const generator = await registry.get('entity');

        expect(generator).toBeDefined();
        expect(generator?.name).toBe('entity');
    });

    it('should return undefined for unknown generator', async () => {
        const generator = await registry.get('unknown');

        expect(generator).toBeUndefined();
    });

    it('should check if generator exists', () => {
        expect(registry.has('entity')).toBe(true);
        expect(registry.has('unknown')).toBe(false);
    });

    it('should list all generators with descriptions', () => {
        const list = registry.list();

        expect(list).toHaveLength(7);
        expect(list[0]).toHaveProperty('name');
        expect(list[0]).toHaveProperty('description');
    });

    it('should initialize generator only once', async () => {
        const generator1 = await registry.get('entity');
        const generator2 = await registry.get('entity');

        expect(generator1).toBe(generator2);
    });
});
