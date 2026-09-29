/**
 * Demonstrates the burst problem, and that smoothing fixes what is *displayed*
 * without touching the reported result.
 *
 * A connection can deliver several hundred Mbps for a short moment and then
 * settle. Measuring 120 ms slices and plotting those directly makes the graph
 * claim a speed the line does not sustain. This harness measures both ways over
 * the same transfer and compares them.
 *
 * Run with: npm run test:burst
 */

const CF_DOWN = "https://speed.cloudflare.com/__down";
const CHUNK = 25_000_000;
const DURATION = 6_000;
const TICK = 120;
const WINDOW = 1_000;
const MAX_STEP_RATIO = 0.2;
const MAX_STEP_FLOOR = 20;

const bust = () => `t=${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const mbps = (bytes, ms) => (bytes * 8) / (ms / 1000) / 1e6;

let failures = 0;
const check = (name, ok, detail = "") => {
  if (ok) console.log(`ok   ${name}`);
  else {
    failures += 1;
    console.log(`FAIL ${name}${detail ? `\n  ${detail}` : ""}`);
  }
};

const median = (values) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];

/** Largest single step between consecutive readings: a direct measure of jitter. */
function biggestJump(series) {
  let worst = 0;
  for (let i = 1; i < series.length; i += 1) {
    worst = Math.max(worst, Math.abs(series[i].mbps - series[i - 1].mbps));
  }
  return worst;
}

// Warm up, so this measures the same thing the app measures.
await fetch(`${CF_DOWN}?bytes=10000000&${bust()}`, { cache: "no-store" })
  .then((r) => (r.body ? r.body.cancel() : undefined))
  .catch(() => undefined);

const start = performance.now();
let total = 0;
let lastTickAt = start;

/** Two series from one transfer: raw per-tick, and trailing-window smoothed. */
const raw = [];
const smooth = [];
let emitted = 0;
const windowPoints = [{ at: start, cumulative: 0 }];

while (performance.now() - start < DURATION) {
  const res = await fetch(`${CF_DOWN}?bytes=${CHUNK}&${bust()}`, { cache: "no-store" });
  if (!res.body) break;
  const reader = res.body.getReader();

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;

    const now = performance.now();

    if (now - lastTickAt >= TICK) {
      // Raw: everything since the previous tick.
      raw.push({ t: now - start, mbps: mbps(total, now - lastTickAt) });
      lastTickAt = now;

      // Smoothed: trailing window, then a limit on how far it may move.
      windowPoints.push({ at: now, cumulative: total });
      const cutoff = now - WINDOW;
      while (windowPoints.length > 1 && windowPoints[0].at < cutoff) windowPoints.shift();
      const first = windowPoints[0];
      if (now - first.at >= WINDOW * 0.5) {
        const measured = mbps(total - first.cumulative, now - first.at);
        const cap = Math.max(emitted * MAX_STEP_RATIO, MAX_STEP_FLOOR);
        emitted += Math.max(-cap, Math.min(cap, measured - emitted));
        smooth.push({ t: now - start, mbps: emitted });
      }
    }

    if (performance.now() - start >= DURATION) {
      await reader.cancel().catch(() => undefined);
      break;
    }
  }
}

const elapsed = performance.now() - start;
const result = mbps(total, elapsed);

const rawPeak = Math.max(...raw.map((s) => s.mbps));
const smoothPeak = Math.max(...smooth.map((s) => s.mbps));
const rawMedian = median(raw.map((s) => s.mbps));
const smoothMedian = median(smooth.map((s) => s.mbps));

console.log(`  transferred      ${(total / 1e6).toFixed(1)} MB in ${(elapsed / 1000).toFixed(2)}s`);
console.log(`  RESULT           ${result.toFixed(1)} Mbps  (total bytes / total time)`);
console.log(`\n  raw 120 ms slices   peak ${rawPeak.toFixed(0)}  median ${rawMedian.toFixed(0)}  n=${raw.length}`);
console.log(`  smoothed ${WINDOW}ms     peak ${smoothPeak.toFixed(0)}  median ${smoothMedian.toFixed(0)}  n=${smooth.length}`);
console.log(
  `\n  raw peak = ${(rawPeak / result).toFixed(1)}x the result; smoothed peak = ${(smoothPeak / result).toFixed(1)}x`,
);

check("raw slices overstate the result badly", rawPeak > result * 2, `peak ${rawPeak.toFixed(0)} vs result ${result.toFixed(0)}`);
check("smoothing cuts the peak substantially", smoothPeak < rawPeak * 0.25, `${rawPeak.toFixed(0)} -> ${smoothPeak.toFixed(0)}`);

// Jitter: the biggest single step between neighbouring readings. This is what
// makes a number look like it is flickering rather than being measured.
const rawJump = biggestJump(raw);
const smoothJump = biggestJump(smooth);
console.log(`\n  biggest single step   raw ${rawJump.toFixed(0)} Mbps   smoothed ${smoothJump.toFixed(0)} Mbps`);
check("smoothing removes the large jumps", smoothJump < rawJump * 0.3, `${rawJump.toFixed(0)} -> ${smoothJump.toFixed(0)}`);
check("no reading moves more than the step limit", smoothJump <= Math.max(smoothMedian * MAX_STEP_RATIO, MAX_STEP_FLOOR) * 1.5, `${smoothJump.toFixed(0)} Mbps`);

// The headline claim: once smoothed, the *typical* reading matches the number
// that is actually reported. A graph whose middle disagrees with its own result
// is precisely the bug being fixed here.
check(
  "smoothed median matches the reported result",
  Math.abs(smoothMedian - result) / result < 0.2,
  `median ${smoothMedian.toFixed(0)} vs result ${result.toFixed(0)}`,
);
check(
  "raw median is wildly off the result",
  Math.abs(rawMedian - result) / result > 0.5,
  `raw median ${rawMedian.toFixed(0)} vs result ${result.toFixed(0)}`,
);

// A short burst above the average is real and worth showing; a graph pinned at
// several times the result is not.
check(
  "smoothed peak stays within a sane multiple of the result",
  smoothPeak < result * 2.5,
  `peak ${smoothPeak.toFixed(0)} vs result ${result.toFixed(0)}`,
);

console.log(
  `\n  before: the graph's typical reading was ${rawMedian.toFixed(0)} Mbps against a real ${result.toFixed(0)}`,
);
console.log(`  after:  the graph's typical reading is ${smoothMedian.toFixed(0)} Mbps`);

console.log(failures === 0 ? "\nBurst behaviour confirmed and handled." : `\n${failures} check(s) failed.`);
if (failures > 0) process.exitCode = 1;
