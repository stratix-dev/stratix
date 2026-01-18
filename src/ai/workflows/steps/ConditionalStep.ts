import { WorkflowStep } from '../WorkflowStep.js';
import type { WorkflowStepContext, WorkflowStepResult } from '../WorkflowStep.js';

/**
 * Step that conditionally executes based on a predicate.
 *
 * If the condition is false, the step is skipped.
 *
 * @example
 * ```TypeScript
 * const step = new ConditionalStep(
 *   'check-premium',
 *   'Premium User Check',
 *   (input, context) => {
 *     const user = context.getVariable('user');
 *     return user.isPremium;
 *   },
 *   premiumFeatureStep
 * );
 * ```
 */
export class ConditionalStep<TInput, TOutput> extends WorkflowStep<TInput, TOutput> {
  constructor(
    private readonly stepId: string,
    private readonly stepName: string,
    private readonly condition: (
      input: TInput,
      context: WorkflowStepContext
    ) => boolean | Promise<boolean>,
    private readonly whenTrue: WorkflowStep<TInput, TOutput>,
    private readonly whenFalse?: WorkflowStep<TInput, TOutput>
  ) {
    super();
  }

  get id(): string {
    return this.stepId;
  }

  get name(): string {
    return this.stepName;
  }

  async execute(input: TInput, context: WorkflowStepContext): Promise<WorkflowStepResult<TOutput>> {
    try {
      const conditionResult = await this.condition(input, context);

      if (conditionResult) {
        return await this.whenTrue.execute(input, context);
      } else if (this.whenFalse) {
        return await this.whenFalse.execute(input, context);
      } else {
        return this.skipped({ reason: 'Condition not met' });
      }
    } catch (error) {
      return this.failure(error instanceof Error ? error : new Error(String(error)));
    }
  }
}
