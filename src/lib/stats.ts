/**
 * Calculates the Z-score for comparing two proportions.
 * @param successA Number of successes (e.g. replies) for variant A
 * @param totalA Total sample size (e.g. sends) for variant A
 * @param successB Number of successes for variant B
 * @param totalB Total sample size for variant B
 * @returns The Z-score or null if sample size is 0
 */
export function calculateZScore(successA: number, totalA: number, successB: number, totalB: number): number | null {
  if (totalA === 0 || totalB === 0) return null;

  const pA = successA / totalA;
  const pB = successB / totalB;
  const pPool = (successA + successB) / (totalA + totalB);

  // Standard error
  const se = Math.sqrt(pPool * (1 - pPool) * ((1 / totalA) + (1 / totalB)));
  
  if (se === 0) return 0; // Same proportions

  return (pA - pB) / se;
}

/**
 * Calculates a rough confidence level from a Z-score.
 * This is an approximation of the cumulative normal distribution.
 */
export function zScoreToConfidence(z: number): number {
  const absZ = Math.abs(z);
  // Approximation constants
  const p = 0.3275911;
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;

  const sign = z < 0 ? -1 : 1;
  const t = 1 / (1 + p * absZ);
  const erf = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-absZ * absZ);
  
  return 0.5 * (1 + sign * erf);
}
