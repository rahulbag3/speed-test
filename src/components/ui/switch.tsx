"use client";

import { cn } from "@/lib/cn";
import { useId, useState } from "react";

/**
 * Material 3 switch, built on a real checkbox input.
 *
 * The native control provides keyboard behaviour, focus handling and form
 * participation. A `checked` mirror drives the visual layer, because a Tailwind
 * `peer-checked:` variant only reaches *siblings* of the input - it cannot
 * style the thumb, which is nested inside the track.
 */

const SIZES = {
  sm: { track: "h-5 w-9", thumb: "size-3.5", off: "translate-x-0", on: "translate-x-4" },
  md: { track: "h-6 w-[2.6rem]", thumb: "size-4", off: "translate-x-0", on: "translate-x-[1.1rem]" },
} as const;

export type SwitchSize = keyof typeof SIZES;

export interface SwitchProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type" | "size"> {
  label: string;
  /** Hide the label visually while keeping it for assistive technology. */
  hideLabel?: boolean;
  size?: SwitchSize;
  /** Shows a check mark in the thumb when on. */
  withIcon?: boolean;
}

export function Switch({
  label,
  hideLabel = false,
  size = "md",
  withIcon = false,
  className,
  id,
  disabled,
  checked: checkedProp,
  defaultChecked,
  onChange,
  ...props
}: SwitchProps) {
  const generatedId = useId();
  const switchId = id ?? generatedId;

  // Support both controlled and uncontrolled usage.
  const isControlled = checkedProp !== undefined;
  const [internalChecked, setInternalChecked] = useState(defaultChecked ?? false);
  const checked = isControlled ? checkedProp : internalChecked;

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!isControlled) setInternalChecked(event.target.checked);
    onChange?.(event);
  };

  const config = SIZES[size];

  return (
    <label
      htmlFor={switchId}
      className={cn(
        "inline-flex items-center gap-3",
        disabled ? "cursor-not-allowed opacity-38" : "cursor-pointer",
        className,
      )}
    >
      <input
        type="checkbox"
        role="switch"
        id={switchId}
        checked={checkedProp}
        defaultChecked={defaultChecked}
        onChange={handleChange}
        disabled={disabled}
        className="peer sr-only"
        {...props}
      />
      <span
        aria-hidden
        className={cn(
          "relative inline-flex shrink-0 items-center rounded-full border-2 p-0.5",
          "transition-colors duration-medium2 ease-standard",
          "peer-focus-visible:[outline-width:3px] peer-focus-visible:outline-primary",
          "peer-focus-visible:outline-offset-2",
          checked ? "border-primary bg-primary" : "border-outline bg-surface-container-highest",
          config.track,
        )}
      >
        <span
          className={cn(
            "flex items-center justify-center rounded-full shadow-1",
            "transition-[transform,background-color,color] duration-medium2 ease-emphasized",
            checked ? "bg-on-primary text-primary" : "bg-surface text-on-surface-variant",
            checked ? config.on : config.off,
            config.thumb,
          )}
        >
          {withIcon && checked ? (
            <svg
              viewBox="0 0 24 24"
              width={12}
              height={12}
              fill="none"
              stroke="currentColor"
              strokeWidth={3.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m20 6.5-11 11-5-5" />
            </svg>
          ) : null}
        </span>
      </span>
      <span className={cn("text-body-lg text-on-surface", hideLabel && "sr-only")}>
        {label}
      </span>
    </label>
  );
}
