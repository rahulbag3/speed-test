"use client";

import { useEffect, useRef } from "react";
import { Button, Icon, SegmentedButtons, Surface } from "@/components/ui";
import { cn } from "@/lib/cn";
import { SpeedGauge } from "./speed-gauge";
import { SpeedGraph } from "./speed-graph";
import { useSpeedTest, type TestPhase } from "./use-speed-test";
import {
  DEFAULT_SERVER_ID,
  isLocalhostPage,
  TEST_SERVERS,
} from "@/lib/speedtest/servers";
import type { Quality, SpeedSample } from "@/lib/speedtest/measure";

/** Formats a Mbps reading: one decimal below 10, whole numbers above. */
function formatMbps(value: number | null): string {
  if (value === null) return "—";
  return value < 10 ? value.toFixed(1) : String(Math.round(value));
}

/**
 * Loss is always a whole multiple of 1/PING_ROUNDS, so a decimal place would only
 * ever be a trailing ".0" - "20" says the same thing as "20.0" and reads better.
 */
function formatPercent(value: number | null): string {
  if (value === null) return "—";
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

/**
 * One metric as a card: icon badge, label, reading, and a live graph.
 *
 * This is the shape most speed tests use, because the graph is what tells you
 * *whether* the line was steady or whether something else was competing for
 * the connection. A single average number hides that.
 */
function MetricCard({
  icon,
  title,
  value,
  unit,
  samples,
  color,
  tone,
  active,
}: {
  icon: "download" | "upload";
  title: string;
  value: number | null;
  unit: string;
  samples: SpeedSample[];
  /** Solid accent, for the icon and the reading. */
  color: string;
  /** Container pair for the tags, so they match the phase pills exactly. */
  tone: string;
  active: boolean;
}) {
  // The headline figure is the sustained average - the same number the result is
  // reported as, so nothing on screen contradicts anything else. It is tagged
  // "avg" to say which kind of reading it is; the peak is marked directly on the
  // graph instead, where it belongs, because it is a property of a moment in
  // time rather than of the test as a whole.
  return (
    <Surface tone="surface-container" radius="xl" className="overflow-hidden p-0">
      <div className="flex items-center gap-3 px-5 pt-5">
        <span
          className="grid size-11 shrink-0 place-items-center rounded-full"
          style={{ backgroundColor: color }}
        >
          <Icon name={icon} size={22} className="text-white" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-title-md text-on-surface-variant">{title}</p>
          <p className="flex items-baseline gap-1">
            <span className="numeric text-headline-md" style={{ color }}>
              {formatMbps(value)}
            </span>
            <span className="text-label-lg text-on-surface-variant">{unit}</span>
            {/*
              The headline is a sustained average, so it says so.

              It wears the same Material container pair as that direction's phase
              pill, so every tag on the page is the same colour by construction.
              This used to be a hand-rolled `color-mix` tint of the accent, which
              is a different colour from the container role and left the "avg"
              tag visibly not matching the "Download" / "Upload" pills.

              It sits beside the number rather than on the curve, because the
              reading belongs to the card and printing it as a graph label too
              would show the same figure twice.
            */}
            <span
              className={cn(
                "numeric ml-1 rounded-full px-1.5 text-[10px] leading-4",
                tone,
              )}
            >
              avg
            </span>
          </p>
        </div>
        {active ? (
          <span className="ml-auto size-2.5 shrink-0 animate-pulse rounded-full bg-primary" />
        ) : null}
      </div>

      <div className="mt-3 h-28 w-full sm:h-32">
        <SpeedGraph
          samples={samples}
          finalValue={value}
          label={title}
          color={color}
        />
      </div>
    </Surface>
  );
}

const QUALITY_COPY: Record<Quality, string> = {
  excellent: "Excellent connection",
  good: "Good connection",
  fair: "Fair connection",
  poor: "Poor connection",
};

/**
 * The accent roles for each direction.
 *
 * Download and upload get different roles so the two graphs read apart, and so
 * every tag for a direction is drawn from one place. The pill, its dot and the
 * card's "avg" tag all read from here, which is what keeps them the same colour:
 * defining the container pair separately for each is how they drifted apart.
 *
 * `pill` is the container pair, used for a filled tag. `on` is the matching
 * on-container text, already inside `pill`.
 */
const DOWNLOAD_ACCENT = {
  solid: "var(--color-primary)",
  pill: "bg-primary-container text-on-primary-container",
  /** The solid accent reads well on the container at this size. */
  onPill: "var(--color-primary)",
} as const;

const UPLOAD_ACCENT = {
  solid: "var(--color-tertiary)",
  pill: "bg-tertiary-container text-on-tertiary-container",
  onPill: "var(--color-tertiary)",
} as const;

const DOWNLOAD_COLOR = DOWNLOAD_ACCENT.solid;
const UPLOAD_COLOR = UPLOAD_ACCENT.solid;

/**
 * The three measured phases, in order.
 *
 * Each carries its own container/on-container pair so the pill takes the accent
 * of the direction it represents, matching that card's icon, number and graph.
 * Ping stays neutral: it is not a speed, so it borrows neither direction's
 * colour and does not imply it belongs to either.
 */
const STEPS = [
  {
    id: "ping",
    label: "Ping",
    tone: "var(--color-secondary)",
    active: "bg-surface-container-highest text-on-surface",
  },
  {
    id: "download",
    label: "Download",
    tone: DOWNLOAD_ACCENT.onPill,
    active: DOWNLOAD_ACCENT.pill,
  },
  {
    id: "upload",
    label: "Upload",
    tone: UPLOAD_ACCENT.onPill,
    active: UPLOAD_ACCENT.pill,
  },
] as const;

/**
 * Progress as discrete steps rather than a bar.
 *
 * A moving line says "something is happening"; three labelled dots also say
 * *what* is happening and how much is left, which is more useful than watching
 * a bar slide.
 */
function StepIndicator({ phase }: { phase: TestPhase }) {
  const activeIndex = STEPS.findIndex((step) => step.id === phase);
  const allDone = phase === "done";

  return (
    <ol className="flex items-center gap-2" aria-label="Test progress">
      {STEPS.map((step, index) => {
        const done = allDone || (activeIndex !== -1 && index < activeIndex);
        const active = step.id === phase;
        return (
          <li key={step.id} className="flex items-center gap-2">
            <span
              aria-current={active ? "step" : undefined}
              className={cn(
                "flex items-center gap-2 rounded-full px-3 py-1.5 text-label-md",
                "transition-colors duration-medium2 ease-standard",
                active
                  ? step.active
                  : done
                    ? "bg-secondary-container text-on-secondary-container"
                    : "bg-surface-container text-on-surface-variant",
              )}
            >
              <span
                className={cn(
                  "size-2 rounded-full",
                  active ? "animate-pulse" : done ? "bg-secondary" : "bg-outline",
                )}
                // Inline so the dot can take the same token as the pill it sits
                // in; a utility class could not follow both role and scheme.
                style={active ? { backgroundColor: step.tone } : undefined}
              />
              {step.label}
            </span>
            {index < STEPS.length - 1 ? (
              <Icon name="chevron-down" size={14} className="-rotate-90 opacity-40" />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

/**
 * The speed test.
 *
 * Owns the state machine and renders the dial, the live graphs and the
 * transport controls.
 */
export function SpeedTestPanel() {
  const {
    phase,
    live,
    result,
    downloadSamples,
    uploadSamples,
    error,
    quality,
    label,
    running,
    server,
    setServerId,
    start,
    stop,
    reset,
  } = useSpeedTest(DEFAULT_SERVER_ID);

  const finished = phase === "done";
  const failed = phase === "error";
  const downloading = phase === "download";
  const uploading = phase === "upload";

  // The dial follows whichever phase is on screen, then holds the result.
  const dialValue = running
    ? uploading
      ? (result.upload ?? live)
      : live
    : (result.download ?? 0);
  const dialUnit = running ? (uploading ? "Mbps up" : "Mbps") : "Mbps";
  const dialLabel = running ? (uploading ? "Upload" : "Download") : "Download";
  // The dial takes the accent of the direction on screen, so during the upload
  // phase the arc, unit and caption turn tertiary alongside the upload graph.
  const dialColor = uploading ? UPLOAD_COLOR : DOWNLOAD_COLOR;

  // If the page is on localhost, a same-origin server would measure loopback.
  const localTrap = server.sameOrigin && isLocalhostPage();

  /*
   * Bring the graphs into view when a test starts on a phone.
   *
   * On a narrow screen the dial and its controls fill the first viewport, so the
   * graphs that the whole test is drawing into sit entirely below the fold. The
   * user taps Start and then sees nothing happen, which reads as the test having
   * not started. Scrolling once, at the moment the run begins, puts the thing
   * being measured on screen.
   *
   * Scoped to small screens on purpose: on a desktop the graphs are already
   * visible beside the dial, and yanking the page out from under someone
   * mid-click would be hostile. Also skipped when the reader has asked for
   * reduced motion, and only ever scrolled towards the graphs - never away from
   * a control the user may be about to need.
   */
  const graphsRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (phase !== "download") return;

    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const narrow = window.matchMedia?.("(max-width: 1023px)").matches;
    if (reduced || !narrow) return;

    graphsRef.current?.scrollIntoView({
      behavior: reduced ? "auto" : "smooth",
      block: "start",
    });
  }, [phase]);

  return (
    <div className="flex w-full flex-col gap-6">
      <Surface
        level={3}
        radius="xl"
        tone="surface-container-low"
        className="flex flex-col items-center gap-6 p-6 sm:p-10"
      >
        <SpeedGauge
          value={dialValue}
          unit={dialUnit}
          label={dialLabel}
          color={dialColor}
          complete={finished}
          active={running}
        />

        <div className="flex w-full max-w-md flex-col items-center gap-4">
          <StepIndicator phase={phase} />
          <p
            className="text-center text-body-md text-on-surface-variant"
            role="status"
            aria-live="polite"
          >
            {error ?? (finished && quality ? QUALITY_COPY[quality] : label)}
          </p>
        </div>

        <div className="flex w-full max-w-lg flex-col gap-3 sm:flex-row sm:items-center sm:justify-center">
          {running ? (
            <Button
              variant="tonal"
              size="lg"
              onClick={stop}
              iconStart={<Icon name="close" size={20} />}
              className="sm:min-w-44"
            >
              Stop
            </Button>
          ) : (
            <Button
              variant="filled"
              size="lg"
              onClick={start}
              iconStart={<Icon name={finished || failed ? "refresh" : "play"} size={20} />}
              className="sm:min-w-44"
            >
              {finished || failed ? "Test again" : "Start test"}
            </Button>
          )}

          {(finished || failed) && (
            <Button variant="text" size="lg" onClick={reset}>
              Clear
            </Button>
          )}
        </div>
      </Surface>

      <div ref={graphsRef} className="grid grid-cols-1 gap-6 scroll-mt-4 lg:grid-cols-2">
        <MetricCard
          icon="download"
          title="Download Speed"
          value={result.download}
          unit="Mbps"
          samples={downloadSamples}
          color={DOWNLOAD_ACCENT.solid}
          tone={DOWNLOAD_ACCENT.pill}
          active={downloading}
        />
        <MetricCard
          icon="upload"
          title="Upload Speed"
          value={result.upload}
          unit="Mbps"
          samples={uploadSamples}
          color={UPLOAD_ACCENT.solid}
          tone={UPLOAD_ACCENT.pill}
          active={uploading}
        />
      </div>

      <Surface level={1} radius="xl" className="flex flex-col gap-4 p-6">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <div>
            <p className="text-label-md text-on-surface-variant">Ping</p>
            <p className="numeric text-title-lg text-on-surface">
              {result.latency === null ? "—" : Math.round(result.latency)}
              <span className="ml-1 text-label-md text-on-surface-variant">ms</span>
            </p>
          </div>
          <div>
            <p className="text-label-md text-on-surface-variant">Jitter</p>
            <p className="numeric text-title-lg text-on-surface">
              {result.jitter === null ? "—" : result.jitter.toFixed(1)}
              <span className="ml-1 text-label-md text-on-surface-variant">ms</span>
            </p>
          </div>
          {/* Any loss at all is worth flagging: a clean line drops nothing. */}
          <div>
            <p className="text-label-md text-on-surface-variant">Packet loss</p>
            <p
              className={cn(
                "numeric text-title-lg",
                result.loss ? "text-error" : "text-on-surface",
              )}
            >
              {formatPercent(result.loss)}
              <span className="ml-1 text-label-md text-on-surface-variant">%</span>
            </p>
          </div>
        </div>

        <div className="flex justify-end">
          <div>
            <SegmentedButtons
              label="Test server"
              options={TEST_SERVERS.map((entry) => ({
                value: entry.id,
                label: entry.label,
              }))}
              value={server.id}
              onValueChange={setServerId}
            />
          </div>
        </div>

        {localTrap ? (
          <p className="rounded-2xl bg-error-container px-4 py-3 text-body-sm text-on-error-container">
            You are viewing this page on localhost, so a same-origin server would only
            measure loopback. Pick a remote server to see your real connection speed.
          </p>
        ) : (
          <p className="text-body-sm text-on-surface-variant">{server.note}</p>
        )}
      </Surface>
    </div>
  );
}