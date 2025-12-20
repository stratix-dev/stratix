/**
 * Merge strategies for combining configuration from multiple providers
 */

export type MergeStrategy = 'first-wins' | 'last-wins' | 'merge';

/**
 * Apply first-wins strategy: first non-undefined value wins
 */
export function firstWins<T>(values: (T | undefined)[]): T | undefined {
  return values.find(v => v !== undefined);
}

/**
 * Apply last-wins strategy: last non-undefined value wins
 */
export function lastWins<T>(values: (T | undefined)[]): T | undefined {
  for (let i = values.length - 1; i >= 0; i--) {
    if (values[i] !== undefined) {
      return values[i];
    }
  }
  return undefined;
}

/**
 * Apply merge strategy: deep merge objects, last-wins for primitives
 */
export function merge<T>(values: (T | undefined)[]): T | undefined {
  const definedValues = values.filter(v => v !== undefined) as T[];

  if (definedValues.length === 0) {
    return undefined;
  }

  if (definedValues.length === 1) {
    return definedValues[0];
  }

  // Check if all values are objects (not arrays, not null)
  const allObjects = definedValues.every(
    v => typeof v === 'object' && v !== null && !Array.isArray(v)
  );

  if (!allObjects) {
    // For primitives or arrays, use last-wins
    return definedValues[definedValues.length - 1];
  }

  // Deep merge objects
  return deepMerge(definedValues as Record<string, unknown>[]) as T;
}

/**
 * Deep merge multiple objects
 */
function deepMerge(objects: Record<string, unknown>[]): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const obj of objects) {
    for (const key in obj) {
      const resultValue = result[key];
      const objValue = obj[key];

      if (
        typeof resultValue === 'object' &&
        resultValue !== null &&
        !Array.isArray(resultValue) &&
        typeof objValue === 'object' &&
        objValue !== null &&
        !Array.isArray(objValue)
      ) {
        result[key] = deepMerge([
          resultValue as Record<string, unknown>,
          objValue as Record<string, unknown>,
        ]);
      } else {
        result[key] = objValue;
      }
    }
  }

  return result;
}

/**
 * Apply the specified merge strategy
 */
export function applyStrategy<T>(
  strategy: MergeStrategy,
  values: (T | undefined)[]
): T | undefined {
  switch (strategy) {
    case 'first-wins':
      return firstWins(values);
    case 'last-wins':
      return lastWins(values);
    case 'merge':
      return merge(values);
    default:
      throw new Error(`Unknown merge strategy: ${strategy as string}`);
  }
}
