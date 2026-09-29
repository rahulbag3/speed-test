/**
 * Accent presets.
 *
 * Kept free of any imports on purpose. The accent id list is needed by the
 * client-side theme provider and picker, and this module has to be safe to
 * import from the browser without dragging the palette generator (and its
 * OKLab maths) into the bundle.
 */

export interface AccentPreset {
  /** Stable id, also used as the `data-accent` attribute value. */
  id: string;
  /** Human readable name. */
  name: string;
  /** Seed colour the scheme is generated from. */
  seed: string;
  /** Optional primary chroma override, for monochrome accents. */
  primaryChroma?: number;
}

/**
 * The selectable accent colours. Adding one here is all that is needed: the
 * picker, the theme provider and the generated stylesheet are all driven from
 * this list.
 */
export const ACCENT_PRESETS: readonly AccentPreset[] = [
  { id: "ocean", name: "Ocean", seed: "#1B5FD9" },
  { id: "jade", name: "Jade", seed: "#0E7A6B" },
  { id: "violet", name: "Violet", seed: "#6C4BD8" },
  { id: "amber", name: "Amber", seed: "#C2620A" },
  { id: "crimson", name: "Crimson", seed: "#C0293A" },
  { id: "graphite", name: "Graphite", seed: "#5A6270", primaryChroma: 0.04 },
] as const;

export type AccentId = (typeof ACCENT_PRESETS)[number]["id"];

export const DEFAULT_ACCENT_ID: AccentId = "ocean";

export const DEFAULT_ACCENT: AccentPreset =
  ACCENT_PRESETS.find((preset) => preset.id === DEFAULT_ACCENT_ID) ?? ACCENT_PRESETS[0];

/** Type guard for accent ids, including ones read back from storage. */
export const isAccentId = (value: string): value is AccentId =>
  ACCENT_PRESETS.some((preset) => preset.id === value);

/** Look up a preset, falling back to the default for unknown ids. */
export function getAccent(id: string): AccentPreset {
  return isAccentId(id)
    ? (ACCENT_PRESETS.find((preset) => preset.id === id) as AccentPreset)
    : DEFAULT_ACCENT;
}
