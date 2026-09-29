/**
 * Smoke test for the speed test payload endpoint.
 *
 * Exercises the three things the client measurement code depends on:
 * a HEAD probe for latency, a sized GET for download, and a POST for upload.
 *
 * Run with: node --import ./scripts/register.mjs tests/api.smoke.mjs
 */

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const ENDPOINT = `${BASE}/api/speedtest`;

let failures = 0;

function check(name, ok, detail = "") {
  if (ok) {
    console.log(`ok   ${name}`);
  } else {
    failures += 1;
    console.log(`FAIL ${name}${detail ? `\n  ${detail}` : ""}`);
  }
}

// 1. Latency probe.
const pingStart = performance.now();
const ping = await fetch(`${ENDPOINT}?ping=1&t=${Date.now()}`, {
  method: "HEAD",
  cache: "no-store",
});
const pingMs = performance.now() - pingStart;
check("HEAD ping returns 200", ping.status === 200, `got ${ping.status}`);
check("HEAD ping has no body", (await ping.arrayBuffer()).byteLength === 0);
console.log(`     round trip: ${pingMs.toFixed(1)}ms`);

// 2. Sized download.
const SIZE = 5_000_000;
const downStart = performance.now();
const down = await fetch(`${ENDPOINT}?size=${SIZE}&t=${Date.now()}`, {
  cache: "no-store",
});
const downBuffer = await down.arrayBuffer();
const downMs = performance.now() - downStart;
const mbps = (downBuffer.byteLength * 8) / (downMs / 1000) / 1e6;

check("GET returns 200", down.status === 200, `got ${down.status}`);
check(
  "GET returns the full payload",
  downBuffer.byteLength === SIZE,
  `expected ${SIZE}, got ${downBuffer.byteLength}`,
);
check(
  "response is not cacheable",
  (down.headers.get("cache-control") ?? "").includes("no-store"),
  `cache-control: ${down.headers.get("cache-control")}`,
);
// A zeroed or repeating body would compress to nothing in transit, so make sure
// the bytes really are random.
const view = new Uint8Array(downBuffer);
const distinct = new Set(view.subarray(0, 4096)).size;
check("payload is high-entropy", distinct > 200, `only ${distinct} distinct bytes in first 4 KiB`);
console.log(
  `     ${SIZE} bytes in ${downMs.toFixed(0)}ms  ->  ${mbps.toFixed(1)} Mbps`,
);

// 3. Upload.
const UPLOAD = 1_000_000;
const payload = new Uint8Array(new ArrayBuffer(UPLOAD));
crypto.getRandomValues(payload.subarray(0, 65_536));
const upStart = performance.now();
const up = await fetch(`${ENDPOINT}?t=${Date.now()}`, {
  method: "POST",
  body: payload,
  cache: "no-store",
  headers: { "Content-Type": "application/octet-stream" },
});
const upJson = await up.json();
const upMs = performance.now() - upStart;

check("POST returns 200", up.status === 200, `got ${up.status}`);
check(
  "POST confirms the byte count",
  upJson?.received === UPLOAD,
  `expected ${UPLOAD}, got ${upJson?.received}`,
);
console.log(
  `     ${UPLOAD} bytes up in ${upMs.toFixed(0)}ms  ->  ${((UPLOAD * 8) / (upMs / 1000) / 1e6).toFixed(1)} Mbps`,
);

// 4. Guard rail: a nonsense size must not allocate unbounded memory.
const bad = await fetch(`${ENDPOINT}?size=notanumber`, { cache: "no-store" });
check("invalid size returns 400", bad.status === 400, `got ${bad.status}`);

console.log(failures === 0 ? "\nAll API checks passed." : `\n${failures} check(s) failed.`);
if (failures > 0) process.exitCode = 1;
