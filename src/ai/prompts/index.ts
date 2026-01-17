/**
 * Prompt management for AI agents.
 *
 * Provides template-based prompts with variable substitution,
 * centralized registry, and serialization.
 *
 * @module prompts
 *
 * @example
 * ```typescript
 * import {
 *   PromptTemplate,
 *   PromptRegistry,
 *   PromptLoader
 * } from '@stratix/core/ai/prompts';
 *
 * // Create a template
 * const template = new PromptTemplate({
 *   metadata: { name: 'greeting', version: '1.0' },
 *   template: 'Hello {{name}}, welcome to {{app}}!',
 *   variables: [
 *     { name: 'name', required: true },
 *     { name: 'app', defaultValue: 'our app' }
 *   ]
 * });
 *
 * // Register it
 * const registry = new PromptRegistry();
 * registry.register(template);
 *
 * // Use it
 * const rendered = registry.get('greeting').render({ name: 'Alice' });
 * // => 'Hello Alice, welcome to our app!'
 * ```
 */

// Variables
export {
  type PromptVariable,
  type PromptVariables,
  PromptVariableHelpers
} from './PromptVariable.js';

// Template
export { type PromptMetadata, PromptTemplate } from './PromptTemplate.js';

// Registry
export { PromptRegistry } from './PromptRegistry.js';

// Loader
export { type SerializedPrompt, PromptLoader } from './PromptLoader.js';
