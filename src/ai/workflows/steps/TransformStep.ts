import { WorkflowStep } from '../WorkflowStep.js';
import type { WorkflowStepContext, WorkflowStepResult } from '../WorkflowStep.js';

/**
 * Step that transforms data using a function.
 *
 * Useful for simple data transformations between steps.
 *
 * @example
 * ```TypeScript
 * const uppercase = new TransformStep(
 *   'to-uppercase',
 *   'Convert to Uppercase',
 *   (text: string) => text.toUpperCase()
 * );
 *
 * const result = await uppercase.execute('hello', context);
 * // result.output === 'HELLO'
 * ```
 */
export class TransformStep<TInput, TOutput> extends WorkflowStep<TInput, TOutput> {
  constructor(
    private readonly stepId: string,
    private readonly stepName: string,
    private readonly transform: (input: TInput) => TOutput | Promise<TOutput>,
    private readonly stepDescription?: string
  ) {
    super();
  }

  get id(): string {
    return this.stepId;
  }

  get name(): string {
    return this.stepName;
  }

  get description(): string | undefined {
    return this.stepDescription;
  }

  async execute(
    input: TInput,
    _context: WorkflowStepContext
  ): Promise<WorkflowStepResult<TOutput>> {
    try {
      const output = await this.transform(input);
      return this.success(output);
    } catch (error) {
      return this.failure(error instanceof Error ? error : new Error(String(error)));
    }
  }
}
