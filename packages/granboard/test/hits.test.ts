import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { SEGMENT_CODES, decodeHit, describeSegment, toCode } from "../src/index.js";

describe("decodeHit", () => {
  it("decodes a triple 20", () => {
    const hit = decodeHit([51, 46, 52, 64]);
    expect(hit).toMatchObject({ id: "TRP_20", ring: "triple", number: 20, multiplier: 3, score: 60, code: "51-46-52-64" });
  });

  it("decodes 5-byte codes", () => {
    expect(decodeHit([49, 48, 46, 54, 64])?.id).toBe("DBL_14");
  });

  it("decodes bull, miss, and button", () => {
    expect(decodeHit([56, 46, 48, 64])).toMatchObject({ ring: "bull", score: 25 });
    expect(decodeHit([52, 46, 48, 64])).toMatchObject({ ring: "double_bull", score: 50, multiplier: 2 });
    expect(decodeHit([79, 85, 84, 64])).toMatchObject({ ring: "miss", number: null, score: 0 });
    expect(decodeHit([66, 84, 78, 64])).toMatchObject({ ring: "button", number: null });
  });

  it("respects DataView offsets", () => {
    const buf = new Uint8Array([0, 0, 51, 46, 52, 64, 9]).buffer;
    expect(decodeHit(new DataView(buf, 2, 4))?.id).toBe("TRP_20");
  });

  it("returns null for unknown codes", () => {
    expect(decodeHit([1, 2, 3])).toBeNull();
    expect(toCode([1, 2, 3])).toBe("1-2-3");
  });
});

describe("SEGMENT_CODES", () => {
  it("has 84 unique codes covering every segment", () => {
    const ids = Object.values(SEGMENT_CODES);
    expect(ids).toHaveLength(84);
    expect(new Set(ids).size).toBe(84);
    for (let n = 1; n <= 20; n++) {
      for (const p of ["INNER", "OUTER", "TRP", "DBL"]) expect(ids).toContain(`${p}_${n}`);
    }
  });

  it("matches the README quick-reference table", () => {
    const readme = readFileSync(fileURLToPath(new URL("../../../README.md", import.meta.url)), "utf8");
    const rows = [...readme.matchAll(/^\| `[^`]+@` \| `([\d-]+)` \| (\d+|--) \| ([^|]+) \|$/gm)];
    expect(rows.length).toBe(84);
    const ringFor: Record<string, string> = {
      Inner: "inner", Outer: "outer", Triple: "triple", Double: "double",
      Bull: "bull", "Double Bull": "double_bull", "Reset Button": "button", Miss: "miss",
    };
    for (const [, code, num, kind] of rows) {
      const hit = decodeHit(code!.split("-").map(Number));
      expect(hit, code).not.toBeNull();
      expect(hit!.ring, code).toBe(ringFor[kind!.trim()]);
      // README uses 0 for bull; the package reports 25.
      if (num !== "--") expect(hit!.number, code).toBe(num === "0" ? 25 : Number(num));
    }
  });
});

describe("describeSegment", () => {
  it("rejects bad ids", () => {
    expect(() => describeSegment("TRP_21" as never)).toThrow();
  });
});
