// Lazy, crash-safe wrapper around expo-clipboard. The package resolves its
// native module (`ExpoClipboard`) at import time, so a static
// `import * as Clipboard from "expo-clipboard"` throws on any dev client built
// before the module was added — taking the whole screen down with it. Requiring
// it on demand inside a try/catch lets the UI degrade gracefully (the copy
// button no-ops) instead. Same pattern as src/lib/notifications.ts.

type ClipboardModule = typeof import("expo-clipboard");

// `undefined` = not tried yet, `null` = native module absent.
let mod: ClipboardModule | null | undefined;

function getMod(): ClipboardModule | null {
  if (mod !== undefined) return mod;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    mod = require("expo-clipboard") as ClipboardModule;
  } catch {
    mod = null;
  }
  return mod;
}

export function clipboardAvailable(): boolean {
  return getMod() !== null;
}

// Copy text to the clipboard. Returns false (instead of throwing) when the
// native module is unavailable or the copy fails, so callers can skip the
// "copied" confirmation without crashing.
export async function copyToClipboard(text: string): Promise<boolean> {
  const M = getMod();
  if (!M) return false;
  try {
    await M.setStringAsync(text);
    return true;
  } catch {
    return false;
  }
}
