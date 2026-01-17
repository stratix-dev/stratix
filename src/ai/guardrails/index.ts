/**
 * Guardrails for safety and compliance.
 *
 * Provides validation of agent inputs and outputs against policies,
 * safety requirements, and business rules.
 *
 * @module guardrails
 *
 * @example
 * ```typescript
 * import {
 *   Guardrail,
 *   GuardrailChain,
 *   GuardrailSeverity,
 *   TextLengthGuardrail,
 *   PatternGuardrail
 * } from '@stratix/core/ai/guardrails';
 *
 * // Create a chain of guardrails
 * const chain = new GuardrailChain<string>()
 *   .add(new TextLengthGuardrail(1000, GuardrailSeverity.ERROR))
 *   .add(new PatternGuardrail(
 *     'pii-detector',
 *     /\b\d{3}-\d{2}-\d{4}\b/g,  // SSN pattern
 *     GuardrailSeverity.CRITICAL,
 *     'PII detected'
 *   ));
 *
 * // Check content
 * const result = await chain.check(userInput);
 * if (result.shouldBlock) {
 *   throw new Error('Content violates policies');
 * }
 * ```
 */

// Severity
export { GuardrailSeverity, GuardrailSeverityHelpers } from './GuardrailSeverity.js';

// Results
export { type GuardrailResult, GuardrailResultHelpers } from './GuardrailResult.js';

// Guardrails
export {
  type GuardrailContext,
  Guardrail,
  TextLengthGuardrail,
  PatternGuardrail
} from './Guardrail.js';

// Chain
export { type GuardrailChainConfig, type ChainResult, GuardrailChain } from './GuardrailChain.js';
