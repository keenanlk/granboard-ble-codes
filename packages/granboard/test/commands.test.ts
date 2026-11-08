import { describe, expect, it } from "vitest";
import {
  Colors,
  buildBlinkCommand,
  buildClearCommand,
  buildHitCommand,
  buildLightRingCommand,
  buildPersistentNumbersCommand,
  buildWaveCommand,
  lerpColor,
} from "../src/index.js";

const hex = (b: Uint8Array) => Array.from(b, (x) => x.toString(16).padStart(2, "0")).join(" ");

// Expected bytes are the worked examples from the README.
describe("command builders", () => {
  it("double 20 red", () => {
    expect(hex(buildHitCommand(20, Colors.RED, { blinks: 2 }))).toBe(
      "02 ff 00 00 00 00 00 00 00 00 19 00 14 00 00 00",
    );
  });

  it("light ring green", () => {
    expect(hex(buildLightRingCommand(Colors.GREEN))).toBe("14 00 ff 00 00 00 00 00 00 00 00 00 14 00 00 01");
  });

  it("blink white 30 frames", () => {
    expect(hex(buildBlinkCommand(Colors.WHITE))).toBe("17 ff ff ff 00 00 00 00 00 00 00 00 1e 00 00 01");
  });

  it("wave red up, blue down", () => {
    expect(hex(buildWaveCommand(Colors.RED, Colors.BLUE))).toBe("11 ff 00 00 00 00 ff 00 00 00 10 00 05 00 00 00");
  });

  it("persistent 15, 16, 17 orange", () => {
    const cmd = buildPersistentNumbersCommand([15, 16, 17]);
    expect(cmd).toHaveLength(20);
    expect(Array.from(cmd).map((v, i) => (v ? i + 1 : 0)).filter(Boolean)).toEqual([15, 16, 17]);
    expect(cmd[14]).toBe(0x05);
  });

  it("clear", () => {
    expect(buildClearCommand()).toEqual(new Uint8Array(20));
  });

  it("validates input", () => {
    expect(() => buildHitCommand(0, Colors.RED)).toThrow(RangeError);
    expect(() => buildHitCommand(21, Colors.RED)).toThrow(RangeError);
    expect(() => buildLightRingCommand({ r: 256, g: 0, b: 0 })).toThrow(RangeError);
    expect(() => buildPersistentNumbersCommand([25])).toThrow(RangeError);
  });

  it("lerps colors", () => {
    expect(lerpColor(Colors.RED, Colors.GREEN, 0.5)).toEqual({ r: 128, g: 128, b: 0 });
  });
});
