import type { Strategy } from '../definitions/plugin-config.js';

/**
 * Ensures that the given value is always returned as an array.
 *
 * @param value - A single item, an array of items, or null/undefined.
 * @returns An array. If the input is not an array, it will be wrapped into one.
 */
export function toArray<T>(value: T | T[] | undefined | null): T[] {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
}

/**
 * Returns the configured publish strategies or the default single strategy.
 */
export function getStrategies(strategies: Strategy[] | undefined): Strategy[] {
  return strategies || [{}];
}
