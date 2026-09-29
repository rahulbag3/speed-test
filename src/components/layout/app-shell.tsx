import type { ReactNode } from "react";
import { SiteFooter } from "./site-footer";
import { SiteHeader } from "./site-header";

/**
 * Page chrome shared by every route: a sticky app bar, the page body, and the
 * footer. The soft tonal wash is applied here so every screen inherits the
 * Material You background treatment.
 */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="tonal-backdrop flex min-h-dvh flex-col">
      <a
        href="#main"
        className="sr-only rounded-full bg-primary px-4 py-2 text-label-lg text-on-primary focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-100"
      >
        Skip to content
      </a>
      <SiteHeader />
      <main id="main" className="flex-1">
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
