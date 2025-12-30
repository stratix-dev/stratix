import type { PromptTemplate } from './PromptTemplate.js';

/**
 * Registry for managing prompt templates.
 *
 * Provides centralized storage and retrieval of prompts.
 *
 * @example
 * ```typescript
 * const registry = new PromptRegistry();
 *
 * registry.register(greetingTemplate);
 * registry.register(farewellTemplate);
 *
 * const template = registry.get('greeting');
 * const rendered = template.render({ name: 'Alice' });
 * ```
 */
export class PromptRegistry {
  private templates = new Map<string, PromptTemplate>();

  /**
   * Register a prompt template.
   *
   * @param template - The template to register
   * @returns This registry for chaining
   *
   * @example
   * ```typescript
   * registry.register(template);
   * ```
   */
  register(template: PromptTemplate): this {
    const name = template.getMetadata().name;

    if (this.templates.has(name)) {
      throw new Error(`Template already registered: ${name}`);
    }

    this.templates.set(name, template);
    return this;
  }

  /**
   * Register a template, replacing existing if present.
   *
   * @param template - The template to register
   * @returns This registry for chaining
   *
   * @example
   * ```typescript
   * registry.registerOrReplace(updatedTemplate);
   * ```
   */
  registerOrReplace(template: PromptTemplate): this {
    const name = template.getMetadata().name;
    this.templates.set(name, template);
    return this;
  }

  /**
   * Register multiple templates.
   *
   * @param templates - Array of templates
   * @returns This registry for chaining
   *
   * @example
   * ```typescript
   * registry.registerAll([template1, template2, template3]);
   * ```
   */
  registerAll(templates: readonly PromptTemplate[]): this {
    for (const template of templates) {
      this.register(template);
    }
    return this;
  }

  /**
   * Get a template by name.
   *
   * @param name - Template name
   * @returns The template
   * @throws {Error} If template not found
   *
   * @example
   * ```typescript
   * const template = registry.get('greeting');
   * ```
   */
  get(name: string): PromptTemplate {
    const template = this.templates.get(name);

    if (!template) {
      throw new Error(`Template not found: ${name}`);
    }

    return template;
  }

  /**
   * Try to get a template by name.
   *
   * @param name - Template name
   * @returns The template or undefined if not found
   *
   * @example
   * ```typescript
   * const template = registry.tryGet('greeting');
   * if (template) {
   *   // Use template
   * }
   * ```
   */
  tryGet(name: string): PromptTemplate | undefined {
    return this.templates.get(name);
  }

  /**
   * Check if a template exists.
   *
   * @param name - Template name
   * @returns True if template exists
   *
   * @example
   * ```typescript
   * if (registry.has('greeting')) {
   *   console.log('Template exists');
   * }
   * ```
   */
  has(name: string): boolean {
    return this.templates.has(name);
  }

  /**
   * Unregister a template.
   *
   * @param name - Template name
   * @returns True if template was removed
   *
   * @example
   * ```typescript
   * registry.unregister('greeting');
   * ```
   */
  unregister(name: string): boolean {
    return this.templates.delete(name);
  }

  /**
   * Get all template names.
   *
   * @returns Array of template names
   *
   * @example
   * ```typescript
   * const names = registry.getNames();
   * console.log('Available templates:', names);
   * ```
   */
  getNames(): readonly string[] {
    return Array.from(this.templates.keys());
  }

  /**
   * Get all templates.
   *
   * @returns Array of templates
   *
   * @example
   * ```typescript
   * const all = registry.getAll();
   * ```
   */
  getAll(): readonly PromptTemplate[] {
    return Array.from(this.templates.values());
  }

  /**
   * Find templates matching a predicate.
   *
   * @param predicate - Filter function
   * @returns Matching templates
   *
   * @example
   * ```typescript
   * const chatTemplates = registry.find(
   *   (t) => t.getMetadata().tags?.includes('chat')
   * );
   * ```
   */
  find(
    predicate: (template: PromptTemplate) => boolean
  ): readonly PromptTemplate[] {
    return Array.from(this.templates.values()).filter(predicate);
  }

  /**
   * Find templates by tag.
   *
   * @param tag - Tag to search for
   * @returns Templates with the given tag
   *
   * @example
   * ```typescript
   * const chatTemplates = registry.findByTag('chat');
   * ```
   */
  findByTag(tag: string): readonly PromptTemplate[] {
    return this.find((template) =>
      template.getMetadata().tags?.includes(tag) ?? false
    );
  }

  /**
   * Clear all templates.
   *
   * @example
   * ```typescript
   * registry.clear();
   * ```
   */
  clear(): void {
    this.templates.clear();
  }

  /**
   * Get the number of registered templates.
   *
   * @returns Template count
   *
   * @example
   * ```typescript
   * console.log(`Registry contains ${registry.size} templates`);
   * ```
   */
  get size(): number {
    return this.templates.size;
  }

  /**
   * Check if registry is empty.
   *
   * @returns True if no templates registered
   */
  get isEmpty(): boolean {
    return this.templates.size === 0;
  }

  /**
   * Clone this registry.
   *
   * Creates a new registry with the same templates.
   *
   * @returns New registry
   *
   * @example
   * ```typescript
   * const copy = registry.clone();
   * ```
   */
  clone(): PromptRegistry {
    const cloned = new PromptRegistry();
    cloned.templates = new Map(this.templates);
    return cloned;
  }

  /**
   * Merge another registry into this one.
   *
   * @param other - Registry to merge
   * @param overwrite - Whether to overwrite existing templates (default: false)
   * @returns This registry for chaining
   *
   * @example
   * ```typescript
   * registry1.merge(registry2, true);
   * ```
   */
  merge(other: PromptRegistry, overwrite = false): this {
    for (const [name, template] of other.templates.entries()) {
      if (overwrite || !this.templates.has(name)) {
        this.templates.set(name, template);
      }
    }
    return this;
  }
}
