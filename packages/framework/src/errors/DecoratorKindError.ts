import { FrameworkError } from './FrameworkError.js';

export class DecoratorKindError extends FrameworkError {
  constructor(decoratorName: string, expectedKind: string, actualKind: string) {
    super(
      'DECORATOR_KIND_ERROR',
      `@${decoratorName} can only be applied to ${expectedKind}s, but was applied to a ${actualKind}.`
    );
    this.name = 'DecoratorKindError';
  }
}
