// CI guard (S2): syntax-check the JS of every admin panel. The panels are vanilla
// HTML on Vercel — never type-checked before — so a stray syntax error could ship.
// Covers BOTH inline <script> blocks AND local `<script src="…">` files (Issue 4a
// split gym-admin's JS into js/app.js). Each is compiled with `new Function`
// (compile only, no execution); any SyntaxError fails the build.
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const panels = [
  "docs/gym-admin/index.html",
  "docs/gym-panel/index.html",
  "docs/food-admin/index.html",
];

let failed = 0;
for (const path of panels) {
  let html;
  try {
    html = readFileSync(path, "utf8");
  } catch {
    console.error(`✗ ${path}: not found`);
    failed++;
    continue;
  }
  let checked = 0;
  // 1) inline <script> … </script> (attribute-less tags only)
  const inline = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)]
    .map((m) => m[1])
    .filter((s) => s.trim());
  for (let i = 0; i < inline.length; i++) {
    try {
      new Function(inline[i]); // compile-only; never executed
      checked++;
    } catch (e) {
      console.error(`✗ ${path} inline script #${i}: ${e.message}`);
      failed++;
    }
  }
  // 2) local `<script src="…​.js">` files (skip remote http(s) CDNs)
  const srcs = [...html.matchAll(/<script\b[^>]*\bsrc="([^"]+)"[^>]*>/g)]
    .map((m) => m[1])
    .filter((s) => !/^https?:\/\//.test(s) && s.endsWith(".js"));
  for (const src of srcs) {
    const file = resolve(dirname(path), src);
    try {
      new Function(readFileSync(file, "utf8"));
      checked++;
    } catch (e) {
      console.error(`✗ ${path} → ${src}: ${e.message}`);
      failed++;
    }
  }
  console.log(`✓ ${path} — ${checked} script(s) checked`);
}

if (failed) {
  console.error(`\n${failed} panel script(s) failed syntax check`);
  process.exit(1);
}
console.log("\nAll admin panels syntax-clean.");
