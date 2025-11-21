import type { Generator } from './Generator.js';
import { EntityGenerator } from '../generators/core/EntityGenerator.js';
import { CommandGenerator } from '../generators/core/CommandGenerator.js';
import { QueryGenerator } from '../generators/core/QueryGenerator.js';
import { ValueObjectGenerator } from '../generators/core/ValueObjectGenerator.js';
import { RepositoryGenerator } from '../generators/core/RepositoryGenerator.js';
import { QualityGenerator } from '../generators/core/QualityGenerator.js';

/**
 * Registry for managing v2 generators
 */
export class GeneratorRegistry {
    private generators: Map<string, Generator> = new Map();
    private initialized: Set<string> = new Set();

    constructor() {
        this.registerDefaults();
    }

    /**
     * Register default v2 generators
     */
    private registerDefaults(): void {
        this.register(new EntityGenerator());
        this.register(new CommandGenerator());
        this.register(new QueryGenerator());
        this.register(new ValueObjectGenerator());
        this.register(new RepositoryGenerator());
        this.register(new QualityGenerator());
    }

    /**
     * Register a generator
     */
    register(generator: Generator): void {
        this.generators.set(generator.name, generator);
    }

    /**
     * Get a generator by name
     */
    async get(name: string): Promise<Generator | undefined> {
        const generator = this.generators.get(name);

        if (!generator) {
            return undefined;
        }

        // Lazy initialization
        if (!this.initialized.has(name)) {
            await generator.initialize();
            this.initialized.add(name);
        }

        return generator;
    }

    /**
     * Check if a generator exists
     */
    has(name: string): boolean {
        return this.generators.has(name);
    }

    /**
     * Get all registered generator names
     */
    getNames(): string[] {
        return Array.from(this.generators.keys());
    }

    /**
     * Get all generators with their descriptions
     */
    list(): Array<{ name: string; description: string }> {
        return Array.from(this.generators.values()).map(gen => ({
            name: gen.name,
            description: gen.description || 'No description available'
        }));
    }
}

/**
 * Singleton instance
 */
export const generatorRegistry = new GeneratorRegistry();
