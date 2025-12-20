/**
 * Built-in value transformers for environment variables
 */

/**
 * Transform string to number
 */
export function toNumber(value: string): number {
  const num = Number(value);
  if (isNaN(num)) {
    throw new Error(`Cannot convert "${value}" to number`);
  }
  return num;
}

/**
 * Transform string to integer
 */
export function toInt(value: string): number {
  const num = parseInt(value, 10);
  if (isNaN(num)) {
    throw new Error(`Cannot convert "${value}" to integer`);
  }
  return num;
}

/**
 * Transform string to float
 */
export function toFloat(value: string): number {
  const num = parseFloat(value);
  if (isNaN(num)) {
    throw new Error(`Cannot convert "${value}" to float`);
  }
  return num;
}

/**
 * Transform string to boolean
 * Accepts: "true", "1", "yes", "on" (case insensitive)
 */
export function toBoolean(value: string): boolean {
  const normalized = value.toLowerCase().trim();
  if (['true', '1', 'yes', 'on'].includes(normalized)) {
    return true;
  }
  if (['false', '0', 'no', 'off'].includes(normalized)) {
    return false;
  }
  throw new Error(`Cannot convert "${value}" to boolean`);
}

/**
 * Transform string to array (comma-separated)
 */
export function toArray(value: string): string[] {
  return value.split(',').map(v => v.trim()).filter(v => v.length > 0);
}

/**
 * Transform string to JSON object
 */
export function toJSON<T = unknown>(value: string): T {
  try {
    return JSON.parse(value) as T;
  } catch (error) {
    throw new Error(`Cannot parse JSON: ${value}`);
  }
}

/**
 * Auto-detect and transform value based on its content
 */
export function autoTransform(value: string): unknown {
  // Boolean
  if (['true', 'false'].includes(value.toLowerCase())) {
    return toBoolean(value);
  }

  // Number (integer or float)
  if (/^-?\d+(\.\d+)?$/.test(value)) {
    return toNumber(value);
  }

  // JSON array or object
  if ((value.startsWith('[') && value.endsWith(']')) ||
      (value.startsWith('{') && value.endsWith('}'))) {
    try {
      return toJSON(value);
    } catch {
      return value;
    }
  }

  // Array (comma-separated)
  if (value.includes(',')) {
    return toArray(value);
  }

  // Default: string
  return value;
}
