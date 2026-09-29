"use client";

import { type TestServer } from "./servers";

/**
 * Speed test measurement.
 *
 * The browser is the measuring instrument: we time how long it takes to move a
 * known number of bytes, in both directions, and turn that into a rate. The
 * target server is explicit, because measuring against the machine you are
 * sitting on would just report loopback speed - see ./servers.ts.
 */

/** One point on the live speed graph. */
export interface SpeedSample {
  /** Milliseconds since the phase started. */
  t: number;
  mbps: number;
}

export type Direction = "download" | "upload";

/**
 * The test is time-boxed, not size-boxed.
 *
 * A fixed payload is only right at one speed. 20 MB is a sensible few seconds on
 * a 100 Mbps line, but on a gigabit connection it finishes in 0.16 s - far too
 * short for the measurement to mean anything, and short enough that TCP slow
 * start dominates, so a 1 Gbps line would report as a few hundred Mbps.
 *
 * So each phase pulls/repeats modest chunks for a fixed *duration* and divides
 * the bytes actually moved by the time taken. That gives every connection a
 * sample long enough to be meaningful.
 */

/** Bytes per request. Large enough to keep the pipe busy, small enough to
 *  cancel cheaply when the time box runs out. */
const DOWNLOAD_CHUNK = 25_000_000;
const UPLOAD_CHUNK = 8_000_000;

/** How long each measured phase runs. */
const DOWNLOAD_DURATION = 6_000;
const UPLOAD_DURATION = 6_000;

/**
 * Untimed payload used to open the TCP connection first.
 *
 * Without this, slow start is counted as your bandwidth: a connection spends the
 * first few hundred milliseconds ramping its congestion window open, which
 * would drag a good line down towards a bad one's result. It has to be
 * generous enough to actually open the window on a high bandwidth-delay path.
 */
const WARMUP_BYTES = 10_000_000;

const PING_ROUNDS = 5;

/**
 * How long a single ping may take before it is written off as lost.
 *
 * Comfortably longer than any real round trip, so a merely slow - not lost -
 * packet is still measured rather than miscounted.
 */
const PING_TIMEOUT = 3_000;

/** How often to emit a sample, in milliseconds. */
const SAMPLE_INTERVAL = 120;

/**
 * Trailing window used for the *displayed* rate.
 *
 * Connections burst: a full TCP receive window drains at once, the browser hands
 * JavaScript data it has already buffered, an ISP has burst credit. Plotting
 * short slices shows those as though they were the line's speed - measured over
 * 120 ms this connection's graph claimed a median of 3551 Mbps against a real
 * 135. A one second trailing average reports the rate actually being sustained,
 * which is the figure the result is quoted at.
 *
 * This only affects the graph and the live dial. The reported result is still
 * total bytes over total time.
 */
const SMOOTHING_WINDOW = 1_000;

/**
 * How far a displayed reading may move between two consecutive samples.
 *
 * Even a one second window leaves real throughput wobble that reads as the
 * number flickering. Limiting the step makes the reading glide to its new value
 * instead of jumping to it, while still converging on the true rate within a
 * few hundred milliseconds. It never changes the reported result.
 */
const MAX_STEP_RATIO = 0.2;

/** Absolute floor for that limit, so a reading near zero can still climb. */
const MAX_STEP_FLOOR = 20;

/** Hard ceiling on a single phase, in case the loop misbehaves. */
const PHASE_TIMEOUT = 60_000;

export class SpeedTestError extends Error {}

function toMbps(bytes: number, milliseconds: number): number {
  if (milliseconds <= 0) return 0;
  return (bytes * 8) / (milliseconds / 1000) / 1_000_000;
}

const median = (values: number[]): number => {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
};

function cacheBuster(): string {
  return `t=${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Fill a buffer with unpredictable bytes.
 *
 * Random content matters: an all-zero or repeating payload would be trivially
 * compressed by any proxy in the path, and the measured speed would be a lie.
 * `crypto.getRandomValues` is capped at 64 KiB per call, so this fills in
 * chunks.
 *
 * The return type is pinned to `Uint8Array<ArrayBuffer>` (rather than the
 * default `ArrayBufferLike`) so the result is directly usable as a `fetch`
 * body without a cast.
 */
function randomBytes(length: number): Uint8Array<ArrayBuffer> {
  const buffer = new Uint8Array(new ArrayBuffer(length));
  const CHUNK = 65_536;
  for (let offset = 0; offset < length; offset += CHUNK) {
    crypto.getRandomValues(buffer.subarray(offset, Math.min(offset + CHUNK, length)));
  }
  return buffer;
}

/* ------------------------------------------------------------------ */
/* Rate sampling                                                        */
/* ------------------------------------------------------------------ */

/**
 * Turns a stream of byte counts into a smooth speed series.
 *
 * Sampling on a fixed timer rather than on incoming chunks is deliberate: a
 * CDN may hand the whole response over in one gulp, which would otherwise give
 * a graph with a single point.
 *
 * The rate is reported over a **trailing window** rather than between adjacent
 * ticks. This matters more than it sounds. A connection can genuinely deliver
 * several hundred Mbps for a moment - a full receive window drains at once, a
 * CDN has the bytes buffered, the ISP has burst credit - and then settle to its
 * sustained rate. Measuring 120 ms slices plots those bursts as if they were
 * your speed: the graph spikes to 500 Mbps while the line really does 130.
 *
 * A ~500 ms trailing average shows the rate the connection is actually
 * sustaining, which is the number the user cares about. The *reported result*
 * is unaffected: it is total bytes over total time, and smoothing only changes
 * what gets drawn.
 */
class RateSampler {
  private total = 0;
  private startedAt = 0;
  private timer: ReturnType<typeof setInterval> | null = null;
  /** Timestamped cumulative totals inside the trailing window. */
  private window: { at: number; cumulative: number }[] = [];
  /** Last reading handed out, used to limit how far the next one may move. */
  private emitted = 0;

  constructor(
    private readonly onSample: (sample: SpeedSample) => void,
    private readonly interval = SAMPLE_INTERVAL,
  ) {}

  start(): void {
    this.startedAt = performance.now();
    this.window = [{ at: this.startedAt, cumulative: 0 }];
    this.emitted = 0;
    this.timer = setInterval(() => this.tick(), this.interval);
  }

  /** Record bytes that have moved. */
  add(bytes: number): void {
    this.total += bytes;
  }

  private tick(): void {
    const now = performance.now();
    this.window.push({ at: now, cumulative: this.total });

    // Drop everything older than the window, but always keep the entry we
    // measure back to.
    const cutoff = now - SMOOTHING_WINDOW;
    while (this.window.length > 1 && this.window[0].at < cutoff) {
      this.window.shift();
    }

    const first = this.window[0];
    const span = now - first.at;

    /*
     * Wait for the window to be nearly full before trusting it.
     *
     * A half-filled window divides the bytes seen so far by a short span at the
     * exact moment the connection has just opened, when a CDN hands over its
     * first gulp in one burst. That combination reports the burst as though it
     * were a sustained rate, and it lands as the peak marker on a graph whose
     * real peak is lower - the spike the reading appears to make off the mark.
     * Requiring a full window costs about a third of a second of blank graph at
     * the very start, and never reports a rate the connection did not sustain.
     */
    if (span < SMOOTHING_WINDOW * 0.9) return;

    const measured = toMbps(this.total - first.cumulative, span);

    // Limit the step so the reading eases to its new value. Without this the
    // number flickers with every wobble in throughput even though the average
    // barely moves.
    const cap = Math.max(this.emitted * MAX_STEP_RATIO, MAX_STEP_FLOOR);
    const delta = measured - this.emitted;
    this.emitted += Math.max(-cap, Math.min(cap, delta));

    this.onSample({
      t: now - this.startedAt,
      mbps: this.emitted,
    });
  }

  /** Stop the timer. Safe to call more than once. */
  stop(): void {
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  /**
   * Average speed across the whole transfer.
   *
   * Computed from the raw totals, not from the smoothed samples, so the number
   * the user is shown is exactly the throughput that was achieved.
   *
   * Separate from `stop()` on purpose: callers run it from a `finally` block,
   * and returning a value from `finally` would swallow any real error.
   */
  average(): number {
    return toMbps(this.total, performance.now() - this.startedAt);
  }

  get bytes(): number {
    return this.total;
  }
}


/* ------------------------------------------------------------------ */
/* Ping                                                                 */
/* ------------------------------------------------------------------ */

/**
 * Measure round trip time and packet loss with several small requests.
 *
 * The median is reported rather than the mean, because a single stalled packet
 * should not drag the result around.
 *
 * Loss is counted rather than thrown on: a dropped packet is a *measurement*,
 * not a failure, and it is exactly what the user needs to know about. Each ping
 * gets its own timeout so a lost packet costs a few seconds rather than hanging
 * the test on a request the browser will never resolve.
 *
 * Two things are deliberately not counted as loss: an abort (the user pressed
 * stop) and an HTTP error status (the server answered, so nothing was dropped).
 */
export async function measureLatency(
  server: TestServer,
  signal: AbortSignal,
): Promise<{ latency: number; jitter: number; loss: number }> {
  const samples: number[] = [];
  let lost = 0;

  for (let i = 0; i < PING_ROUNDS; i += 1) {
    if (signal.aborted) throw new DOMException("Aborted", "AbortError");
    const start = performance.now();

    try {
      const response = await fetch(server.pingUrl(cacheBuster()), {
        method: "HEAD",
        cache: "no-store",
        // Either the user stops the test, or this one ping is simply not
        // coming back and should be written off after a few seconds.
        signal: AbortSignal.any([signal, AbortSignal.timeout(PING_TIMEOUT)]),
        mode: "cors",
      });
      if (!response.ok) throw new SpeedTestError(`Ping failed (${response.status})`);
      samples.push(performance.now() - start);
    } catch (error) {
      if (signal.aborted) throw new DOMException("Aborted", "AbortError");
      // A server that answers with an error reached us; the packet was not lost.
      if (error instanceof SpeedTestError) throw error;
      lost += 1;
    }
  }

  // Nothing got through, so there is no latency to report - only the loss.
  if (samples.length === 0) {
    throw new SpeedTestError("The test server did not respond to any ping");
  }

  const latency = median(samples);
  // Jitter: mean absolute deviation from the median.
  const jitter =
    samples.reduce((total, value) => total + Math.abs(value - latency), 0) / samples.length;

  return { latency, jitter, loss: (lost / PING_ROUNDS) * 100 };
}

/* ------------------------------------------------------------------ */
/* Download                                                             */
/* ------------------------------------------------------------------ */

/** Download a payload we intend to throw away, to open the TCP window. */
export async function warmUp(server: TestServer, signal: AbortSignal): Promise<void> {
  try {
    const response = await fetch(server.downloadUrl(WARMUP_BYTES, cacheBuster()), {
      cache: "no-store",
      signal,
      mode: "cors",
    });
    if (response.body) await response.body.cancel().catch(() => undefined);
  } catch {
    // Warm-up is an optimisation. If it fails the real test can still run.
  }
}

/**
 * Download for a fixed duration and report the average, plus a live sample
 * stream.
 *
 * Chunks are requested back to back until the time box runs out, and the answer
 * is the bytes actually moved divided by the elapsed time. Backing the requests
 * up also keeps the connection hot, which is a truer picture of sustained
 * throughput than timing a single response would be.
 */
export async function measureDownload(
  server: TestServer,
  signal: AbortSignal,
  onSample: (sample: SpeedSample) => void,
): Promise<number> {
  const sampler = new RateSampler(onSample);
  sampler.start();

  const until = performance.now() + DOWNLOAD_DURATION;
  const hardStop = performance.now() + PHASE_TIMEOUT;

  try {
    while (performance.now() < until && !signal.aborted) {
      if (performance.now() > hardStop) break;

      const response = await fetch(server.downloadUrl(DOWNLOAD_CHUNK, cacheBuster()), {
        cache: "no-store",
        signal,
        mode: "cors",
      });

      if (!response.ok || !response.body) {
        throw new SpeedTestError(`Download failed (${response.status})`);
      }

      const reader = response.body.getReader();
      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value) sampler.add(value.byteLength);

          // Stop the moment the box is full, and drop the rest of this chunk.
          if (performance.now() >= until || performance.now() > hardStop) {
            await reader.cancel().catch(() => undefined);
            break;
          }
        }
      } finally {
        // Always release the connection, whatever happened. Deliberately no
        // `return` here, so a real network error is not swallowed.
        reader.cancel().catch(() => undefined);
      }
    }
  } finally {
    sampler.stop();
  }

  if (sampler.bytes === 0) throw new SpeedTestError("No data received");
  return sampler.average();
}

/* ------------------------------------------------------------------ */
/* Upload                                                               */
/* ------------------------------------------------------------------ */

/**
 * Send one upload chunk, resolving when it completes or when the deadline hits.
 *
 * Resolves rather than rejects on the deadline, because running out of time is
 * the normal ending - the bytes that made it are a valid measurement.
 */
function postChunk(
  url: string,
  body: Uint8Array<ArrayBuffer>,
  signal: AbortSignal,
  deadline: number,
  onBytes: (bytes: number) => void,
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const request = new XMLHttpRequest();
    let settled = false;

    const cleanup = () => {
      clearTimeout(timer);
      signal.removeEventListener("abort", onAbort);
    };
    const succeed = () => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve();
    };
    const fail = (error: Error) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(error);
    };
    const onAbort = () => fail(new DOMException("Aborted", "AbortError"));

    // Whatever happens, stop this chunk when the time box is full.
    const timer = setTimeout(
      () => {
        if (settled) return;
        // `abort` fires onabort, so settle first to keep it from rejecting.
        succeed();
        request.abort();
      },
      Math.max(0, deadline - performance.now()),
    );

    signal.addEventListener("abort", onAbort, { once: true });

    let sent = 0;
    request.open("POST", url, true);
    request.setRequestHeader("Content-Type", "application/octet-stream");

    request.upload.onprogress = (event) => {
      if (!event.lengthComputable) return;
      onBytes(event.loaded - sent);
      sent = event.loaded;
    };

    request.onload = () => {
      if (request.status >= 200 && request.status < 300) succeed();
      else fail(new SpeedTestError(`Upload failed (${request.status})`));
    };
    request.onerror = () =>
      fail(new SpeedTestError("Upload failed. The server may block this request."));
    request.onabort = () => fail(new DOMException("Aborted", "AbortError"));

    request.send(body);
  });
}

/**
 * Push a small untimed payload first, so the measured upload window does not
 * include the connection ramp.
 *
 * The download phase has a large warm-up for the same reason. Without it the
 * first second of the curve is dominated by TCP slow start rather than by the
 * upload rate, which is exactly the sort of spike that makes a graph lie.
 */
export async function warmUpUpload(server: TestServer, signal: AbortSignal): Promise<void> {
  try {
    await postChunk(
      server.uploadUrl(cacheBuster()),
      randomBytes(1_000_000),
      signal,
      performance.now() + 5_000,
      () => undefined,
    );
  } catch {
    // Warm-up is an optimisation; the real phase can still run without it.
  }
}

/**
 * Upload for a fixed duration and report the average, sampling as it goes.
 *
 * Uses XMLHttpRequest rather than fetch on purpose: `upload.onprogress` is the
 * only widely supported way to observe an upload in flight, and without it the
 * upload graph would be a single flat line.
 *
 * One random buffer is generated and reused across chunks. It has to be
 * incompressible, and re-randomising between requests would cost more CPU than
 * the measurement gains.
 */
export async function measureUpload(
  server: TestServer,
  signal: AbortSignal,
  onSample: (sample: SpeedSample) => void,
): Promise<number> {
  const payload = randomBytes(UPLOAD_CHUNK);
  const sampler = new RateSampler(onSample);
  sampler.start();

  const until = performance.now() + UPLOAD_DURATION;
  const hardStop = performance.now() + PHASE_TIMEOUT;

  try {
    while (performance.now() < until && !signal.aborted) {
      if (performance.now() > hardStop) break;

      await postChunk(
        server.uploadUrl(cacheBuster()),
        payload,
        signal,
        until,
        (bytes) => sampler.add(bytes),
      );
    }
  } finally {
    sampler.stop();
  }

  if (sampler.bytes === 0) throw new SpeedTestError("No data uploaded");
  return sampler.average();
}


/* ------------------------------------------------------------------ */
/* Quality hints                                                        */
/* ------------------------------------------------------------------ */

export type Quality = "excellent" | "good" | "fair" | "poor";

/**
 * A coarse label for the result, so the number has some meaning.
 * Thresholds are in Mbps and follow common broadband marketing tiers.
 */
export function qualityFor(download: number | null): Quality | null {
  if (download === null) return null;
  if (download >= 100) return "excellent";
  if (download >= 25) return "good";
  if (download >= 5) return "fair";
  return "poor";
}

