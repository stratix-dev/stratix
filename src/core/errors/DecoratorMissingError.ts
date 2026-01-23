import { FrameworkError } from './FrameworkError.js';

export class DecoratorMissingError extends FrameworkError {
  constructor(decoratorName: string, targetName: string) {
    super(
      'DECORATOR_MISSING_ERROR',
      `The required @${decoratorName} decorator is missing on ${targetName}.`
    );
    this.name = 'DecoratorMissingError';
  }
}
