/**
 * Tests for the design system.
 *
 * Covers the two properties the UI actually depends on: the tonal palettes
 * land on the tones they claim to, and every colour pair the components use
 * is legible in both schemes for every accent.
 *
 * Run with: npm run test:theme
 */

import { createMaterialTheme, type ColorRole, type ColorScheme } from "../src/lib/material/theme";
import { ACCENT_PRESETS } from "../src/lib/material/accents";
import {
  contrastRatio,
  hexToOklch,
  hexToRgb,
  oklabToUnclampedLinearSrgb,
  rgbToOklab,
  srgbToLinear,
} from "../src/lib/material/color";
import { schemePalettes } from "../src/lib/material/palette";

let failures = 0;

function check(name: string, ok: boolean, detail = ""): void {
  if (ok) {
    console.log(`ok   ${name}`);
  } else {
    failures += 1;
    console.log(`FAIL ${name}${detail ? `\n  ${detail}` : ""}`);
  }
}

/** Relative luminance of a hex colour, per WCAG 2.x. */
function luminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  return 0.2126 * srgbToLinear(r) + 0.7152 * srgbToLinear(g) + 0.0722 * srgbToLinear(b);
}

/** CIE L* of a hex colour, which is what a Material "tone" means. */
function toneOf(hex: string): number {
  const linear = oklabToUnclampedLinearSrgb(rgbToOklab(hexToRgb(hex)));
  const y = 0.2126 * linear.r + 0.7152 * linear.g + 0.0722 * linear.b;
  const clamped = Math.min(1, Math.max(0, y));
  return clamped > 0.008856451679 ? 116 * Math.cbrt(clamped) - 16 : clamped * 903.2962962;
}

/* ------------------------------------------------------------------ */
/* Tonal palettes                                                       */
/* ------------------------------------------------------------------ */

for (const preset of ACCENT_PRESETS) {
  const palettes = schemePalettes(preset.seed, { primaryChroma: preset.primaryChroma });
  const errors: string[] = [];

  for (const tone of [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100]) {
    const hex = palettes.primary.tone(tone);
    if (!/^#[0-9a-f]{6}$/.test(hex)) {
      errors.push(`tone ${tone} produced ${hex}`);
      continue;
    }
    // Chroma reduction at the extremes means the achieved tone drifts a
    // little; half a tone of error is well inside perceptual tolerance.
    const drift = Math.abs(toneOf(hex) - tone);
    if (drift > 0.5) errors.push(`tone ${tone} measured ${toneOf(hex).toFixed(2)} (${hex})`);
  }

  check(`${preset.id}: primary palette hits its tones`, errors.length === 0, errors.join("; "));

  const mid = hexToOklch(palettes.primary.tone(40));
  const seed = hexToOklch(preset.seed);
  const hueDrift = Math.abs(((mid.h - seed.h + 540) % 360) - 180);
  check(
    `${preset.id}: tone 40 keeps the seed hue`,
    hueDrift < 1.5,
    `hue ${mid.h.toFixed(1)} vs seed ${seed.h.toFixed(1)}`,
  );
}

/* ------------------------------------------------------------------ */
/* Contrast                                                             */
/* ------------------------------------------------------------------ */

/** [foreground role, background role, minimum ratio] */
const PAIRS: [ColorRole, ColorRole, number][] = [
  ["on-surface", "surface", 4.5],
  ["on-surface", "surface-container-low", 4.5],
  ["on-surface", "surface-container", 4.5],
  ["on-surface", "surface-container-high", 4.5],
  ["on-surface", "surface-container-highest", 4.5],
  ["on-surface-variant", "surface", 4.5],
  ["on-surface-variant", "surface-container", 4.5],
  ["on-primary", "primary", 4.5],
  ["on-primary-container", "primary-container", 4.5],
  ["on-secondary", "secondary", 4.5],
  ["on-secondary-container", "secondary-container", 4.5],
  ["on-tertiary", "tertiary", 4.5],
  ["on-tertiary-container", "tertiary-container", 4.5],
  ["on-error", "error", 4.5],
  ["on-error-container", "error-container", 4.5],
  ["inverse-on-surface", "inverse-surface", 4.5],
  ["primary", "surface", 4.5],
  ["primary", "surface-container", 4.5],
  ["secondary", "surface", 4.5],
  ["error", "surface", 4.5],
  ["outline", "surface", 3],
];

let contrastChecks = 0;

for (const preset of ACCENT_PRESETS) {
  const theme = createMaterialTheme(preset.seed, { primaryChroma: preset.primaryChroma });

  for (const scheme of ["light", "dark"] as const) {
    const colors = theme[scheme] as ColorScheme;
    const failuresHere: string[] = [];

    for (const [fg, bg, min] of PAIRS) {
      const ratio = contrastRatio(luminance(colors[fg]), luminance(colors[bg]));
      contrastChecks += 1;
      if (ratio < min) {
        failuresHere.push(
          `${fg} on ${bg} = ${ratio.toFixed(2)}:1 (needs ${min})`,
        );
      }
    }

    check(
      `${preset.id}/${scheme}: ${PAIRS.length} contrast pairs`,
      failuresHere.length === 0,
      failuresHere.join("\n  "),
    );
  }
}

console.log(
  `\n${contrastChecks} contrast checks across ${ACCENT_PRESETS.length} accents x 2 schemes.`,
);
if (failures > 0) {
  console.log(`${failures} test(s) failed.`);
  process.exitCode = 1;
} else {
  console.log("All theme tests passed.");
}

