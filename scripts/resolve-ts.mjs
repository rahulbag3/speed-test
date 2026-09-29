/**
 * Resolver hook that lets Node's native TypeScript support load the project's
 * `src` modules, which use extensionless relative imports (the convention
 * Next.js and TypeScript's bundler resolution expect).
 *
 * Registered by ./register.mjs; used via `node --import ./scripts/register.mjs`.
 */

import { registerHooks } from "node:module";

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (!specifier.startsWith(".")) return nextResolve(specifier, context);
    // Only try the `.ts` form when the specifier has no extension of its own.
    if (/\.[cm]?[jt]sx?$/.test(specifier)) return nextResolve(specifier, context);

    try {
      return nextResolve(`${specifier}.ts`, context);
    } catch {
      return nextResolve(specifier, context);
    }
  },
});
