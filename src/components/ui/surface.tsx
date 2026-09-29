import { cn } from "@/lib/cn";
import type { ElevationLevel } from "@/lib/material/tokens";

/**
 * Material 3 surfaces.
 *
 * `level` follows the Material 3 elevation scale. Each step pairs a tonal
 * container colour (which gets lighter as it rises, in both schemes) with a
 * shadow, which is what produces the layered, softly-lit look.
 */

const TONES = {
  /** No container fill; for surfaces sitting on an already-raised parent. */
  none: "",
  /** The page background. */
  surface: "bg-surface",
  "surface-container-low": "bg-surface-container-low",
  "surface-container": "bg-surface-container",
  "surface-container-high": "bg-surface-container-high",
  "surface-container-highest": "bg-surface-container-highest",
  /** Emphasised accent fill. */
  primary: "bg-primary-container text-on-primary-container",
  "secondary": "bg-secondary-container text-on-secondary-container",
  "tertiary": "bg-tertiary-container text-on-tertiary-container",
  /** Solid accent fill. */
  filled: "bg-primary text-on-primary",
  inverse: "bg-inverse-surface text-inverse-on-surface",
} as const;

export type SurfaceTone = keyof typeof TONES;

const SHADOWS: Record<ElevationLevel, string> = {
  0: "",
  1: "shadow-1",
  2: "shadow-2",
  3: "shadow-3",
  4: "shadow-4",
  5: "shadow-5",
};

/** Corner radii, following the Material 3 shape scale. */
const RADII = {
  none: "rounded-none",
  sm: "rounded-lg",
  md: "rounded-xl",
  lg: "rounded-2xl",
  /** The signature 32px surface radius. */
  xl: "rounded-3xl",
  "2xl": "rounded-4xl",
  full: "rounded-full",
} as const;

export type SurfaceRadius = keyof typeof RADII;

export interface SurfaceProps extends React.HTMLAttributes<HTMLDivElement> {
  tone?: SurfaceTone;
  /** Material 3 elevation level, 0-5. */
  level?: ElevationLevel;
  radius?: SurfaceRadius;
  /** Adds a 1px outline, for surfaces that need an edge. */
  outlined?: boolean;
  /** Fills the available width. */
  fill?: boolean;
  as?: React.ElementType;
}

/**
 * A tonal, rounded container.
 *
 * @example
 * <Surface level={2} radius="xl" className="p-8">
 *   <Text variant="headline-md">Results</Text>
 * </Surface>
 */
export function Surface({
  tone = "surface-container-low",
  level = 0,
  radius = "xl",
  outlined = false,
  fill = false,
  as: Component = "div",
  className,
  ...props
}: SurfaceProps) {
  return (
    <Component
      className={cn(
        TONES[tone],
        SHADOWS[level],
        RADII[radius],
        outlined && "border border-outline-variant",
        fill && "w-full",
        className,
      )}
      {...props}
    />
  );
}
