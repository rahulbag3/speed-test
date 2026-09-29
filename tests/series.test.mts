/**
 * Tests for the graph series.
 *
 * The important property: the curve the user sees must finish on the same
 * number printed in the card header. It is built from instantaneous 120 ms
 * samples, whereas the headline figure is the average, so without a terminal
 * point the line ends somewhere else entirely.
 *
 * Run with: npm run test:series
 */

import { toSeries } from "../src/lib/speedtest/series";
import type { SpeedSample } from "../src/lib/speedtest/measure";

let failures = 0;
let total = 0;

function check(name: string, ok: boolean, detail = "") {
  total += 1;
  if (ok) {
    console.log(`ok   ${name}`);
  } else {
    failures += 1;
    console.log(`FAIL ${name}${detail ? `\n  ${detail}` : ""}`);
  }
}

const samples: SpeedSample[] = [
  { t: 0, mbps: 40 },
  { t: 120, mbps: 90 },
  { t: 240, mbps: 70 },
  { t: 360, mbps: 55 },
];

// While the test is running there is no result, so nothing is appended.
check("running test is untouched", toSeries(samples, null).length === samples.length);
check(
  "undefined result is untouched",
  toSeries(samples, undefined).length === samples.length,
);

// The key behaviour: the curve terminates on the average.
const ended = toSeries(samples, 62.5);
check("a terminal point is appended", ended.length === samples.length + 1);
check(
  "curve ends exactly on the result",
  ended[ended.length - 1].mbps === 62.5,
  `ended on ${ended[ended.length - 1].mbps}`,
);
check(
  "terminal point continues the cadence",
  ended[ended.length - 1].t - ended[ended.length - 2].t === 120,
  `gap was ${ended[ended.length - 1].t - ended[ended.length - 2].t}`,
);
check(
  "original samples are not mutated",
  samples.length === 4 && samples[3].mbps === 55,
);

// A result below the last sample dips down; above it rises. Either way it lands
// on the result.
const dipping = toSeries(samples, 10);
check("dip ends on the result", dipping[dipping.length - 1].mbps === 10);

const rising = toSeries(samples, 300);
check("rise ends on the result", rising[rising.length - 1].mbps === 300);

// No duplicate point when the last sample already *is* the result.
const already = toSeries(samples, 55);
check("no duplicate when already on the result", already.length === samples.length);

const near = toSeries(samples, 55.01);
check("near-identical result is not duplicated", near.length === samples.length);

// Degenerate inputs.
check("empty samples stay empty", toSeries([], 50).length === 0);
check("NaN result is ignored", toSeries(samples, Number.NaN).length === samples.length);
check("infinite result is ignored", toSeries(samples, Number.POSITIVE_INFINITY).length === samples.length);

const single = toSeries([{ t: 0, mbps: 20 }], 30);
check(
  "single sample gets a sensible gap",
  single.length === 2 && single[1].t === 120,
  `got ${JSON.stringify(single[1])}`,
);

console.log(`\n${total - failures}/${total} checks passed.`);
if (failures > 0) {
  console.log(`${failures} test(s) failed.`);
  process.exitCode = 1;
}
