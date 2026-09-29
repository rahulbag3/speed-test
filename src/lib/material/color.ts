/**
 * Colour primitives used to build Material 3 tonal palettes.
 *
 * Material 3 palettes are defined by "tone" (CIE L*, 0 = black, 100 = white),
 * not by lightness in a gamma-encoded space. Generating them correctly means
 * working in a perceptual space, so this module implements:
 *
 *   sRGB  <-> linear sRGB  <-> CIEXYZ (D65)  <-> OKLab / OKLCH
 *
 * plus the conversions between CIE L* and relative luminance, and a chroma
 * reduction gamut-mapping step so a palette always lands inside sRGB.
 *
 * Everything here is pure and dependency free, which means the exact same code
 * runs in Node (to generate the token stylesheet) and in the browser.
 */

export interface Rgb {
  /** 0-255, gamma encoded. */
  r: number;
  g: number;
  b: number;
}

export interface Oklab {
  /** Lightness 0-1, perceptually uniform. */
  l: number;
  /** Green-red axis, roughly -0.4 to 0.4. */
  a: number;
  /** Blue-yellow axis, roughly -0.4 to 0.4. */
  b: number;
}

export interface Oklch {
  /** Lightness 0-1. */
  l: number;
  /** Chroma 0-0.4ish; 0 is greyscale. */
  c: number;
  /** Hue in degrees, 0-360. */
  h: number;
}

export type Hex = `#${string}`;

export const clamp = (value: number, min: number, max: number): number =>
  value < min ? min : value > max ? max : value;

/* ------------------------------------------------------------------ */
/* sRGB <-> linear sRGB                                                 */
/* ------------------------------------------------------------------ */

export function srgbToLinear(channel: number): number {
  const c = channel / 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

export function linearToSrgb(channel: number): number {
  const c =
    channel <= 0.0031308
      ? channel * 12.92
      : 1.055 * Math.pow(channel, 1 / 2.4) - 0.055;
  return clamp(c, 0, 1) * 255;
}

export function linearSrgbToOklab(r: number, g: number, b: number): Oklab {
  const l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b;
  const m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b;
  const s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b;

  const l_ = Math.cbrt(l);
  const m_ = Math.cbrt(m);
  const s_ = Math.cbrt(s);

  return {
    l: 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_,
    a: 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_,
    b: 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_,
  };
}

/**
 * OKLab -> linear sRGB without clamping. Values outside 0-1 mean "this colour
 * is not displayable in sRGB", which is exactly the signal the gamut mapper
 * and the tone bisection need.
 */
export function oklabToUnclampedLinearSrgb(lab: Oklab): Rgb {
  const l_ = lab.l + 0.3963377774 * lab.a + 0.2158037573 * lab.b;
  const m_ = lab.l - 0.1055613458 * lab.a - 0.0638541728 * lab.b;
  const s_ = lab.l - 0.0894841775 * lab.a - 1.291485548 * lab.b;

  const l = l_ * l_ * l_;
  const m = m_ * m_ * m_;
  const s = s_ * s_ * s_;

  return {
    r: 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    g: -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    b: -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  };
}

/** OKLab -> linear sRGB, clamped into the 0-1 cube. */
export function oklabToLinearSrgb(lab: Oklab): Rgb {
  const linear = oklabToUnclampedLinearSrgb(lab);
  return { r: clamp(linear.r, 0, 1), g: clamp(linear.g, 0, 1), b: clamp(linear.b, 0, 1) };
}

export function rgbToOklab(rgb: Rgb): Oklab {
  return linearSrgbToOklab(
    srgbToLinear(rgb.r),
    srgbToLinear(rgb.g),
    srgbToLinear(rgb.b),
  );
}

export function oklabToRgb(lab: Oklab): Rgb {
  const linear = oklabToLinearSrgb(lab);
  return {
    r: linearToSrgb(linear.r),
    g: linearToSrgb(linear.g),
    b: linearToSrgb(linear.b),
  };
}

export function oklabToOklch(lab: Oklab): Oklch {
  const c = Math.sqrt(lab.a * lab.a + lab.b * lab.b);
  let h = (Math.atan2(lab.b, lab.a) * 180) / Math.PI;
  if (h < 0) h += 360;
  return { l: lab.l, c, h };
}

export function oklchToOklab(lch: Oklch): Oklab {
  const rad = (lch.h * Math.PI) / 180;
  return { l: lch.l, a: lch.c * Math.cos(rad), b: lch.c * Math.sin(rad) };
}

/* ------------------------------------------------------------------ */
/* Hex helpers                                                          */
/* ------------------------------------------------------------------ */

const HEX_PATTERN = /^#?([\da-f]{3}|[\da-f]{6})$/i;

export function hexToRgb(hex: string): Rgb {
  const match = HEX_PATTERN.exec(hex.trim());
  if (!match) throw new Error(`Invalid hex colour: ${hex}`);
  const body = match[1];
  const full =
    body.length === 3
      ? body
          .split("")
          .map((char) => char + char)
          .join("")
      : body;
  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
  };
}

const toHexPair = (value: number): string =>
  Math.round(clamp(value, 0, 255)).toString(16).padStart(2, "0");

export function rgbToHex(rgb: Rgb): Hex {
  return `#${toHexPair(rgb.r)}${toHexPair(rgb.g)}${toHexPair(rgb.b)}` as Hex;
}

/* ------------------------------------------------------------------ */
/* CIE L* (Material 3 "tone")                                           */
/* ------------------------------------------------------------------ */

/**
 * Material 3 tones are CIE L* values. Convert tone -> relative luminance
 * (Y) using the CIE 1931 lightness function with a white point of 1.0.
 */
export function toneToLuminance(tone: number): number {
  const t = clamp(tone, 0, 100);
  return t > 8 ? Math.pow((t + 16) / 116, 3) : t / 903.2962962;
}

/** Relative luminance (Y) -> CIE L*, used for contrast checks. */
export function luminanceToTone(y: number): number {
  return y > 0.008856451679 ? 116 * Math.cbrt(y) - 16 : y * 903.2962962;
}

/** Contrast ratio between two relative luminances, per WCAG 2.x. */
export function contrastRatio(y1: number, y2: number): number {
  const lighter = Math.max(y1, y2);
  const darker = Math.min(y1, y2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Relative luminance (Y) of an OKLab colour.
 *
 * OKLab is not defined in terms of CIEXYZ Y, so the accurate route is to
 * convert through linear sRGB. The value is deliberately *not* clamped: an
 * out-of-gamut colour still has a well-defined luminance, and the tone
 * bisection needs that unclamped signal in order to converge.
 */
function relativeLuminanceFromOklab(lab: Oklab): number {
  const linear = oklabToUnclampedLinearSrgb(lab);
  return 0.2126 * linear.r + 0.7152 * linear.g + 0.0722 * linear.b;
}

/** True when the colour sits inside the sRGB cube (with a small tolerance). */
function inGamut(lch: Oklch): boolean {
  const linear = oklabToUnclampedLinearSrgb(oklchToOklab(lch));
  return (
    linear.r >= -1e-4 && linear.r <= 1 + 1e-4 &&
    linear.g >= -1e-4 && linear.g <= 1 + 1e-4 &&
    linear.b >= -1e-4 && linear.b <= 1 + 1e-4
  );
}

/**
 * Find the OKLCH lightness that produces a given CIE tone for a hue + chroma.
 *
 * Luminance increases monotonically with OKLab lightness, so a bisection
 * converges reliably. This is the core operation behind a tonal palette: take
 * a seed hue and chroma, then produce that same colour at tone 0, 10 ... 100.
 */
export function oklchForTone(lch: Oklch, tone: number): Oklch {
  const targetY = toneToLuminance(tone);

  // Lightest/darkest tones cannot hold the seed chroma, and dropping chroma
  // also moves luminance. So the two are solved together: reduce chroma to fit
  // the gamut, then re-solve lightness for the tone, until both hold.
  const solveLightness = (chroma: number): number => {
    let low = 0;
    let high = 1;
    for (let i = 0; i < 28; i += 1) {
      const mid = (low + high) / 2;
      const candidate = oklchToOklab({ l: mid, c: chroma, h: lch.h });
      if (relativeLuminanceFromOklab(candidate) < targetY) low = mid;
      else high = mid;
    }
    return (low + high) / 2;
  };

  let chroma = lch.c;
  let lightness = solveLightness(chroma);

  for (let round = 0; round < 4; round += 1) {
    if (inGamut({ l: lightness, c: chroma, h: lch.h })) break;

    let low = 0;
    let high = chroma;
    for (let i = 0; i < 20; i += 1) {
      const mid = (low + high) / 2;
      if (inGamut({ l: lightness, c: mid, h: lch.h })) low = mid;
      else high = mid;
    }

    if (low === chroma) break;
    chroma = low;
    lightness = solveLightness(chroma);
  }

  return { l: lightness, c: chroma, h: lch.h };
}

/**
 * Reduce chroma until the colour fits inside sRGB, preserving hue and
 * lightness. This is the CSS Color 4 style gamut mapping.
 */
export function gamutMap(lch: Oklch): Oklch {
  if (inGamut(lch)) return lch;

  let low = 0;
  let high = lch.c;
  for (let i = 0; i < 20; i += 1) {
    const mid = (low + high) / 2;
    if (inGamut({ ...lch, c: mid })) low = mid;
    else high = mid;
  }

  return { ...lch, c: low };
}

/** Convert an OKLCH colour to an sRGB hex string, gamut mapped. */
export function oklchToHex(lch: Oklch): Hex {
  return rgbToHex(oklabToRgb(oklchToOklab(gamutMap(lch))));
}

/** Convenience: hex -> OKLCH. */
export function hexToOklch(hex: string): Oklch {
  return oklabToOklch(rgbToOklab(hexToRgb(hex)));
}
