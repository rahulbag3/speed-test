import { AccentPicker } from "@/components/theme/accent-picker";
import { Text } from "@/components/ui";
import { ACCENT_PRESETS } from "@/lib/material/accents";
import { createAccentTheme } from "@/lib/material/theme";

const accentOptions = ACCENT_PRESETS.map((preset) => ({
  id: preset.id,
  name: preset.name,
  swatch: createAccentTheme(preset).swatch,
}));

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-outline-variant">
      <div className="mx-auto flex w-full max-w-4xl flex-col items-center gap-4 px-4 py-8 sm:flex-row sm:justify-between sm:px-6 lg:px-8">
        <Text variant="body-sm" muted>
          Velocity
        </Text>
        <AccentPicker options={accentOptions} />
      </div>
    </footer>
  );
}
