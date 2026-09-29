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
        // Rounded on the shape scale, and clipping the segments to it. This is
        // the one control that was drawn square while everything around it was
        // rounded - buttons, surfaces, the step pills, the tags - so it read as
        // a foreign object rather than part of the same interface.
        "inline-flex overflow-hidden rounded-full border border-outline",
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
            {/*
              Focus ring is drawn on the segment, not the hidden input.

              An inset ring rather than an outline: the group clips its
              segments with `overflow-hidden` to get the rounded shape, and an
              outline sits *outside* the element, so it would be sliced off at
              the rounded ends. Painted inward it is clipped along with
              everything else and follows the pill exactly.
            */}
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0 peer-focus-visible:shadow-[inset_0_0_0_3px_var(--color-primary)]"
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
