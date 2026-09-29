import type { NextConfig } from "next";

/**
 * Lets the dev server answer requests that arrive from another device on the
 * same network.
 *
 * `next dev` already listens on every interface, so the server is reachable at
 * http://<your-lan-ip>:3000 - but by default it *refuses* to serve its own dev
 * assets (the `/_next/*` chunks and the HMR socket) to anything but localhost,
 * answering 403. The page HTML and the app's own API routes still work, so the
 * failure is confusing: you get a blank or half-styled page with no error worth
 * reading. Listing the private ranges here is what makes the LAN URL usable.
 *
 * Only the hostname is matched, with no scheme and no port. Each pattern is a
 * list of dot-separated labels, so `192.168.*.*` covers a whole /16 without
 * pinning this config to whatever address the DHCP lease happens to hand out
 * today. This is development-only configuration; it has no effect on a build.
 *
 * @see https://nextjs.org/docs/app/api-reference/config/next-config-js/allowedDevOrigins
 */

// RFC 1918 private ranges. 10/8 and 192.168/16 are a single pattern each; the
// 172.16/12 block spans sixteen /16s, so it is generated rather than typed out.
const PRIVATE_LAN_ORIGINS = [
  "10.*.*.*",
  "192.168.*.*",
  ...Array.from({ length: 16 }, (_, i) => `172.${16 + i}.*.*`),
];

const nextConfig: NextConfig = {
  allowedDevOrigins: PRIVATE_LAN_ORIGINS,
};

export default nextConfig;
