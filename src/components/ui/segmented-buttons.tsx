"use client";

import { cn } from "@/lib/cn";
import { useId } from "react";

/**
 * Material 3 segmented button group.
 *
 * A single-select control built from a radiogroup, which is the accessible
 * pattern for "pick one of these few, all visible" choices - a speed test's
 * Download / Upload / Overall selector being the obvious case.
 */

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  icon?: React.ReactNode;
  disabled?: boolean;
}

export interface SegmentedButtonsProps<T extends string> {
  /** Accessible name for the group. */
  label: string;
  options: readonly SegmentedOption<T>[];
  value: T;
  onValueChange: (value: T) => void;
  /** Stretch the group to the width of its parent. */
  fill?: boolean;
  className?: string;
}

export function SegmentedButtons<T extends string>({
  label,
  options,
  value,
  onValueChange,
  fill = false,
  className,
}: SegmentedButtonsProps<T>) {
  const groupId = useId();

  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn(
        "inline-flex overflow-hidden border border-outline",
        fill && "flex w-full",
        className,
      )}
    >
      {options.map((option, index) => {
        const selected = option.value === value;
        const inputId = `${groupId}-${option.value}`;

        return (
          <label
            key={option.value}
            htmlFor={inputId}
            className={cn(
              "relative flex flex-1 cursor-pointer items-center justify-center gap-2",
              "px-4 py-2.5 text-label-lg",
              "transition-colors duration-short2 ease-standard",
              // Hairline separators between segments, but not at the edges.
              index > 0 && "border-l border-outline",
              selected
                ? "bg-secondary-container text-on-secondary-container"
                : "text-on-surface hover:bg-on-surface/8",
              option.disabled && "pointer-events-none opacity-38",
            )}
          >
            <input
              type="radio"
              id={inputId}
              name={groupId}
              value={option.value}
              checked={selected}
              disabled={option.disabled}
              onChange={() => onValueChange(option.value)}
              className="peer sr-only"
            />
            {/* Focus ring is drawn on the segment, not the hidden input. */}
            <span
              aria-hidden
              className={cn(
                "pointer-events-none absolute inset-0 rounded-none",
                "peer-focus-visible:[outline-width:3px] peer-focus-visible:outline-primary",
                "peer-focus-visible:-outline-offset-[3px]",
              )}
            />
            {option.icon ? (
              <span aria-hidden className="flex size-4 items-center justify-center [&>svg]:size-4">
                {option.icon}
              </span>
            ) : null}
            {option.label}
          </label>
        );
      })}
    </div>
  );
}
