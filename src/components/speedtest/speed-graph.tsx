"use client";

import { useCallback, useEffect, useId, useMemo, useRef } from "react";
import { cn } from "@/lib/cn";
import type { SpeedSample } from "@/lib/speedtest/measure";
import { toSeries } from "@/lib/speedtest/series";

/**
 * A minimal area sparkline for a live speed series, with a hover readout.
 *
 * Visually, two things do the work:
 *
 * - **The curve is a Catmull-Rom spline converted to cubic Béziers.** Straight
 *   segments between 120 ms samples look like a seismograph; a spline reads as
 *   a speed.
 * - **The fill is a gradient to transparent**, anchored to the bottom of the
 *   box, so the graph fades out instead of ending in a hard edge.
 *
 * The y-axis scales to the data's own peak (with headroom) rather than a fixed
 * maximum, so a 20 Mbps line and a 900 Mbps line both fill the card usefully.
 *
 * ## How the hover stays smooth
 *
 * A pointer fires well over 100 times a second, and three things make that
 * cheap:
 *
 * 1. **Native `addEventListener`, not React props.** React's synthetic event
 *    system allocates and walks its plugin pipeline for every event; skipping
 *    it removes most of the per-event cost.
 * 2. **Continuous interpolation.** The marker glides between samples instead of
 *    snapping to the nearest one. Snapping is what actually reads as "lag" -
 *    with a dozen samples, each step is tens of pixels wide.
 * 3. **No layout, no re-render.** The chrome is plain divs moved with
 *    `transform: translate3d(...)` inside one `requestAnimationFrame`, and the
 *    bounding box is cached rather than measured per frame.
 *
 * Pointer movement therefore triggers **zero React renders and zero reflows**.
 */

const WIDTH = 400;
const HEIGHT = 120;

/** Vertical inset so a peak at 100% is not clipped by the stroke width. */
const PADDING = 8;

interface Point {
  x: number;
  y: number;
}

function toPoints(samples: SpeedSample[]): Point[] {
  if (samples.length === 0) return [];

  const peak = Math.max(...samples.map((sample) => sample.mbps), 1) * 1.15;
  const last = samples.length - 1;

  return samples.map((sample, index) => ({
    // Spaced evenly: the x axis is "progress through the test", not seconds,
    // because the two phases have different durations.
    x: (index / last) * WIDTH,
    y: HEIGHT - PADDING - (Math.max(0, sample.mbps) / peak) * (HEIGHT - PADDING * 2),
  }));
}

/**
 * Build a smooth path through the points.
 *
 * The first and last segments use a duplicated control point, which is the
 * standard trick for getting flat-ish ends without needing phantom points.
 */
function smoothPath(points: Point[]): string {
  if (points.length < 2) return "";

  const first = points[0];
  let path = `M ${first.x.toFixed(2)} ${first.y.toFixed(2)}`;

  for (let i = 0; i < points.length - 1; i += 1) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;

    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;

    path += ` C ${c1x.toFixed(2)} ${c1y.toFixed(2)}, ${c2x.toFixed(2)} ${c2y.toFixed(2)}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
  }

  return path;
}

const formatTime = (ms: number): string => `${(ms / 1000).toFixed(1)}s`;

/** How close, in screen pixels, the pointer must come before the peak takes it. */
const SNAP_RADIUS = 24;

/**
 * A reading with its unit attached, dropping to kbps below 1 Mbps.
 *
 * A hard-coded "Mbps" next to a 400 kbps upload is not just untidy, it is
 * misleading: it renders as "0.4", which reads as a different kind of number
 * from the "241" beside it. Below a megabit, whole kbps is the honest unit.
 */
function formatRate(mbps: number): string {
  const kbps = Math.round(mbps * 1000);

  // `kbps >= 1000` catches 0.9996 Mbps, which would otherwise round up to the
  // absurd "1000 kbps" instead of simply becoming 1.0 Mbps.
  if (mbps >= 1 || kbps >= 1000) {
    if (mbps < 10) {
      // Round before formatting: `toFixed` truncates 9.95 to "9.9" rather than
      // rounding it, so the reading would drop as it crossed the boundary.
      return `${(Math.round(mbps * 10) / 10).toFixed(1)} Mbps`;
    }
    return `${Math.round(mbps)} Mbps`;
  }

  return kbps < 1 ? "<1 kbps" : `${kbps} kbps`;
}

interface Peak {
  /** Index into the drawn series, so the hover pointer can snap to it. */
  index: number;
  point: Point;
  mbps: number;
}

/**
 * The fastest moment in a series, located by index.
 *
 * Computed over the *drawn* series rather than the raw samples, so the marker
 * can never point at a spot the curve does not actually pass through.
 */
function findPeak(series: SpeedSample[], points: Point[]): Peak | null {
  if (series.length === 0 || points.length !== series.length) return null;

  let index = 0;
  for (let i = 1; i < series.length; i += 1) {
    if (series[i].mbps > series[index].mbps) index = i;
  }

  return { index, point: points[index], mbps: series[index].mbps };
}

/**
 * A dot pinned to the fastest point of the curve, labelled with its value.
 *
 * Rendered as a positioned div rather than an SVG shape on purpose: the graph
 * uses `preserveAspectRatio="none"`, so the viewBox is stretched to fit the card
 * and an SVG circle would come out as a squashed ellipse. Percentages map the
 * point to the box exactly, and a div stays a circle at every width.
 */
function PeakDot({ peak, color }: { peak: Peak; color: string }) {
  const ratio = peak.point.x / WIDTH;
  // Near the right edge the label would overflow, so it flips to the other side.
  const flip = ratio > 0.7;
  // The peak can land on the first or last sample, where a centred dot would be
  // sliced in half by the card's overflow. Anchoring to the edge keeps it whole;
  // at this size the shift is a couple of pixels and reads as the same point.
  const anchor =
    ratio < 0.02
      ? "translate(0, -50%)"
      : ratio > 0.98
        ? "translate(-100%, -50%)"
        : "translate(-50%, -50%)";

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute"
      style={{
        left: `${ratio * 100}%`,
        top: `${(peak.point.y / HEIGHT) * 100}%`,
        transform: anchor,
      }}
    >
      <span
        className="block size-2.5 rounded-full"
        style={{ backgroundColor: color, boxShadow: "0 0 0 2px var(--color-surface)" }}
      />
      <span
        className={cn(
          "numeric absolute top-1/2 -translate-y-1/2 whitespace-nowrap text-[10px] leading-none",
          flip ? "right-full mr-1.5" : "left-full ml-1.5",
        )}
        style={{ color }}
      >
        Peak {formatRate(peak.mbps)}
      </span>
    </div>
  );
}

export interface SpeedGraphProps {
  samples: SpeedSample[];
  /**
   * The final average for this direction. When present, the curve is extended
   * so it terminates on this value.
   */
  finalValue?: number | null;
  /** Stroke and gradient colour. */
  color?: string;
  /** Accessible description, e.g. "Download speed over time". */
  label: string;
  className?: string;
}

export function SpeedGraph({
  samples,
  finalValue,
  color = "var(--color-primary)",
  label,
  className,
}: SpeedGraphProps) {
  const gradientId = useId();

  // The series the graph actually draws, which ends on the result.
  const series = useMemo(() => toSeries(samples, finalValue), [samples, finalValue]);
  const points = useMemo(() => toPoints(series), [series]);
  const line = useMemo(() => smoothPath(points), [points]);
  const area = line ? `${line} L ${WIDTH} ${HEIGHT} L 0 ${HEIGHT} Z` : "";
  const peak = useMemo(() => findPeak(series, points), [series, points]);

  const wrapRef = useRef<HTMLDivElement>(null);
  const crosshairRef = useRef<HTMLDivElement>(null);
  const markerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const speedRef = useRef<HTMLSpanElement>(null);
  const timeRef = useRef<HTMLSpanElement>(null);

  const pointsRef = useRef(points);
  const samplesRef = useRef(samples);
  /** Peak index, read on the pointer hot path without re-creating the callback. */
  const peakIndexRef = useRef<number | null>(null);
  /** Cached bounding box, so the hot path never measures layout. */
  const rectRef = useRef<DOMRect | null>(null);
  const frameRef = useRef(0);
  const clientXRef = useRef(0);
  /** Fractional sample position of the pointer, for smooth interpolation. */
  const hoverRef = useRef<number | null>(null);

  useEffect(() => {
    pointsRef.current = points;
    samplesRef.current = series;
    peakIndexRef.current = peak?.index ?? null;
  }, [points, series, peak]);

  const setVisible = (visible: boolean) => {
    const opacity = visible ? "1" : "0";
    if (crosshairRef.current) crosshairRef.current.style.opacity = opacity;
    if (markerRef.current) markerRef.current.style.opacity = opacity;
    if (tooltipRef.current) tooltipRef.current.style.opacity = opacity;
  };

  /**
   * Move the hover chrome to a fractional sample position.
   *
   * The marker is interpolated between the two neighbouring samples rather than
   * snapped to the nearest one, because snapping reads as lag: with a dozen
   * samples each step is tens of pixels wide.
   *
   * The readout is interpolated by the same fraction, so the number always
   * belongs to the point the marker is actually on. Showing the nearest
   * sample's value while the marker glided between samples was what made the
   * numbers look arbitrary.
   *
   * The y axis is a linear function of speed, so interpolating the position and
   * interpolating the speed are the same calculation - they cannot disagree.
   */
  const place = useCallback((position: number | null) => {
    const crosshair = crosshairRef.current;
    const marker = markerRef.current;
    const tooltip = tooltipRef.current;
    if (!crosshair || !marker || !tooltip) return;

    const list = pointsRef.current;
    const list2 = samplesRef.current;
    const rect = rectRef.current;
    if (position === null || list.length === 0 || !rect || rect.width === 0) {
      setVisible(false);
      return;
    }

    // Pointer snapping. Within a short radius of the peak the readout locks onto
    // it exactly, rather than reporting whatever sub-sample fraction the pointer
    // happened to land on. Without this the printed peak and the number under the
    // pointer disagreed by a few Mbps purely because of where the cursor was, so
    // the marked peak was effectively unreadable off the curve itself.
    //
    // x is linear in the sample index, so the distance is exact in screen pixels
    // and the radius feels the same at any card width.
    const peakIndex = peakIndexRef.current;
    let target = position;
    if (peakIndex !== null && list.length > 1) {
      const span = list.length - 1;
      const distancePx = Math.abs((target - peakIndex) / span) * rect.width;
      if (distancePx <= SNAP_RADIUS) target = peakIndex;
    }

    const clamped = Math.min(list.length - 1, Math.max(0, target));
    const lower = Math.floor(clamped);
    const upper = Math.min(list.length - 1, lower + 1);
    const fraction = clamped - lower;

    const a = list[lower];
    const b = list[upper];
    const vx = a.x + (b.x - a.x) * fraction;
    const vy = a.y + (b.y - a.y) * fraction;

    const x = (vx / WIDTH) * rect.width;
    const y = (vy / HEIGHT) * rect.height;

    setVisible(true);
    crosshair.style.transform = `translate3d(${x.toFixed(1)}px, 0, 0)`;
    marker.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) translate(-50%, -50%)`;
    tooltip.style.transform = `translate3d(${x.toFixed(1)}px, ${(y - 12).toFixed(1)}px, 0) translate(-50%, -100%)`;

    // Read the value off the curve at exactly this position.
    const sampleA = list2[lower];
    const sampleB = list2[upper];
    if (sampleA && sampleB) {
      const mbps = sampleA.mbps + (sampleB.mbps - sampleA.mbps) * fraction;
      const elapsed = sampleA.t + (sampleB.t - sampleA.t) * fraction;
      if (speedRef.current) {
        speedRef.current.textContent = formatRate(mbps);
      }
      if (timeRef.current) {
        timeRef.current.textContent = `at ${formatTime(elapsed)}`;
      }
    }
  }, []);

  /** Coalesce pointer events to one update per animation frame. */
  const schedule = useCallback(() => {
    if (frameRef.current !== 0) return;

    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = 0;
      const list = pointsRef.current;
      const rect = rectRef.current;
      if (list.length === 0 || !rect || rect.width === 0) return;

      const position = ((clientXRef.current - rect.left) / rect.width) * (list.length - 1);
      hoverRef.current = position;
      place(position);
    });
  }, [place]);

  const hide = useCallback(() => {
    hoverRef.current = null;
    if (frameRef.current !== 0) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = 0;
    }
    setVisible(false);
  }, []);

  /**
   * Native, passive listeners.
   *
   * `pointerenter` re-measures the box (scroll and resize invalidate it), so
   * the move handler never touches layout. `passive` tells the browser not to
   * wait on us before it is allowed to scroll.
   */
  useEffect(() => {
    const element = wrapRef.current;
    if (!element) return;

    const measure = () => {
      rectRef.current = element.getBoundingClientRect();
    };

    const onEnter = (event: PointerEvent) => {
      measure();
      clientXRef.current = event.clientX;
      schedule();
    };
    const onMove = (event: PointerEvent) => {
      clientXRef.current = event.clientX;
      schedule();
    };

    element.addEventListener("pointerenter", onEnter, { passive: true });
    element.addEventListener("pointermove", onMove, { passive: true });
    element.addEventListener("pointerdown", onMove, { passive: true });
    element.addEventListener("pointerleave", hide, { passive: true });
    window.addEventListener("resize", measure, { passive: true });
    window.addEventListener("scroll", measure, { passive: true, capture: true });

    return () => {
      element.removeEventListener("pointerenter", onEnter);
      element.removeEventListener("pointermove", onMove);
      element.removeEventListener("pointerdown", onMove);
      element.removeEventListener("pointerleave", hide);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, { capture: true });
      if (frameRef.current !== 0) cancelAnimationFrame(frameRef.current);
    };
  }, [schedule, hide]);

  // Keep the hover on the same sample as the series grows underneath it.
  useEffect(() => {
    if (hoverRef.current !== null) place(hoverRef.current);
  }, [points, place]);

  return (
    <div ref={wrapRef} className={cn("relative h-full w-full", className)}>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        preserveAspectRatio="none"
        className="h-full w-full"
        role="img"
        aria-label={
          series.length > 0
            ? `${label}: average ${formatRate(finalValue ?? 0)}, peak ${formatRate(peak?.mbps ?? 0)}`
            : `${label}: no data yet`
        }
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.28" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Baseline, so an empty graph still reads as a chart waiting for data. */}
        <line
          x1="0"
          y1={HEIGHT - PADDING}
          x2={WIDTH}
          y2={HEIGHT - PADDING}
          strokeWidth="2"
          strokeLinecap="round"
          className="stroke-outline-variant"
          strokeDasharray="6 8"
        />

        {area ? <path d={area} fill={`url(#${gradientId})`} stroke="none" /> : null}

        {line ? (
          <path
            d={line}
            fill="none"
            stroke={color}
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        ) : null}
      </svg>

      {/*
        The peak marker sits above the fill but below the hover chrome, and is
        inert so tracking the pointer straight over it still works.
      */}
      {peak ? <PeakDot peak={peak} color={color} /> : null}

      {/*
        Hover chrome sits outside the SVG as plain divs moved with `transform`.
        `will-change` keeps each on its own compositor layer, so tracking the
        pointer never repaints the chart.
      */}
      <div
        ref={crosshairRef}
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0 w-px bg-on-surface-variant opacity-0 will-change-transform"
      />
      <div
        ref={markerRef}
        aria-hidden
        className="pointer-events-none absolute left-0 top-0 size-3 rounded-full opacity-0 will-change-transform"
        style={{ backgroundColor: color, boxShadow: "0 0 0 2px var(--color-surface)" }}
      />
      <div
        ref={tooltipRef}
        aria-hidden
        className="pointer-events-none absolute left-0 top-0 z-10 rounded-xl border border-outline-variant bg-surface-container-highest px-2.5 py-1 text-center opacity-0 will-change-transform"
      >
        <span ref={speedRef} className="numeric block text-label-lg text-on-surface" />
        <span ref={timeRef} className="numeric block text-label-sm text-on-surface-variant" />
      </div>
    </div>
  );
}