// Standard base64 → bytes. Hermes doesn't reliably provide `atob`, and we avoid
// pulling a native/base64 dependency, so decode by hand. Pure + unit-testable.

const B64_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
// Default 0 — padding '=' and any out-of-range index resolve to 0, which the
// padding-aware length calc below discards anyway.
const LOOKUP = new Uint8Array(256);
for (let i = 0; i < B64_CHARS.length; i++) {
  LOOKUP[B64_CHARS.charCodeAt(i)] = i;
}

export function base64ToBytes(b64: string): Uint8Array {
  // Drop an optional `data:...;base64,` prefix and any whitespace/newlines.
  const clean = b64.replace(/^data:[^,]*,/, "").replace(/\s/g, "");
  const len = clean.length;
  if (len === 0) return new Uint8Array(0);

  const padding = clean.endsWith("==") ? 2 : clean.endsWith("=") ? 1 : 0;
  const byteLen = Math.floor((len * 3) / 4) - padding;
  const bytes = new Uint8Array(byteLen);

  let p = 0;
  for (let i = 0; i < len; i += 4) {
    const c0 = LOOKUP[clean.charCodeAt(i)] ?? 0;
    const c1 = LOOKUP[clean.charCodeAt(i + 1)] ?? 0;
    const c2 = LOOKUP[clean.charCodeAt(i + 2)] ?? 0;
    const c3 = LOOKUP[clean.charCodeAt(i + 3)] ?? 0;
    const n = (c0 << 18) | (c1 << 12) | (c2 << 6) | c3;
    if (p < byteLen) bytes[p++] = (n >> 16) & 0xff;
    if (p < byteLen) bytes[p++] = (n >> 8) & 0xff;
    if (p < byteLen) bytes[p++] = n & 0xff;
  }
  return bytes;
}
