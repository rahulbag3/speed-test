"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import type { AccentId } from "@/lib/material/accents";
import {
  getServerThemeSnapshot,
  getThemeSnapshot,
  resolveThemeMode,
  setThemeAccent,
  setThemeMode,
  subscribeToTheme,
  type ResolvedTheme,
  type ThemeMode,
} from "./theme-storage";

export type { ResolvedTheme, ThemeMode } from "./theme-storage";

interface ThemeContextValue {
  /** The user's preference, which may be "system". */
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  /** What "system" currently resolves to. */
  resolvedMode: ResolvedTheme;
  accent: AccentId;
  setAccent: (accent: AccentId) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

/** How long the colour cross-fade runs for. Kept in sync with globals.css. */
const SWITCH_DURATION_MS = 320;

/**
 * Owns the theme preference and mirrors it onto `<html>`.
 *
 * The preference is read from an external store with `useSyncExternalStore`,
 * so React uses the server snapshot for the initial hydration render and the
 * real one immediately after. The inline `ThemeScript` has already applied the
 * correct attributes before paint, so nothing flashes in between.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const theme = useSyncExternalStore(
    subscribeToTheme,
    getThemeSnapshot,
    getServerThemeSnapshot,
  );

  const resolvedMode = resolveThemeMode(theme);

  // Mirror the preference onto <html>, which is what the CSS keys off. This is
  // the "synchronise with an external system" use of an effect: no state here.
  useEffect(() => {
    const root = document.documentElement;
    const isFirstRun = !root.hasAttribute("data-theme-mode");

    // Animate colour changes only while the theme is actually switching, so
    // everyday hover transitions are not slowed down.
    if (!isFirstRun) root.setAttribute("data-theme-switching", "");

    root.classList.toggle("dark", resolvedMode === "dark");
    root.style.colorScheme = resolvedMode;
    root.setAttribute("data-accent", theme.accent);
    root.setAttribute("data-theme-mode", theme.mode);

    if (isFirstRun) return;

    const timer = window.setTimeout(() => {
      root.removeAttribute("data-theme-switching");
    }, SWITCH_DURATION_MS);
    return () => window.clearTimeout(timer);
  }, [resolvedMode, theme.accent, theme.mode]);

  const setMode = useCallback((mode: ThemeMode) => setThemeMode(mode), []);
  const setAccent = useCallback((accent: AccentId) => setThemeAccent(accent), []);

  const value = useMemo<ThemeContextValue>(
    () => ({ mode: theme.mode, setMode, resolvedMode, accent: theme.accent, setAccent }),
    [theme.mode, theme.accent, resolvedMode, setMode, setAccent],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used inside a <ThemeProvider>");
  return context;
}
