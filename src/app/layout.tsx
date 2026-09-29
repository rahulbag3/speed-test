import type { Metadata, Viewport } from "next";
import { Geist_Mono, Roboto_Flex } from "next/font/google";
import "./globals.css";

import { AppShell } from "@/components/layout/app-shell";
import { ThemeDefaults } from "@/components/theme/theme-defaults";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { ThemeScript } from "@/components/theme/theme-script";

/**
 * Roboto Flex is the variable typeface behind Material You. Its optical size
 * axis lets the large display styles stay open and geometric while body copy
 * tightens up, which is exactly what the type scale asks for.
 */
const robotoFlex = Roboto_Flex({
  variable: "--font-roboto-flex",
  subsets: ["latin"],
  axes: ["opsz"],
  display: "swap",
});

/** Used for numeric readouts and code, where fixed-width glyphs matter. */
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Velocity - Material You speed test",
    template: "%s - Velocity",
  },
  description:
    "A fast, private internet speed test built with the Material 3 design system.",
  applicationName: "Velocity",
  keywords: ["speed test", "bandwidth", "internet", "Material You", "Material 3"],
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // The theme colour follows the active scheme, so the browser UI matches.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f9fe" },
    { media: "(prefers-color-scheme: dark)", color: "#121316" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // The theme script mutates these attributes before paint, so hydration
    // must not be expected to reproduce the server's markup.
    <html
      lang="en"
      suppressHydrationWarning
      className={`${robotoFlex.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <ThemeScript />
      </head>
      <body className="min-h-full">
        {/* Design tokens, rendered on the server for every accent and scheme. */}
        <ThemeDefaults />
        <ThemeProvider>
          <AppShell>{children}</AppShell>
        </ThemeProvider>
      </body>
    </html>
  );
}

