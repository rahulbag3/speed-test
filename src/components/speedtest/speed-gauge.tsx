import { cn } from "@/lib/cn";

/**
 * An arc gauge for the live speed reading.
 *
 * Deliberately an SVG rather than a canvas: it scales cleanly, it inherits the
 * theme's colours through `currentColor`, and it costs nothing to animate. The
 * sweep runs 270 degrees, from the lower left round to the lower right, which
 * leaves room for the reading underneath.
 */

const START_ANGLE = 135;
const SWEEP = 270;

/** The dial is non-linear: most connections live in the bottom third. */
const MAX_MBPS = 1000;

/**
 * Map a speed onto 0-1 of the sweep.
 *
 * A square-root curve gives fine resolution at the low end, where a linear dial
 * would barely move, and still reaches gigabit speeds without running out of
 * arc.
 */
export function normalise(mbps: number): number {
  if (!Number.isFinite(mbps) || mbps <= 0) return 0;
  return Math.min(1, Math.sqrt(mbps / MAX_MBPS));
}

function polarToCartesian(cx: number, cy: number, radius: number, angle: number) {
  const radians = (angle * Math.PI) / 180;
  return {
    x: cx + radius * Math.cos(radians),
    y: cy + radius * Math.sin(radians),
  };
}

/** Build an SVG arc path between two angles. */
function arcPath(cx: number, cy: number, radius: number, from: number, to: number): string {
  const start = polarToCartesian(cx, cy, radius, from);
  const end = polarToCartesian(cx, cy, radius, to);
  const largeArc = Math.abs(to - from) > 180 ? 1 : 0;
  return `M ${start.x.toFixed(2)} ${start.y.toFixed(2)} A ${radius} ${radius} 0 ${largeArc} 1 ${end.x.toFixed(2)} ${end.y.toFixed(2)}`;
}

const SIZE = 280;
const STROKE = 18;
const RADIUS = (SIZE - STROKE) / 2 - 6;
const CENTER = SIZE / 2;

export interface SpeedGaugeProps {
  /** Current reading in Mbps. */
  value: number;
  /** Unit label shown under the number. */
  unit: string;
  /** Short caption above the reading. */
  label: string;
  /** Adds a pulsing highlight while a test is running. */
  active?: boolean;
  className?: string;
}

export function SpeedGauge({
  value,
  unit,
  label,
  active = false,
  className,
}: SpeedGaugeProps) {
  const fraction = normalise(value);
  const track = arcPath(CENTER, CENTER, RADIUS, START_ANGLE, START_ANGLE + SWEEP);

  return (
    <div className={cn("relative grid place-items-center", className)}>
      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        width={SIZE}
        height={SIZE}
        className="max-w-full"
        role="meter"
        aria-valuemin={0}
        aria-valuemax={MAX_MBPS}
        aria-valuenow={Math.round(value)}
        aria-label={`${label}: ${value < 10 ? value.toFixed(1) : Math.round(value)} ${unit}`}
      >
        {/* Track */}
        <path
          d={track}
          fill="none"
          strokeWidth={STROKE}
          strokeLinecap="round"
          className="stroke-surface-container-highest"
        />

        {/*
          Value arc.

          It is drawn as the *full* sweep and revealed with `stroke-dasharray`,
          because the arc's length is constant. Animating `d` instead - redrawing
          the path to a new angle - changes the geometry rather than the paint,
          and browsers cannot interpolate that: the arc jumped between discrete
          shapes on every 120 ms sample, which read as stutter. Dashing a fixed
          path lets the existing transition actually animate.

          `pathLength` normalises the geometry so the dash maths is in 0-1 units
          and does not have to know the real arc length.
        */}
        {fraction > 0.001 && (
          <path
            d={track}
            fill="none"
            strokeWidth={STROKE}
            strokeLinecap="round"
            pathLength={1}
            strokeDasharray={`${fraction} 1`}
            className={cn(
              "stroke-primary transition-[stroke-dasharray] duration-medium2 ease-decelerate",
              active && "animate-pulse",
            )}
          />
        )}

        {/* Tick marks at the quarter points. */}
        {[0, 0.25, 0.5, 0.75, 1].map((step) => {
          const angle = START_ANGLE + SWEEP * step;
          const outer = polarToCartesian(CENTER, CENTER, RADIUS - STROKE / 2 - 3, angle);
          const inner = polarToCartesian(CENTER, CENTER, RADIUS - STROKE / 2 - 9, angle);
          return (
            <line
              key={step}
              x1={inner.x}
              y1={inner.y}
              x2={outer.x}
              y2={outer.y}
              strokeWidth={2}
              strokeLinecap="round"
              className="stroke-outline-variant"
            />
          );
        })}

        {/* Centre reading */}
        <text
          x={CENTER}
          y={CENTER - 14}
          textAnchor="middle"
          className="fill-on-surface text-[3.25rem] font-semibold"
          style={{ fontVariantNumeric: "tabular-nums" }}
        >
          {value < 10 ? value.toFixed(1) : Math.round(value)}
        </text>
        <text
          x={CENTER}
          y={CENTER + 22}
          textAnchor="middle"
          className="fill-primary text-[0.95rem] font-medium"
        >
          {unit}
        </text>
        <text
          x={CENTER}
          y={CENTER + 48}
          textAnchor="middle"
          className="fill-on-surface-variant text-[0.8rem]"
        >
          {label}
        </text>
      </svg>
    </div>
  );
}
