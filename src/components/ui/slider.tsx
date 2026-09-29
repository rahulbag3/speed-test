"use client";

import { cn } from "@/lib/cn";
import { useId } from "react";

/**
 * Material 3 slider, built on a native range input.
 *
 * The native range control brings the correct keyboard and assistive
 * technology behaviour (arrow keys, page up/down, Home/End) for free. Only the
 * track and thumb are restyled.
 */

const SIZES = {
  sm: { trackHeight: "4px", thumb: "size-4" },
  md: { trackHeight: "6px", thumb: "size-6" },
} as const;

export type SliderSize = keyof typeof SIZES;

export interface SliderProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type" | "size"> {
  label: string;
  /** Current value, for uncontrolled usage with a `defaultValue`. */
  value?: number;
  /** Smallest selectable value. */
  min?: number;
  /** Largest selectable value. */
  max?: number;
  /** Granularity of the steps. */
  step?: number;
  size?: SliderSize;
  /** Render a filled track up to the current value. */
  filled?: boolean;
  /** Formats the value shown beside the label. */
  formatValue?: (value: number) => string;
}

/**
 * @example
 * <Slider
 *   label="Test duration"
 *   min={5}
 *   max={60}
 *   value={duration}
 *   onChange={(e) => setDuration(Number(e.target.value))}
 *   formatValue={(v) => `${v}s`}
 * />
 */
export function Slider({
  label,
  value,
  min = 0,
  max = 100,
  step = 1,
  size = "md",
  filled = true,
  formatValue,
  className,
  id,
  ...props
}: SliderProps) {
  const generatedId = useId();
  const sliderId = id ?? generatedId;
  const config = SIZES[size];

  const currentValue = value ?? Number(props.defaultValue ?? min);
  const percent = max === min ? 0 : ((currentValue - min) / (max - min)) * 100;

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex items-baseline justify-between gap-4">
        <label htmlFor={sliderId} className="text-label-lg text-on-surface">
          {label}
        </label>
        {formatValue ? (
          <span className="numeric text-label-lg text-primary">{formatValue(currentValue)}</span>
        ) : null}
      </div>
      <input
        type="range"
        id={sliderId}
        value={value}
        min={min}
        max={max}
        step={step}
        aria-label={label}
        className={cn(
          "peer w-full cursor-pointer appearance-none bg-transparent",
          "focus-visible:[outline-width:3px] focus-visible:outline-primary",
          "focus-visible:outline-offset-4 focus-visible:rounded-full",
          // WebKit renders the track and thumb as pseudo-elements; the track
          // is transparent because the fill is painted on the input itself.
          "[&::-webkit-slider-runnable-track]:h-full",
          "[&::-webkit-slider-runnable-track]:rounded-full",
          "[&::-webkit-slider-runnable-track]:bg-transparent",
          "[&::-webkit-slider-thumb]:appearance-none",
          "[&::-webkit-slider-thumb]:rounded-full",
          "[&::-webkit-slider-thumb]:border-4",
          "[&::-webkit-slider-thumb]:border-primary",
          "[&::-webkit-slider-thumb]:bg-surface",
          "[&::-webkit-slider-thumb]:shadow-1",
          "[&::-webkit-slider-thumb]:transition-transform",
          "[&::-webkit-slider-thumb]:duration-short2",
          "[&::-webkit-slider-thumb]:ease-standard",
          "hover:[&::-webkit-slider-thumb]:scale-110",
          "focus-visible:[&::-webkit-slider-thumb]:border-[6px]",
          "[&::-moz-range-track]:h-full [&::-moz-range-track]:rounded-full",
          "[&::-moz-range-track]:bg-transparent",
          "[&::-moz-range-thumb]:size-4 [&::-moz-range-thumb]:rounded-full",
          "[&::-moz-range-thumb]:border-4 [&::-moz-range-thumb]:border-primary",
          "[&::-moz-range-thumb]:bg-surface",
          "disabled:cursor-not-allowed disabled:opacity-38",
          config.thumb,
        )}
        style={
          {
            height: config.trackHeight,
            borderRadius: "9999px",
            background: filled
              ? `linear-gradient(to right,
                  var(--color-primary) 0%,
                  var(--color-primary) ${percent}%,
                  var(--color-surface-container-highest) ${percent}%,
                  var(--color-surface-container-highest) 100%)`
              : "var(--color-surface-container-highest)",
          } as React.CSSProperties
        }
        {...props}
      />
    </div>
  );
}
