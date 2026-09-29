import { NextResponse } from "next/server";

/**
 * Payload endpoint for the speed test.
 *
 * Serves (and accepts) a body of unpredictable bytes on demand. It does not
 * touch disk or a database: for a download the response is generated on the
 * fly, and for an upload the body is read and discarded, because the test only
 * cares about how long the bytes took to arrive.
 *
 * Running on the same origin as the page keeps the measurement free of
 * third-party caching and DNS, and keeps the user's data on their own server.
 */

/** Cap on a single response, to keep memory use predictable. */
const MAX_BYTES = 25_000_000;

/** `crypto.getRandomValues` refuses to fill more than 64 KiB at a time. */
const CHUNK = 65_536;

/**
 * Next.js reads this to pick the runtime. The edge runtime has no
 * `crypto.getRandomValues` guarantee worth relying on here, and this route is
 * cheap to run on the Node runtime.
 */
export const runtime = "nodejs";

/** Never let this be cached: a cached payload would measure nothing. */
const NO_STORE = {
  "Cache-Control": "no-store, no-cache, must-revalidate, private",
  Pragma: "no-cache",
} as const;

function randomPayload(size: number): Uint8Array<ArrayBuffer> {
  // Built from an explicit ArrayBuffer so the type is directly usable as a
  // Response body without a cast.
  const body = new Uint8Array(new ArrayBuffer(size));
  for (let offset = 0; offset < size; offset += CHUNK) {
    crypto.getRandomValues(body.subarray(offset, Math.min(offset + CHUNK, size)));
  }
  return body;
}

function parseSize(raw: string | null): number {
  if (!raw) return 0;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return 0;
  return Math.min(parsed, MAX_BYTES);
}

/** Serve a payload of random bytes. `HEAD` (used for latency) returns no body. */
export async function GET(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url);

  // Latency probe: respond immediately, with no body at all.
  if (searchParams.has("ping")) {
    return new Response(null, { status: 200, headers: NO_STORE });
  }

  const size = parseSize(searchParams.get("size"));
  if (size === 0) {
    return NextResponse.json(
      { error: "Provide a positive `size` query parameter." },
      { status: 400, headers: NO_STORE },
    );
  }

  return new Response(randomPayload(size), {
    status: 200,
    headers: {
      ...NO_STORE,
      "Content-Type": "application/octet-stream",
      "Content-Length": String(size),
    },
  });
}

/** Accept an upload, read it, and throw it away. */
export async function POST(request: Request): Promise<Response> {
  // `arrayBuffer()` blocks until the whole body has arrived, which is exactly
  // the moment we want to compare against the clock on the client.
  const body = await request.arrayBuffer().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Could not read body." }, { status: 400, headers: NO_STORE });
  }

  return NextResponse.json(
    { received: body.byteLength },
    { status: 200, headers: NO_STORE },
  );
}
