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

/**
 * Heights and type, matching the Button and Chip scales so the controls in the
 * kit line up with one another.
 *
 * A segmented group is a picker, not a call to action, so it defaults to the
 * small step: driven by padding alone it came out around 40px, taller than a
 * small Button (h-8) and a Chip (h-8), which made two quiet option rows read as
 * the loudest controls on the page. Explicit heights also stop the control
 * changing size with the length of its longest label.
 */
const SIZES = {
  sm: "h-8 px-3 text-label-md",
  md: "h-10 px-4 text-label-lg",
} as const;

export type SegmentedSize = keyof typeof SIZES;

export interface SegmentedButtonsProps<T extends string> {
  /** Accessible name for the group. */
  label: string;
  options: readonly SegmentedOption<T>[];
  value: T;
  onValueChange: (value: T) => void;
  size?: SegmentedSize;
  /** Stretch the group to the width of its parent. */
  fill?: boolean;
  className?: string;
}

export function SegmentedButtons<T extends string>({
  label,
  options,
  value,
  onValueChange,
  size = "sm",
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
              "relative flex cursor-pointer items-center justify-center gap-2",
              // Segments size to their label unless the group is filling its
              // parent. `flex-1` everywhere let a segment shrink below its text,
              // which wrapped the label onto a second line, and the group's
              // `overflow-hidden` - there to round the ends - then cut that line
              // off. "200 MB" and "This server" were losing half their glyphs.
              fill ? "flex-1" : "flex-none",
              SIZES[size],
              // Belt and braces: a label never breaks, whatever the container
              // does. Wrapping here is always wrong, since the control has a
              // fixed height to clip against.
              "whitespace-nowrap",
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
