# Velocity

A premium, Material You inspired internet speed test.

This repository currently contains the **foundation**: the design system, the
theme engine, the layout shell and the component kit. The measurement engine
(the dial, the live readout, the download/upload phases) is deliberately **not**
implemented yet — the hero reserves the space it will occupy.

## Stack

- **Next.js 16** (App Router, Turbopack) + **React 19**
- **TypeScript** in strict mode
- **Tailwind CSS v4** (`@theme inline`, CSS-first configuration)
- No component or utility libraries — the design system is built from scratch

## Getting started

```bash
npm install
npm run dev
```

| Script              | What it does                     |
| ------------------- | -------------------------------- |
| `npm run dev`       | Development server               |
| `npm run build`     | Production build                 |
| `npm run typecheck` | `tsc --noEmit`                   |
| `npm run lint`      | ESLint                           |
| `npm test`          | Design system tests (see below)  |
| `npm run check`     | typecheck + lint + tests         |

### Opening it on another device

`npm run dev` binds to every network interface and prints a second URL:

```
- Local:    http://localhost:3000
- Network:  http://192.168.0.42:3000
```

Open the **Network** URL on a phone or laptop on the same Wi-Fi to use the test
there. Measuring from a second device is the more meaningful way to use this
app anyway, since the bytes then cross a real network instead of loopback.

Out of the box the dev server would answer that device's requests for its own
`/_next/*` assets with a 403, which shows up as a blank or unstyled page rather
than an obvious error. `allowedDevOrigins` in `next.config.ts` opens the private
address ranges to fix that; it only affects development.

## How the theme works

The theme is **generated**, not hand-picked. A single seed colour is expanded
into Material 3 tonal palettes, and those palettes are mapped onto the full set
of colour roles for both the light and dark schemes.

```
seed colour -> OKLCH -> tonal palette (tones 0-100) -> role map -> CSS custom properties
```

1. **`src/lib/material/color.ts`** — colour science. sRGB ↔ linear sRGB ↔
   CIEXYZ ↔ OKLab/OKLCH, the CIE L\* ("tone") conversion Material is defined
   in, and chroma-reduction gamut mapping so a palette always lands inside sRGB.
2. **`src/lib/material/palette.ts`** — builds a tonal palette from a hue and
   chroma, and derives the primary / secondary / tertiary / neutral /
   neutral-variant / error palettes from one seed.
3. **`src/lib/material/theme.ts`** — maps those palettes onto the 35 Material 3
   colour roles, using the spec's tone assignments for each scheme.
4. **`src/lib/material/tokens.ts`** — the type scale, shape scale, elevation and
   motion tokens.
5. **`src/lib/material/css.ts`** — serialises everything above into a
   stylesheet string.

### Why it is all server-rendered

The root layout renders the generated stylesheet into the document, once per
accent and once per scheme. The result is that switching the theme is pure CSS:

- `src/components/theme/theme-script.tsx` — a small blocking inline script that
  applies the stored preference to `<html>` **before first paint**, so there is
  no flash for returning dark-mode users.
- `src/components/theme/theme-provider.tsx` — reads the preference through
  `useSyncExternalStore` and mirrors it onto `<html>` on every change.
- `src/components/theme/theme-mode-toggle.tsx` and `accent-picker.tsx` — the
  controls. Their swatch colours are computed on the server and passed down as
  plain props.

**The colour maths never reaches the browser.** The only accent data shipped to
the client is the six-entry preset list, which the provider needs in order to
validate the stored id.

### Using it

```tsx
<Surface tone="primary" level={2} radius="xl" className="p-8">
  <Text variant="headline-md">Results</Text>
</Surface>

<Button variant="filled" size="lg" iconStart={<Icon name="play" size={20} />}>
  Start test
</Button>
```

Add a new accent by appending to `ACCENT_PRESETS` in
`src/lib/material/accents.ts` — the picker, the provider and the generated
stylesheet are all driven from that list.

## Layout

```
src/
  app/
    layout.tsx                 root layout: fonts, metadata, providers
    page.tsx                   home
    globals.css                Tailwind theme wiring + base styles
  components/
    ui/                        the component kit (exported from ./index)
    theme/                     theme engine and controls
    layout/                    app shell, header, footer
    sections/                  home page sections
  lib/
    cn.ts                      className merge
    material/                  the design system
tests/                         design system tests
scripts/                       Node resolver for running TS tests directly
```

## Tests

`npm test` runs two suites against the real modules (using Node's native
TypeScript support plus a small resolver hook in `scripts/`):

- **`tests/cn.test.mts`** — the className merger, including the awkward cases:
  Tailwind overloads `text-` across four different CSS properties, so
  `text-display-xl` and `text-left` must not cancel each other out.
- **`tests/theme.test.mts`** — verifies that every generated palette actually
  lands on the tones it claims to, and that all 252 foreground/background role
  pairs meet WCAG AA contrast across all six accents in both schemes.
