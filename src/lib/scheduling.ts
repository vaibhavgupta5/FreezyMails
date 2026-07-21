/**
 * Distributes jobs across a 4-hour window if pacingType is SLOW, otherwise schedules them immediately.
 */
export function distributeJobs<T extends { options?: { startAfter?: number | Date | string } }>(
  jobs: T[],
  pacingType: 'SLOW' | 'FAST' | string,
  baseDate: Date = new Date()
): T[] {
  if (pacingType === 'FAST') {
    // Return jobs as is (or reset startAfter if they had one)
    return jobs.map(job => ({
      ...job,
      options: {
        ...(job.options || {}),
        startAfter: undefined
      }
    }));
  }

  // SLOW drip logic
  // Distribute emails randomly over a 4-hour window starting from baseDate
  const WINDOW_MILLIS = 4 * 60 * 60 * 1000; // 4 hours

  return jobs.map(job => {
    // Get a random millisecond offset within the 4-hour window
    const randomOffset = Math.floor(Math.random() * WINDOW_MILLIS);
    
    // Create the target date by adding the offset to the base date
    const targetDate = new Date(baseDate.getTime() + randomOffset);
    
    return {
      ...job,
      options: {
        ...(job.options || {}),
        startAfter: targetDate.toISOString()
      }
    };
  });
}
