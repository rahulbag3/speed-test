"use client";

import { cn } from "@/lib/cn";
import type { AccentId } from "@/lib/material/accents";
import { useTheme } from "./theme-provider";

export interface AccentOption {
  id: AccentId;
  name: string;
  /** Representative colour for the swatch. Computed on the server. */
  swatch: string;
}

export interface AccentPickerProps {
  options: readonly AccentOption[];
  className?: string;
  /** Accessible name for the group of swatches. */
  label?: string;
}

/**
 * Accent selector.
 *
 * The swatch colours arrive as props computed on the server, which keeps the
 * palette generator out of the client bundle entirely.
 */
export function AccentPicker({
  options,
  className,
  label = "Accent colour",
}: AccentPickerProps) {
  const { accent, setAccent } = useTheme();

  return (
    <div
      role="group"
      aria-label={label}
      className={cn("flex items-center gap-1.5", className)}
    >
      {options.map((option) => {
        const active = option.id === accent;
        return (
          <button
            key={option.id}
            type="button"
            aria-label={option.name}
            aria-pressed={active}
            title={option.name}
            onClick={() => setAccent(option.id)}
            style={{ backgroundColor: option.swatch }}
            className={cn(
              "size-6 cursor-pointer rounded-full",
              "transition-transform duration-short2 ease-standard",
              "hover:scale-110",
              "focus-visible:[outline-width:3px] focus-visible:outline-primary",
              "focus-visible:outline-offset-2",
              active
                ? "ring-2 ring-primary ring-offset-2 ring-offset-surface"
                : "ring-1 ring-outline-variant",
            )}
          />
        );
      })}
    </div>
  );
}
