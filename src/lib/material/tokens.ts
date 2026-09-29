/**
 * Material 3 type scale, plus two extra display sizes for the speed readout.
 *
 * The Material scale is expressed in rem against a 16px root. The `hero` and
 * `metric` entries are additions for this project: a speed test needs numerals
 * that can dominate the page, and they are fluid so they scale with the
 * viewport instead of jumping at breakpoints.
 */
export interface TypeStyle {
  fontSize: string;
  lineHeight: string;
  letterSpacing: string;
  fontWeight: number;
}

export const TYPE_SCALE = {
  "display-xl": {
    fontSize: "clamp(3rem, 1.6rem + 6vw, 6rem)",
    lineHeight: "1.02",
    letterSpacing: "-0.035em",
    fontWeight: 500,
  },
  "display-lg": {
    fontSize: "clamp(2.5rem, 1.5rem + 4.2vw, 4.25rem)",
    lineHeight: "1.04",
    letterSpacing: "-0.03em",
    fontWeight: 500,
  },
  "display-md": {
    fontSize: "clamp(2rem, 1.4rem + 2.6vw, 3rem)",
    lineHeight: "1.1",
    letterSpacing: "-0.02em",
    fontWeight: 500,
  },
  "display-sm": {
    fontSize: "2.25rem",
    lineHeight: "2.75rem",
    letterSpacing: "0em",
    fontWeight: 400,
  },
  "headline-lg": {
    fontSize: "2rem",
    lineHeight: "2.5rem",
    letterSpacing: "0em",
    fontWeight: 500,
  },
  "headline-md": {
    fontSize: "1.75rem",
    lineHeight: "2.25rem",
    letterSpacing: "0em",
    fontWeight: 500,
  },
  "headline-sm": {
    fontSize: "1.5rem",
    lineHeight: "2rem",
    letterSpacing: "0em",
    fontWeight: 500,
  },
  "title-lg": {
    fontSize: "1.375rem",
    lineHeight: "1.75rem",
    letterSpacing: "0em",
    fontWeight: 500,
  },
  "title-md": {
    fontSize: "1rem",
    lineHeight: "1.5rem",
    letterSpacing: "0.0097em",
    fontWeight: 500,
  },
  "title-sm": {
    fontSize: "0.875rem",
    lineHeight: "1.25rem",
    letterSpacing: "0.0071em",
    fontWeight: 500,
  },
  "body-lg": {
    fontSize: "1rem",
    lineHeight: "1.5rem",
    letterSpacing: "0.0312em",
    fontWeight: 400,
  },
  "body-md": {
    fontSize: "0.875rem",
    lineHeight: "1.25rem",
    letterSpacing: "0.0178em",
    fontWeight: 400,
  },
  "body-sm": {
    fontSize: "0.75rem",
    lineHeight: "1rem",
    letterSpacing: "0.0333em",
    fontWeight: 400,
  },
  "label-lg": {
    fontSize: "0.875rem",
    lineHeight: "1.25rem",
    letterSpacing: "0.0071em",
    fontWeight: 500,
  },
  "label-md": {
    fontSize: "0.75rem",
    lineHeight: "1rem",
    letterSpacing: "0.0333em",
    fontWeight: 500,
  },
  "label-sm": {
    fontSize: "0.6875rem",
    lineHeight: "1rem",
    letterSpacing: "0.0333em",
    fontWeight: 500,
  },
  /**
   * Tabular numerals for live readouts. `font-variant-numeric` is applied in
   * the stylesheet so digits keep their width as values change.
   */
  metric: {
    fontSize: "clamp(4rem, 2rem + 11vw, 9.5rem)",
    lineHeight: "0.92",
    letterSpacing: "-0.045em",
    fontWeight: 600,
  },
} as const satisfies Record<string, TypeStyle>;

export type TypeScaleKey = keyof typeof TYPE_SCALE;

/* ------------------------------------------------------------------ */
/* Shape                                                                */
/* ------------------------------------------------------------------ */

/**
 * Material 3 shape scale, extended with the 32px surface radius this project
 * uses for its large tonal containers.
 */
export const SHAPE_SCALE = {
  none: "0px",
  xs: "4px",
  sm: "8px",
  md: "12px",
  lg: "16px",
  xl: "20px",
  "2xl": "28px",
  /** Signature surface radius for cards, panels and sheets. */
  "3xl": "32px",
  "4xl": "40px",
  full: "9999px",
} as const satisfies Record<string, string>;

export type ShapeKey = keyof typeof SHAPE_SCALE;

/* ------------------------------------------------------------------ */
/* Motion                                                               */
/* ------------------------------------------------------------------ */

/** Material 3 easing curves. */
export const EASING = {
  standard: "cubic-bezier(0.2, 0, 0, 1)",
  emphasized: "cubic-bezier(0.05, 0.7, 0.1, 1)",
  decelerate: "cubic-bezier(0, 0, 0, 1)",
  accelerate: "cubic-bezier(0.3, 0, 1, 1)",
} as const satisfies Record<string, string>;

/** Material 3 duration tokens, in milliseconds. */
export const DURATION = {
  short2: "100ms",
  short4: "200ms",
  medium2: "300ms",
  medium4: "400ms",
  long2: "500ms",
  extraLong: "1000ms",
} as const satisfies Record<string, string>;

/* ------------------------------------------------------------------ */
/* Elevation                                                            */
/* ------------------------------------------------------------------ */

/**
 * Material 3 elevation levels 0-5.
 *
 * The shadow colour is a custom property so light and dark can differ: light
 * surfaces need a neutral shadow, while dark surfaces read better with a
 * slightly stronger, cooler shadow.
 */
export const ELEVATION = {
  0: "none",
  1: "var(--md-elev-1)",
  2: "var(--md-elev-2)",
  3: "var(--md-elev-3)",
  4: "var(--md-elev-4)",
  5: "var(--md-elev-5)",
} as const satisfies Record<0 | 1 | 2 | 3 | 4 | 5, string>;

export type ElevationLevel = 0 | 1 | 2 | 3 | 4 | 5;
