"use client";

import { Icon, IconButton } from "@/components/ui";
import { cn } from "@/lib/cn";
import { useTheme } from "./theme-provider";
import type { ThemeMode } from "./theme-storage";

const OPTIONS: { mode: ThemeMode; label: string; icon: "sun" | "moon" | "monitor" }[] = [
  { mode: "light", label: "Light theme", icon: "sun" },
  { mode: "dark", label: "Dark theme", icon: "moon" },
  { mode: "system", label: "Match system theme", icon: "monitor" },
];

/**
 * Light / Dark / System switch.
 *
 * All three options stay visible so the current preference is always obvious,
 * rather than a single toggle button whose state has to be inferred.
 */
export function ThemeModeToggle({ className }: { className?: string }) {
  const { mode, setMode } = useTheme();

  return (
    <div
      role="group"
      aria-label="Colour theme"
      className={cn(
        "flex items-center gap-1 rounded-full bg-surface-container p-1",
        className,
      )}
    >
      {OPTIONS.map((option) => {
        const active = option.mode === mode;
        return (
          <IconButton
            key={option.mode}
            label={option.label}
            size="sm"
            selected={active}
            onClick={() => setMode(option.mode)}
            className={
              active ? "bg-secondary-container text-on-secondary-container" : undefined
            }
          >
            <Icon name={option.icon} size={18} />
          </IconButton>
        );
      })}
    </div>
  );
}
