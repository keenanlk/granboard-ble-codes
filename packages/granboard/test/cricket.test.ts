import { describe, expect, it, vi } from "vitest";
import {
  GranboardClient,
  PaletteColor,
  buildNumberColorsCommand,
  cricketOpenNumbers,
  type GranboardTransport,
} from "../src/index.js";

const lit = (cmd: Uint8Array) => Array.from(cmd).flatMap((v, i) => (v ? [[i + 1, v]] : []));

describe("buildNumberColorsCommand", () => {
  it("sets each number's own palette color", () => {
    const cmd = buildNumberColorsCommand({ 20: 0x05, 19: 0x02, 1: 0x07 });
    expect(cmd).toHaveLength(20);
    expect(lit(cmd)).toEqual([[1, 7], [19, 2], [20, 5]]);
  });

  it("accepts a Map, and 0 means off", () => {
    expect(lit(buildNumberColorsCommand(new Map([[15, 5], [16, 0]])))).toEqual([[15, 5]]);
  });

  it("rejects bull and bad colors", () => {
    expect(() => buildNumberColorsCommand({ 25: 5 })).toThrow(RangeError);
    expect(() => buildNumberColorsCommand({ 20: 300 })).toThrow(RangeError);
  });
});

describe("cricketOpenNumbers", () => {
  it("lists every Cricket number at the start", () => {
    expect(cricketOpenNumbers([{}, {}])).toEqual([15, 16, 17, 18, 19, 20]);
  });

  it("drops a number only once every player has closed it", () => {
    const players = [{ 20: 3, 19: 3, 18: 5 }, { 20: 3, 19: 2, 18: 3 }];
    expect(cricketOpenNumbers(players)).toEqual([15, 16, 17, 19]);
  });

  it("ignores bull, which the board can't light", () => {
    expect(cricketOpenNumbers([{ 25: 0 }])).not.toContain(25);
  });

  it("treats no players as everything open", () => {
    expect(cricketOpenNumbers([])).toEqual([15, 16, 17, 18, 19, 20]);
  });
});

describe("client helpers", () => {
  const setup = async () => {
    const writes: Uint8Array[] = [];
    const transport: GranboardTransport = {
      write: vi.fn(async (b: Uint8Array) => void writes.push(b)),
      subscribe: () => () => undefined,
    };
    return { client: await GranboardClient.create(transport), writes };
  };

  it("showCricket lights the open numbers, then clears when all are closed", async () => {
    const { client, writes } = await setup();
    await client.showCricket([{ 15: 3, 16: 3 }, { 15: 3 }]);
    expect(lit(writes[0]!)).toEqual([16, 17, 18, 19, 20].map((n) => [n, PaletteColor.ORANGE]));

    const allClosed = { 15: 3, 16: 3, 17: 3, 18: 3, 19: 3, 20: 3 };
    await client.showCricket([allClosed, allClosed]);
    expect(writes[1]).toEqual(new Uint8Array(20));
  });

  it("setNumberColors sends per-number colors", async () => {
    const { client, writes } = await setup();
    await client.setNumberColors({ 20: 5, 3: 1 });
    expect(lit(writes[0]!)).toEqual([[3, 1], [20, 5]]);
  });
});
