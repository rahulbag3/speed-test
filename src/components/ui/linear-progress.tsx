import { cn } from "@/lib/cn";

/**
 * Material 3 linear progress indicator.
 *
 * `value` between 0 and 100 drives the determinate bar; omit it for the
 * indeterminate variant, which sweeps back and forth. Progress is exposed to
 * assistive technology through the native `progressbar` role.
 */

const COLORS = {
  primary: "bg-primary",
  secondary: "bg-secondary",
  tertiary: "bg-tertiary",
  error: "bg-error",
} as const;

/** Resolved colours, used to drive the indeterminate segment via a variable. */
const COLOR_VARS = {
  primary: "var(--color-primary)",
  secondary: "var(--color-secondary)",
  tertiary: "var(--color-tertiary)",
  error: "var(--color-error)",
} as const;

export type ProgressColor = keyof typeof COLORS;

export interface LinearProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  /** 0-100. Omit for an indeterminate indicator. */
  value?: number;
  color?: ProgressColor;
  label?: string;
  /** Hides the label from sighted users but keeps it for screen readers. */
  hideLabel?: boolean;
}

export function LinearProgress({
  value,
  color = "primary",
  label,
  hideLabel = false,
  className,
  ...props
}: LinearProgressProps) {
  const indeterminate = value === undefined;
  const clamped = Math.min(100, Math.max(0, value ?? 0));

  return (
    <div className={cn("flex w-full flex-col gap-2", className)} {...props}>
      {label ? (
        <span className={cn("text-label-md text-on-surface-variant", hideLabel && "sr-only")}>
          {label}
        </span>
      ) : null}
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={indeterminate ? undefined : clamped}
        className={cn(
          "relative h-1 w-full overflow-hidden rounded-full bg-surface-container-highest",
          indeterminate &&
            "after:absolute after:inset-y-0 after:left-0 after:w-1/3 after:rounded-full",
          "after:bg-[var(--md-progress-color,var(--color-primary))]",
          indeterminate &&
            "after:animate-[md-indeterminate_1.6s_ease-in-out_infinite] after:content-['']",
        )}
        style={{ ["--md-progress-color" as string]: COLOR_VARS[color] }}
      >
        {!indeterminate && (
          <div
            className={cn(
              "h-full rounded-full transition-[width] duration-medium2 ease-standard",
              COLORS[color],
            )}
            style={{ width: `${clamped}%` }}
          />
        )}
      </div>
    </div>
  );
}
