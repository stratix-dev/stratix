/**
 * Guardrails for AI agents (runtime implementations).
 *
 * This module exports concrete guardrail implementations for production use.
 * For base guardrail classes, see @stratix/core/ai-agents/guardrails
 */

// Re-export base classes from core
export {
  Guardrail,
  GuardrailSeverity,
  GuardrailChain,
  type GuardrailContext,
  type GuardrailResult,
  type GuardrailChainConfig,
  type ChainResult,
} from '@stratix/core/ai-agents';

// Runtime implementations
export {
  ContentLengthGuardrail,
  type ContentLengthGuardrailConfig,
} from './ContentLengthGuardrail.js';

export {
  PIIGuardrail,
  type PIIGuardrailConfig,
} from './PIIGuardrail.js';

export {
  PromptInjectionGuardrail,
  type PromptInjectionGuardrailConfig,
} from './PromptInjectionGuardrail.js';

export {
  TopicFilterGuardrail,
  type TopicFilterGuardrailConfig,
} from './TopicFilterGuardrail.js';
