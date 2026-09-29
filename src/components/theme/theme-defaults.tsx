import { themeCss } from "@/lib/material/css";

/**
 * Emits the design tokens as a stylesheet on the server.
 *
 * Rendering the tokens here (rather than generating them in the browser)
 * means every accent, in both schemes, is available as plain CSS from the very
 * first paint. Switching the theme is then just a matter of flipping
 * attributes on `<html>` - no flash, and no colour maths in the client bundle.
 */
export function ThemeDefaults() {
  return (
    <style
      id="md-theme-tokens"
      // The content is generated from our own token definitions, not user input.
      dangerouslySetInnerHTML={{ __html: themeCss() }}
    />
  );
}
