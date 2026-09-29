import Link from "next/link";
import { AccentPicker } from "@/components/theme/accent-picker";
import { ThemeModeToggle } from "@/components/theme/theme-mode-toggle";
import { AppBar, Icon, Surface, Text } from "@/components/ui";
import { ACCENT_PRESETS } from "@/lib/material/accents";
import { createAccentTheme } from "@/lib/material/theme";

/**
 * Site header.
 *
 * A server component: the accent swatches are computed here with the palette
 * generator and passed to the client picker as plain data, so no colour maths
 * ends up in the browser bundle.
 *
 * The site is a single page, so there is no section navigation here - just the
 * brand and the theme controls.
 */

const accentOptions = ACCENT_PRESETS.map((preset) => ({
  id: preset.id,
  name: preset.name,
  swatch: createAccentTheme(preset).swatch,
}));

export function SiteHeader() {
  return (
    <AppBar sticky size="small" className="px-4 sm:px-6 lg:px-8">
      <Link
        href="/"
        className="flex items-center gap-3 rounded-lg text-on-surface no-underline"
      >
        <Surface
          tone="primary"
          level={0}
          radius="lg"
          className="grid size-9 place-items-center"
        >
          <Icon name="gauge" size={20} className="text-on-primary-container" />
        </Surface>
        <Text variant="title-md" as="span" className="hidden sm:inline">
          Velocity
        </Text>
      </Link>

      <div className="ml-auto flex items-center gap-3">
        <AccentPicker
          options={accentOptions}
          className="hidden sm:flex"
        />
        <ThemeModeToggle />
      </div>
    </AppBar>
  );
}
