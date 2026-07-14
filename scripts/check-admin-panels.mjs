// CI guard (S2 + Issue 4b): syntax-check the JS of every admin panel. The panels
// are vanilla HTML on Vercel — never type-checked before — so a stray syntax error
// could ship. Covers BOTH inline <script> blocks (compiled with `new Function`,
// no execution) AND ES-module files under a panel's sibling js/ dir (checked with
// `node --check --input-type=module`, since import/export can't go through
// `new Function`). Any SyntaxError fails the build.
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { execFileSync } from "node:child_process";

const panels = [
  "docs/gym-admin/index.html",
  "docs/gym-panel/index.html",
  "docs/food-admin/index.html",
];

// Syntax-check ES-module source without executing it.
function checkModule(file) {
  execFileSync(process.execPath, ["--check", "--input-type=module"], {
    input: readFileSync(file, "utf8"),
  });
}

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

  // 2) ES-module files in the panel's sibling js/ dir (Issue 4b split)
  const jsDir = join(dirname(path), "js");
  if (existsSync(jsDir)) {
    for (const f of readdirSync(jsDir).filter((f) => f.endsWith(".js")).sort()) {
      try {
        checkModule(join(jsDir, f));
        checked++;
      } catch (e) {
        console.error(`✗ ${path} → js/${f}: ${(e.stderr && e.stderr.toString()) || e.message}`);
        failed++;
      }
    }
  }

  console.log(`✓ ${path} — ${checked} script(s) checked`);
}

if (failed) {
  console.error(`\n${failed} panel script(s) failed syntax check`);
  process.exit(1);
}
console.log("\nAll admin panels syntax-clean.");
