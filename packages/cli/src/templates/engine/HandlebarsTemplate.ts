import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { BaseTemplate } from '../../core/Template.js';
import { TemplateEngine } from './TemplateEngine.js';
import type { TemplateData } from '../../core/types.js';
import type { z } from 'zod';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Handlebars-based template implementation
 * 
 * Loads .hbs files from the definitions directory
 */
export class HandlebarsTemplate extends BaseTemplate {
    private compiledTemplate?: (data: TemplateData) => string;
    private templateSource?: string;

    constructor(
        public readonly name: string,
        public readonly path: string,
        public readonly schema?: z.ZodSchema
    ) {
        super();
    }

    /**
     * Load template from file
     */
    async load(engine: TemplateEngine): Promise<void> {
        const templatePath = path.isAbsolute(this.path)
            ? this.path
            : path.join(__dirname, '../definitions', this.path);

        this.templateSource = await fs.readFile(templatePath, 'utf-8');
        this.compiledTemplate = engine.compile(this.templateSource);
    }

    /**
     * Render the template
     */
    render(data: TemplateData): string {
        if (!this.compiledTemplate) {
            throw new Error(`Template "${this.name}" not loaded. Call load() first.`);
        }

        return this.compiledTemplate(data);
    }

    /**
     * Get template source
     */
    getSource(): string {
        if (!this.templateSource) {
            throw new Error(`Template "${this.name}" not loaded.`);
        }
        return this.templateSource;
    }
}

/**
 * Template loader utility
 */
export class TemplateLoader {
    constructor(private engine: TemplateEngine) { }

    /**
     * Load a template from file
     */
    async loadTemplate(
        name: string,
        filePath: string,
        schema?: z.ZodSchema
    ): Promise<HandlebarsTemplate> {
        const template = new HandlebarsTemplate(name, filePath, schema);
        await template.load(this.engine);
        return template;
    }

    /**
     * Load multiple templates
     */
    async loadTemplates(
        templates: Array<{ name: string; path: string; schema?: z.ZodSchema }>
    ): Promise<HandlebarsTemplate[]> {
        return await Promise.all(
            templates.map((t) => this.loadTemplate(t.name, t.path, t.schema))
        );
    }

    /**
     * Load all templates from definitions directory
     */
    async loadAllTemplates(): Promise<HandlebarsTemplate[]> {
        const definitionsDir = path.join(__dirname, '../definitions');
        const files = await fs.readdir(definitionsDir);
        const hbsFiles = files.filter((f) => f.endsWith('.hbs'));

        const templates: HandlebarsTemplate[] = [];

        for (const file of hbsFiles) {
            const name = file.replace('.hbs', '');
            const template = await this.loadTemplate(name, file);
            templates.push(template);
        }

        return templates;
    }
}
