import { oklchToHex, hexToOklch, type Hex } from "./color";
import { schemePalettes, type SchemePalettes } from "./palette";
import type { AccentPreset } from "./accents";

/**
 * Every colour role in a Material 3 scheme, including the newer
 * surface-container family and the inverse roles used for snackbars.
 */
export const COLOR_ROLES = [
  "primary", "on-primary", "primary-container", "on-primary-container",
  "secondary", "on-secondary", "secondary-container", "on-secondary-container",
  "tertiary", "on-tertiary", "tertiary-container", "on-tertiary-container",
  "error", "on-error", "error-container", "on-error-container",
  "surface", "on-surface", "surface-variant", "on-surface-variant",
  "surface-dim", "surface-bright",
  "surface-container-lowest", "surface-container-low", "surface-container",
  "surface-container-high", "surface-container-highest",
  "outline", "outline-variant",
  "inverse-surface", "inverse-on-surface", "inverse-primary",
  "scrim", "shadow", "surface-tint",
] as const;

export type ColorRole = (typeof COLOR_ROLES)[number];

/** A complete, resolved set of role -> hex for one colour scheme. */
export type ColorScheme = Record<ColorRole, Hex>;

export type ColorSchemeName = "light" | "dark";

/** Which palette a role draws from, and at which tone. */
type ToneRef = [keyof SchemePalettes, number];

/**
 * Baseline (standard contrast) tone assignments for the light scheme, from
 * the Material 3 colour roles table.
 */
const LIGHT_TONES: Record<ColorRole, ToneRef> = {
  primary: ["primary", 40],
  "on-primary": ["primary", 100],
  "primary-container": ["primary", 90],
  "on-primary-container": ["primary", 10],
  secondary: ["secondary", 40],
  "on-secondary": ["secondary", 100],
  "secondary-container": ["secondary", 90],
  "on-secondary-container": ["secondary", 10],
  tertiary: ["tertiary", 40],
  "on-tertiary": ["tertiary", 100],
  "tertiary-container": ["tertiary", 90],
  "on-tertiary-container": ["tertiary", 10],
  error: ["error", 40],
  "on-error": ["error", 100],
  "error-container": ["error", 90],
  "on-error-container": ["error", 10],
  surface: ["neutral", 98],
  "on-surface": ["neutral", 10],
  "surface-variant": ["neutralVariant", 90],
  "on-surface-variant": ["neutralVariant", 30],
  "surface-dim": ["neutral", 87],
  "surface-bright": ["neutral", 98],
  "surface-container-lowest": ["neutral", 100],
  "surface-container-low": ["neutral", 96],
  "surface-container": ["neutral", 94],
  "surface-container-high": ["neutral", 92],
  "surface-container-highest": ["neutral", 90],
  outline: ["neutralVariant", 50],
  "outline-variant": ["neutralVariant", 80],
  "inverse-surface": ["neutral", 20],
  "inverse-on-surface": ["neutral", 95],
  "inverse-primary": ["primary", 80],
  scrim: ["neutral", 0],
  shadow: ["neutral", 0],
  "surface-tint": ["primary", 40],
};

/** The dark scheme mirrors the same roles at inverted tones. */
const DARK_TONES: Record<ColorRole, ToneRef> = {
  primary: ["primary", 80],
  "on-primary": ["primary", 20],
  "primary-container": ["primary", 30],
  "on-primary-container": ["primary", 90],
  secondary: ["secondary", 80],
  "on-secondary": ["secondary", 20],
  "secondary-container": ["secondary", 30],
  "on-secondary-container": ["secondary", 90],
  tertiary: ["tertiary", 80],
  "on-tertiary": ["tertiary", 20],
  "tertiary-container": ["tertiary", 30],
  "on-tertiary-container": ["tertiary", 90],
  error: ["error", 80],
  "on-error": ["error", 20],
  "error-container": ["error", 30],
  "on-error-container": ["error", 90],
  surface: ["neutral", 6],
  "on-surface": ["neutral", 90],
  "surface-variant": ["neutralVariant", 30],
  "on-surface-variant": ["neutralVariant", 80],
  "surface-dim": ["neutral", 6],
  "surface-bright": ["neutral", 24],
  "surface-container-lowest": ["neutral", 4],
  "surface-container-low": ["neutral", 10],
  "surface-container": ["neutral", 12],
  "surface-container-high": ["neutral", 17],
  "surface-container-highest": ["neutral", 22],
  outline: ["neutralVariant", 60],
  "outline-variant": ["neutralVariant", 30],
  "inverse-surface": ["neutral", 90],
  "inverse-on-surface": ["neutral", 20],
  "inverse-primary": ["primary", 40],
  scrim: ["neutral", 0],
  shadow: ["neutral", 0],
  "surface-tint": ["primary", 80],
};

function resolve(palettes: SchemePalettes, tones: Record<ColorRole, ToneRef>): ColorScheme {
  const scheme = {} as ColorScheme;
  for (const role of COLOR_ROLES) {
    const [palette, tone] = tones[role];
    scheme[role] = palettes[palette].tone(tone);
  }
  return scheme;
}

/** A complete theme: both colour schemes derived from one seed colour. */
export interface MaterialTheme {
  /** The seed colour the theme was generated from. */
  seed: string;
  light: ColorScheme;
  dark: ColorScheme;
  /** Representative colour (light scheme primary) for UI swatches. */
  swatch: Hex;
  /** Palettes, exposed for palette viewers and documentation pages. */
  palettes: SchemePalettes;
}

export interface ThemeOptions {
  /** Override the primary palette chroma (see `SchemeOptions`). */
  primaryChroma?: number;
}

/** Generate the light and dark schemes for a seed colour. */
export function createMaterialTheme(
  seedColor: string,
  options: ThemeOptions = {},
): MaterialTheme {
  const palettes = schemePalettes(seedColor, options);
  const light = resolve(palettes, LIGHT_TONES);
  return {
    seed: seedColor,
    light,
    dark: resolve(palettes, DARK_TONES),
    swatch: oklchToHex({
      ...hexToOklch(seedColor),
      l: 0.55,
      c: options.primaryChroma ?? 0.17,
    }),
    palettes,
  };
}

/** Build the full theme for one accent preset. */
export function createAccentTheme(preset: AccentPreset): MaterialTheme {
  return createMaterialTheme(preset.seed, { primaryChroma: preset.primaryChroma });
}
