import { hexToOklch, oklchForTone, oklchToHex, type Hex, type Oklch } from "./color";

/**
 * A Material 3 tonal palette: one hue + chroma expressed at every tone from 0
 * (black) to 100 (white). Colour roles are then just "palette X, tone Y",
 * which is what makes Material schemes so easy to re-theme.
 */
export interface TonalPalette {
  /** Hue in degrees. */
  readonly hue: number;
  /** Peak chroma in OKLCH. */
  readonly chroma: number;
  /** Colour at a given CIE tone (0-100). */
  tone: (tone: number) => Hex;
}

/** Build a tonal palette from a hue (degrees) and peak chroma (OKLCH). */
export function tonalPalette(hue: number, chroma: number): TonalPalette {
  const seed: Oklch = { l: 0.5, c: chroma, h: ((hue % 360) + 360) % 360 };
  const cache = new Map<number, Hex>();

  return {
    hue: seed.h,
    chroma,
    tone(tone: number): Hex {
      const key = Math.round(tone * 100) / 100;
      const cached = cache.get(key);
      if (cached) return cached;
      const hex = oklchToHex(oklchForTone(seed, key));
      cache.set(key, hex);
      return hex;
    },
  };
}

/**
 * Chroma values, expressed in OKLCH.
 *
 * The Material spec quotes HCT chroma values (primary 48, secondary 16,
 * tertiary 24, neutral 4, neutral-variant 8). OKLCH uses a different scale, so
 * these are the equivalent perceptual amounts rather than the literal numbers.
 */
export const CHROMA = {
  primary: 0.19,
  secondary: 0.055,
  tertiary: 0.1,
  neutral: 0.006,
  neutralVariant: 0.022,
  error: 0.16,
} as const;

/** HCT "error" sits around hue 25. */
export const ERROR_HUE = 25;

/** The full set of palettes backing a Material colour scheme. */
export interface SchemePalettes {
  primary: TonalPalette;
  secondary: TonalPalette;
  tertiary: TonalPalette;
  neutral: TonalPalette;
  neutralVariant: TonalPalette;
  error: TonalPalette;
}

export interface SchemeOptions {
  /**
   * Override the primary palette's peak chroma. Useful for monochrome accents,
   * where a low-chroma seed would otherwise be amplified back into a colour.
   */
  primaryChroma?: number;
}

/**
 * Derive every palette from a single seed colour, following the Material 3
 * scheme rules: secondary shares the seed hue at low chroma, tertiary is a
 * 60 degree hue rotation at higher chroma, and the neutrals stay almost grey.
 */
export function schemePalettes(seedColor: string, options: SchemeOptions = {}): SchemePalettes {
  const seed = hexToOklch(seedColor);
  const { h: hue, c } = seed;

  // Material wants a confident primary, so a washed-out seed is lifted to the
  // standard chroma. That amplification is exactly what a monochrome accent
  // needs to opt out of, hence `primaryChroma`.
  const primaryChroma = options.primaryChroma ?? Math.max(CHROMA.primary, Math.min(c, 0.22));

  return {
    primary: tonalPalette(hue, primaryChroma),
    secondary: tonalPalette(hue, CHROMA.secondary),
    tertiary: tonalPalette(hue + 60, CHROMA.tertiary),
    neutral: tonalPalette(hue, CHROMA.neutral),
    neutralVariant: tonalPalette(hue, CHROMA.neutralVariant),
    error: tonalPalette(ERROR_HUE, CHROMA.error),
  };
}
