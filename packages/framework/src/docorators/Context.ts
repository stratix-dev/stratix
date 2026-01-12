import { ClassConstructor } from '@stratix/core';

export interface ContextOptions {
  commandHandlers?: ClassConstructor[];
}

export function Context(options: ContextOptions = {}) {
  return function <T extends new (...args: any[]) => any>(
    target: T,
    context: ClassDecoratorContext
  ) {
    if (context.kind !== 'class') {
      throw new Error('@Context can only be applied to classes');
    }

    // You can add metadata storage logic here if needed

    return target;
  };
}
