import { DEFAULT_ACCENT_ID, isAccentId, type AccentId } from "@/lib/material/accents";

/**
 * Shared constants and the external store behind the theme preference.
 *
 * The theme lives outside React: it is persisted to `localStorage` and it also
 * depends on the OS colour-scheme query. Modelling it as a small store lets
 * the provider read it with `useSyncExternalStore`, which is the supported way
 * to consume state that outlives React and avoids a setState-in-effect
 * cascade on mount.
 */

export const THEME_MODE_KEY = "speedtest:theme-mode";
export const THEME_ACCENT_KEY = "speedtest:accent";

export const THEME_MODES = ["light", "dark", "system"] as const;
export type ThemeMode = (typeof THEME_MODES)[number];
export type ResolvedTheme = "light" | "dark";

export const isThemeMode = (value: string): value is ThemeMode =>
  (THEME_MODES as readonly string[]).includes(value);

export interface ThemeSnapshot {
  mode: ThemeMode;
  accent: AccentId;
  /** What the OS is currently asking for. */
  systemDark: boolean;
}

/** What the server renders, and what a first-time visitor gets. */
export const SERVER_THEME: ThemeSnapshot = {
  mode: "system",
  accent: DEFAULT_ACCENT_ID,
  systemDark: false,
};

type Listener = () => void;

const listeners = new Set<Listener>();
let mediaQuery: MediaQueryList | null = null;
let cached: ThemeSnapshot | null = null;

function getMediaQuery(): MediaQueryList | null {
  if (typeof window === "undefined" || !window.matchMedia) return null;
  mediaQuery ??= window.matchMedia("(prefers-color-scheme: dark)");
  return mediaQuery;
}

function readTheme(): ThemeSnapshot {
  if (typeof window === "undefined") return SERVER_THEME;

  let mode: ThemeMode = "system";
  let accent: AccentId = DEFAULT_ACCENT_ID;

  try {
    const storedMode = window.localStorage.getItem(THEME_MODE_KEY);
    const storedAccent = window.localStorage.getItem(THEME_ACCENT_KEY);
    if (storedMode && isThemeMode(storedMode)) mode = storedMode;
    if (storedAccent && isAccentId(storedAccent)) accent = storedAccent;
  } catch {
    // Storage can be unavailable (private mode, blocked cookies). The defaults
    // above are a perfectly good fallback.
  }

  return { mode, accent, systemDark: getMediaQuery()?.matches ?? false };
}

/**
 * Stable snapshot for `useSyncExternalStore`. Cached because React compares
 * snapshots by identity and would loop if a fresh object came back each call.
 */
export function getThemeSnapshot(): ThemeSnapshot {
  cached ??= readTheme();
  return cached;
}

export function getServerThemeSnapshot(): ThemeSnapshot {
  return SERVER_THEME;
}

export function subscribeToTheme(listener: Listener): () => void {
  listeners.add(listener);

  const query = getMediaQuery();
  const onSystemChange = (event: MediaQueryListEvent) => {
    cached = { ...getThemeSnapshot(), systemDark: event.matches };
    emit();
  };
  query?.addEventListener("change", onSystemChange);

  // Keep other tabs in sync with the preference.
  const onStorage = (event: StorageEvent) => {
    if (event.key === THEME_MODE_KEY || event.key === THEME_ACCENT_KEY) emit();
  };
  window.addEventListener("storage", onStorage);

  return () => {
    listeners.delete(listener);
    query?.removeEventListener("change", onSystemChange);
    window.removeEventListener("storage", onStorage);
  };
}

function emit(): void {
  for (const listener of listeners) listener();
}

function persist(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // See readTheme().
  }
}

export function setThemeMode(mode: ThemeMode): void {
  persist(THEME_MODE_KEY, mode);
  cached = { ...getThemeSnapshot(), mode };
  emit();
}

export function setThemeAccent(accent: AccentId): void {
  persist(THEME_ACCENT_KEY, accent);
  cached = { ...getThemeSnapshot(), accent };
  emit();
}

export function resolveThemeMode(snapshot: ThemeSnapshot): ResolvedTheme {
  if (snapshot.mode === "system") return snapshot.systemDark ? "dark" : "light";
  return snapshot.mode;
}

