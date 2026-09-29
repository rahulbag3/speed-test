import type { SpeedSample } from "./measure";

/**
 * Build the series a graph should draw.
 *
 * The curve is made of instantaneous 120 ms measurements, but the headline
 * number is the *average* across the whole transfer. Without this the line
 * simply stops wherever the last window happened to land, so the graph appears
 * to disagree with the result printed above it. Extending the series by one
 * point makes the curve finish exactly on the reported figure - and when the
 * average is below the peak, that small dip into it is the honest picture of a
 * connection that peaked and then settled.
 *
 * While a test is still running `finalValue` is null, so the series is just the
 * live samples and the curve grows in real time.
 */
export function toSeries(
  samples: SpeedSample[],
  finalValue: number | null | undefined,
): SpeedSample[] {
  if (finalValue == null || !Number.isFinite(finalValue) || samples.length === 0) {
    return samples;
  }

  const last = samples[samples.length - 1];

  // Already sitting on the result; adding a duplicate would just look odd.
  if (Math.abs(last.mbps - finalValue) < 0.05) return samples;

  const previous = samples.length > 1 ? samples[samples.length - 2] : null;
  // Match the existing cadence so the x axis stays evenly spaced.
  const gap = previous ? Math.max(1, last.t - previous.t) : 120;

  return [...samples, { t: last.t + gap, mbps: finalValue }];
}
