import crypto from 'crypto';

/**
 * Returns an integer between 0 and 99 (inclusive) based on the string input.
 * This ensures that a given recipient on a given campaign always hashes to the same value.
 */
export function hashToPercentile(input: string): number {
  const hash = crypto.createHash('sha256').update(input).digest('hex');
  // Parse the first 8 characters (32 bits) as an integer
  const intVal = parseInt(hash.substring(0, 8), 16);
  return intVal % 100;
}

/**
 * Distributes an item into a bucket based on a stable hash percentile.
 * @param hashInput - The string used to compute the percentile.
 * @param options - An array of objects, each with an id and splitPercent.
 *                  The sum of splitPercents should ideally be 100.
 * @returns The id of the selected variant, or null if no options.
 */
export function assignStableBucket(
  hashInput: string,
  options: { id: string; splitPercent: number }[]
): string | null {
  if (options.length === 0) return null;
  if (options.length === 1) return options[0].id;

  const percentile = hashToPercentile(hashInput);
  
  let cumulative = 0;
  for (const option of options) {
    cumulative += option.splitPercent;
    if (percentile < cumulative) {
      return option.id;
    }
  }

  // Fallback to the last option if rounding errors prevented reaching 100
  return options[options.length - 1].id;
}
