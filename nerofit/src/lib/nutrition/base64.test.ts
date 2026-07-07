import { describe, expect, it } from "@jest/globals";
import { base64ToBytes } from "./base64";

function toStr(bytes: Uint8Array): string {
  return String.fromCharCode(...bytes);
}

describe("base64ToBytes", () => {
  it("decodes a group with no padding", () => {
    expect(toStr(base64ToBytes("TWFu"))).toBe("Man");
  });

  it("decodes one and two padding chars", () => {
    expect(toStr(base64ToBytes("TWE="))).toBe("Ma");
    expect(toStr(base64ToBytes("TQ=="))).toBe("M");
  });

  it("decodes a longer string", () => {
    expect(toStr(base64ToBytes("aGVsbG8gd29ybGQ="))).toBe("hello world");
  });

  it("matches Node's decoder for arbitrary binary bytes", () => {
    const raw = [0, 255, 16, 128, 7, 42, 99, 200, 1];
    const b64 = Buffer.from(raw).toString("base64");
    expect(Array.from(base64ToBytes(b64))).toEqual(raw);
  });

  it("returns an empty array for an empty string", () => {
    expect(base64ToBytes("").length).toBe(0);
  });

  it("strips a data: URI prefix and whitespace", () => {
    expect(toStr(base64ToBytes("data:image/jpeg;base64,TWFu"))).toBe("Man");
    expect(toStr(base64ToBytes("TW\nFu"))).toBe("Man");
  });
});
