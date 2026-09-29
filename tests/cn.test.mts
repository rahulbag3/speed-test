/**
 * Tests for the className merger.
 *
 * Run with: node --import ./.tmp-verify/register.mjs .tmp-verify/cn.test.mts
 * (or via the `test:cn` script, which sets up the resolver).
 *
 * The `text-*` cases matter most: Tailwind overloads that prefix across four
 * CSS properties, and getting it wrong silently drops real classes.
 */

import { cn } from "../src/lib/cn";

let failures = 0;
let total = 0;

function check(name: string, actual: string, expected: string): void {
  total += 1;
  if (actual === expected) {
    console.log(`ok   ${name}`);
  } else {
    failures += 1;
    console.log(`FAIL ${name}\n  expected: ${expected}\n  actual:   ${actual}`);
  }
}

// Flattening
check("flattens arrays", cn("a", ["b", ["c"]]), "a b c");
check("objects and falsy", cn("a", { b: true, c: false }, null, undefined, false), "a b");
check("splits whitespace", cn("  a   b  "), "a b");

// Conflicts
check("radius override", cn("rounded-2xl", "rounded-lg"), "rounded-lg");
check("radius edges compose", cn("rounded-t-lg", "rounded-b-lg"), "rounded-t-lg rounded-b-lg");
check("radius base + edge", cn("rounded-t-xl", "rounded-2xl"), "rounded-t-xl rounded-2xl");
check("padding override", cn("p-4", "p-8"), "p-8");
check("axis beats shorthand", cn("p-4", "px-8", "py-2"), "p-4 px-8 py-2");
check("negative replaces positive", cn("mt-2", "-mt-4"), "-mt-4");
check("width override", cn("w-4", "w-full"), "w-full");
check("height independent", cn("w-4", "h-4"), "w-4 h-4");
check("display is exclusive", cn("flex", "items-center", "grid"), "items-center grid");
check("display vs hidden", cn("flex", "hidden"), "hidden");
check("variants scope conflicts", cn("hover:px-2", "px-4", "hover:px-6"), "px-4 hover:px-6");
check("font weight override", cn("font-medium", "font-bold"), "font-bold");
check("border style vs colour", cn("border", "border-2", "border-primary"), "border-primary");
check("aspect override", cn("aspect-square", "aspect-video"), "aspect-video");
check("arbitrary width", cn("w-[3rem]", "w-10"), "w-10");

// The text- overload
check(
  "material size + alignment",
  cn("text-display-xl", "text-left", "text-balance"),
  "text-display-xl text-left text-balance",
);
check("size override", cn("text-display-lg", "text-body-md"), "text-body-md");
check("size and colour coexist", cn("text-lg", "text-red-500"), "text-lg text-red-500");
check("colour override", cn("text-primary", "text-on-surface"), "text-on-surface");
check(
  "alignment override",
  cn("text-left", "text-center"),
  "text-center",
);
check("decoration independent", cn("text-body-md", "no-underline"), "text-body-md no-underline");
check("metric scale token", cn("text-metric", "text-center"), "text-metric text-center");
check(
  "arbitrary size not a colour",
  cn("text-[3rem]", "text-center"),
  "text-[3rem] text-center",
);
check(
  "arbitrary colour is a colour",
  cn("text-[#fff]", "text-primary"),
  "text-primary",
);

console.log(`\n${total - failures}/${total} checks passed.`);
if (failures > 0) {
  console.log(`${failures} test(s) failed.`);
  process.exitCode = 1;
}
