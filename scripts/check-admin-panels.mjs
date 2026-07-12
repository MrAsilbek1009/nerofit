// CI guard (S2): syntax-check the inline JS of every admin panel. The panels are
// vanilla HTML on Vercel — never type-checked before — so a stray syntax error
// could ship. This parses each inline <script> with `new Function` (compile only,
// no execution) and fails the build on any SyntaxError.
import { readFileSync } from "node:fs";

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
  // Only attribute-less <script> tags hold inline code; <script src=…> is skipped.
  const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)]
    .map((m) => m[1])
    .filter((s) => s.trim());
  for (let i = 0; i < scripts.length; i++) {
    try {
      new Function(scripts[i]); // compile-only; never executed
    } catch (e) {
      console.error(`✗ ${path} inline script #${i}: ${e.message}`);
      failed++;
    }
  }
  console.log(`✓ ${path} — ${scripts.length} inline script(s) checked`);
}

if (failed) {
  console.error(`\n${failed} panel script(s) failed syntax check`);
  process.exit(1);
}
console.log("\nAll admin panels syntax-clean.");
