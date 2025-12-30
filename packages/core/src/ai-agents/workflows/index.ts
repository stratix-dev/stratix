/**
 * Workflow orchestration for AI agents.
 *
 * Provides workflow definitions, execution engine, and persistence.
 *
 * @module workflows
 *
 * @example
 * ```typescript
 * import {
 *   Workflow,
 *   WorkflowEngine,
 *   TransformStep,
 *   ConditionalStep
 * } from '@stratix/core/ai-agents/workflows';
 *
 * // Define a workflow
 * const workflow = new Workflow({
 *   metadata: {
 *     name: 'data-pipeline',
 *     description: 'Process and analyze data'
 *   },
 *   steps: [
 *     new TransformStep('uppercase', 'To Uppercase', (text) => text.toUpperCase()),
 *     new ConditionalStep(
 *       'check-length',
 *       'Check Length',
 *       (text) => text.length > 10,
 *       longTextStep,
 *       shortTextStep
 *     )
 *   ],
 *   variables: { threshold: 0.8 }
 * });
 *
 * // Execute workflow
 * const engine = new WorkflowEngine();
 * const result = await engine.execute(workflow, 'hello world');
 *
 * if (result.status === WorkflowStatus.COMPLETED) {
 *   console.log('Output:', result.output);
 * }
 * ```
 */

// Steps
export {
  type WorkflowStepContext,
  type WorkflowStepResult,
  WorkflowStepStatus,
  WorkflowStep,
} from './WorkflowStep.js';

// Workflow
export {
  type WorkflowMetadata,
  WorkflowStatus,
  Workflow,
} from './Workflow.js';

// Engine
export {
  type WorkflowExecutionConfig,
  type WorkflowExecutionResult,
  WorkflowEngine,
} from './WorkflowEngine.js';

// Repository
export {
  type WorkflowRepository,
  InMemoryWorkflowRepository,
} from './WorkflowRepository.js';

// Pre-built steps
export { TransformStep, ConditionalStep } from './steps/index.js';
