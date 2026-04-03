/** Vibration API wrapper — silently no-ops on unsupported devices. */

function vibrate(pattern: number | number[]): void {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    navigator.vibrate(pattern);
  }
}

/** Short tap feedback (button presses) */
export function hapticLight(): void {
  vibrate(10);
}

/** Confirmation feedback (hint/answer submitted) */
export function hapticSuccess(): void {
  vibrate([15, 50, 30]);
}

/** Error feedback (wrong answer) */
export function hapticError(): void {
  vibrate([80, 40, 80]);
}

/** Heavy celebration feedback (final result) */
export function hapticHeavy(): void {
  vibrate([50, 30, 80, 30, 120]);
}
