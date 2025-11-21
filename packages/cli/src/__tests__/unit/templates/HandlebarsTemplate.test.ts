import { describe, it, expect, beforeEach } from 'vitest';
import { TemplateEngine } from '../../../templates/engine/TemplateEngine.js';
import { TemplateRegistry } from '../../../templates/engine/TemplateRegistry.js';
import { HandlebarsTemplate, TemplateLoader } from '../../../templates/engine/HandlebarsTemplate.js';
import { fileSystem } from '../../../infrastructure/FileSystem.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('HandlebarsTemplate', () => {
    let registry: TemplateRegistry;
    let engine: TemplateEngine;
    let loader: TemplateLoader;

    beforeEach(() => {
        registry = new TemplateRegistry();
        engine = new TemplateEngine(registry);
        loader = new TemplateLoader(engine);
    });

    it('should load template from file', async () => {
        // Create a temporary template file
        const tempDir = path.join(__dirname, '../../../templates/definitions');
        const testTemplatePath = 'entity.hbs';

        const template = new HandlebarsTemplate('test-entity', testTemplatePath);
        await template.load(engine);

        const result = template.render({
            name: 'User',
            aggregate: true,
            props: [
                { name: 'email', type: 'string' },
                { name: 'age', type: 'number' }
            ]
        });

        expect(result).toContain('class User');
        expect(result).toContain('AggregateRoot');
    });

    it('should throw error if rendering before loading', () => {
        const template = new HandlebarsTemplate('test', 'test.hbs');

        expect(() => template.render({})).toThrow('not loaded');
    });

    it('should load multiple templates', async () => {
        const templates = await loader.loadTemplates([
            { name: 'entity', path: 'entity.hbs' },
            { name: 'command', path: 'command.hbs' }
        ]);

        expect(templates).toHaveLength(2);
        expect(templates[0].name).toBe('entity');
        expect(templates[1].name).toBe('command');
    });
});
