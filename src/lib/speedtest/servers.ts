/**
 * Test servers.
 *
 * This matters more than it looks. If the page and the payload endpoint are
 * served from the same machine, the request never leaves over the network - it
 * goes to loopback - and the "speed" you measure is your loopback throughput
 * (easily 1000 Mbps), not your internet connection. To get a number that
 * means anything, the bytes have to cross the network to somewhere else.
 *
 * So the target is explicit and visible: the UI names the server, and warns
 * when a same-origin server is being used from localhost.
 */

export interface TestServer {
  id: string;
  /** Shown in the UI so the number is always interpretable. */
  label: string;
  /** Short note about what this server measures. */
  note: string;
  /** URL for a download of `bytes` bytes. */
  downloadUrl: (bytes: number, cacheBuster: string) => string;
  /** URL that accepts an uploaded body. */
  uploadUrl: (cacheBuster: string) => string;
  /** URL for a cheap round-trip probe. Must answer HEAD with no body. */
  pingUrl: (cacheBuster: string) => string;
  /** True when the endpoint lives on the same origin as the page. */
  sameOrigin: boolean;
}

/**
 * Cloudflare's public speed test endpoints. They serve and accept an arbitrary
 * number of bytes and send `Access-Control-Allow-Origin: *`, so a browser on
 * any origin can measure against them. This is the default because it is the
 * only way to get a real network number from a locally served page.
 */
const CLOUDFLARE: TestServer = {
  id: "cloudflare",
  label: "Cloudflare",
  note: "Measures your real connection to a remote server.",
  downloadUrl: (bytes, bust) => `https://speed.cloudflare.com/__down?bytes=${bytes}&${bust}`,
  uploadUrl: (bust) => `https://speed.cloudflare.com/__up?${bust}`,
  pingUrl: (bust) => `https://speed.cloudflare.com/__down?bytes=0&${bust}`,
  sameOrigin: false,
};

/**
 * The endpoint this app serves itself. Good for self-hosting with no third
 * party involved, but note that it only measures the network when the visitor
 * is on a *different* machine to the server.
 */
export const LOCAL_SERVER: TestServer = {
  id: "local",
  label: "This server",
  note: "Self-hosted. Measures the network only for visitors on another machine.",
  downloadUrl: (bytes, bust) => `/api/speedtest?size=${bytes}&${bust}`,
  uploadUrl: (bust) => `/api/speedtest?${bust}`,
  pingUrl: (bust) => `/api/speedtest?ping=1&${bust}`,
  sameOrigin: true,
};

export const TEST_SERVERS: readonly TestServer[] = [CLOUDFLARE, LOCAL_SERVER];

export const DEFAULT_SERVER_ID = CLOUDFLARE.id;

export function getServer(id: string): TestServer {
  return TEST_SERVERS.find((server) => server.id === id) ?? CLOUDFLARE;
}

/** True when the page itself is being served from localhost. */
export function isLocalhostPage(): boolean {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname;
  return host === "localhost" || host === "127.0.0.1" || host === "::1";
}
