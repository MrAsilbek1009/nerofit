import { describe, expect, it } from "@jest/globals";
import { parseReps } from "./repsParse";

describe("parseReps", () => {
  it("treats second/minute qualifiers as timed holds", () => {
    expect(parseReps("10 sek")).toEqual({ kind: "time", value: 10, raw: "10 sek" });
    expect(parseReps("30 sek har oyoq")).toMatchObject({ kind: "time", value: 30 });
    expect(parseReps("2 daqiqa")).toMatchObject({ kind: "time", value: 2 });
    expect(parseReps("10 min")).toMatchObject({ kind: "time", value: 10 });
    expect(parseReps("45 сек")).toMatchObject({ kind: "time", value: 45 });
  });

  it("treats everything else as a rep count", () => {
    expect(parseReps("8 har oyoq")).toMatchObject({ kind: "reps", value: 8 });
    expect(parseReps("10 takror")).toMatchObject({ kind: "reps", value: 10 });
    expect(parseReps("12")).toEqual({ kind: "reps", value: 12, raw: "12" });
  });

  it("keeps the first number only and preserves the raw string", () => {
    expect(parseReps("8 har oyoq")).toHaveProperty("raw", "8 har oyoq");
    expect(parseReps("  15 takror  ")).toMatchObject({ value: 15, raw: "15 takror" });
  });

  it("returns a null value when there is no number or input", () => {
    expect(parseReps("har oyoq")).toEqual({ kind: "reps", value: null, raw: "har oyoq" });
    expect(parseReps(null)).toEqual({ kind: "reps", value: null, raw: "" });
    expect(parseReps(undefined)).toEqual({ kind: "reps", value: null, raw: "" });
    expect(parseReps("")).toEqual({ kind: "reps", value: null, raw: "" });
  });
});
