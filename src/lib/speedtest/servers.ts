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
  note: "Self-hosted. Measured over the real network when you open this page on another machine - a phone on the same Wi-Fi, say - and reported as your address rather than a data centre.",
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

/**
 * Details about the edge a Cloudflare test actually reached.
 *
 * `speed.cloudflare.com` is anycast, so a reader is already measuring against the
 * *nearest* Cloudflare point of presence without asking for it - the routing
 * sends them to the closest one and the payload endpoints answer from the same
 * machine. That is why the default server is already the nearest one available.
 *
 * What was missing was being able to *say* so. The figure is only interpretable
 * if you know how far away the endpoint was, and `colo` is the closest thing to
 * that: it is the three-letter code of the data centre the request landed in.
 */
export interface EdgeInfo {
  /** Cloudflare data centre code, e.g. "BOM". */
  colo: string;
  /** Reader's own public IP, as seen by the edge. */
  ip: string;
  /** ISO country code of the reader, e.g. "IN". */
  loc: string;
  /** Round-trip time to the edge in milliseconds. */
  rtt: number;
}

/** City names for the busiest Cloudflare codes; unknown codes show as the code. */
const COLO_CITIES: Record<string, string> = {
  AMS: "Amsterdam",
  ARN: "Stockholm",
  ATL: "Atlanta",
  BOM: "Mumbai",
  CDG: "Paris",
  DEL: "Delhi",
  DFW: "Dallas",
  DUB: "Dublin",
  DXB: "Dubai",
  EWR: "Newark",
  FRA: "Frankfurt",
  GRU: "Sao Paulo",
  HKG: "Hong Kong",
  IAD: "Ashburn",
  ICN: "Seoul",
  IHR: "Istanbul",
  JNB: "Johannesburg",
  KIX: "Osaka",
  LAX: "Los Angeles",
  LHR: "London",
  MAD: "Madrid",
  MAA: "Chennai",
  MIA: "Miami",
  MXP: "Milan",
  NRT: "Tokyo",
  ORD: "Chicago",
  SFO: "San Francisco",
  SIN: "Singapore",
  SYD: "Sydney",
  WAW: "Warsaw",
  YYZ: "Toronto",
};

/** Human name for a data centre code, falling back to the code itself. */
export function describeColo(colo: string): string {
  const city = COLO_CITIES[colo];
  return city ? `${city} (${colo})` : colo;
}

/**
 * Ask Cloudflare which edge the reader landed on, and how far away it is.
 *
 * Uses the same origin the test already measures against, and the endpoint
 * answers `Access-Control-Allow-Origin: *`, so this needs no key and no proxy.
 * The latency it returns is measured to the edge directly rather than being
 * inferred from the test, which is what makes it useful context for the result.
 *
 * Resolves to null rather than rejecting when the request fails or is blocked:
 * this is decoration on top of a working test, and a reader behind a strict
 * firewall should still get their speed measured without it.
 */
export async function detectEdge(signal?: AbortSignal): Promise<EdgeInfo | null> {
  const startedAt = performance.now();
  try {
    const response = await fetch("https://speed.cloudflare.com/cdn-cgi/trace", {
      cache: "no-store",
      signal,
    });
    if (!response.ok) return null;

    // The body is `key=value` lines, not JSON.
    const trace: Record<string, string> = {};
    for (const line of (await response.text()).split("\n")) {
      const at = line.indexOf("=");
      if (at > 0) trace[line.slice(0, at)] = line.slice(at + 1);
    }

    if (!trace.colo) return null;
    return {
      colo: trace.colo,
      ip: trace.ip ?? "",
      loc: trace.loc ?? "",
      rtt: Math.round(performance.now() - startedAt),
    };
  } catch {
    return null;
  }
}

/** True when the page itself is being served from localhost. */
export function isLocalhostPage(): boolean {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname;
  return host === "localhost" || host === "127.0.0.1" || host === "::1";
}
