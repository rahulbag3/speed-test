/**
 * Entry point for the test scripts.
 *
 * Node loads this via `--import`, which registers the TypeScript-aware
 * resolver hook in ./resolve-ts.mjs against the main thread.
 *
 * Run with: node --import ./scripts/register.mjs tests/<file>.mts
 */
import "./resolve-ts.mjs";
