import type { DartNumber } from "./segments.js";

export interface RGB {
  r: number;
  g: number;
  b: number;
}

/** Common colors from the protocol reference. */
export const Colors = Object.freeze({
  RED: { r: 255, g: 0, b: 0 },
  GREEN: { r: 0, g: 255, b: 0 },
  BLUE: { r: 0, g: 0, b: 255 },
  WHITE: { r: 255, g: 255, b: 255 },
  YELLOW: { r: 255, g: 200, b: 0 },
  ORANGE: { r: 255, g: 80, b: 0 },
  LIGHT_BLUE: { r: 0, g: 200, b: 255 },
  OFF: { r: 0, g: 0, b: 0 },
} satisfies Record<string, RGB>);

/** Board palette indices for the 20-byte persistent-numbers command. Only ORANGE is confirmed. */
export const PaletteColor = Object.freeze({
  OFF: 0x00,
  ORANGE: 0x05,
});

/** 16-byte command types (byte 0). */
export const CommandType = Object.freeze({
  HIT_SINGLE: 0x01,
  HIT_DOUBLE: 0x02,
  HIT_TRIPLE: 0x03,
  WAVE: 0x11,
  LIGHT_RING: 0x14,
  BLINK: 0x17,
});

/** LED ring cell (0-59) for each dart number; index 0 is bull. */
export const LED_POSITIONS: readonly number[] = Object.freeze([
  0, 28, 49, 55, 34, 22, 40, 1, 7, 16, 43, 10, 19, 37, 13, 46, 4, 52, 31, 58, 25,
]);

/** Dart numbers in clockwise LED ring order (lowest LED position first). */
export const CLOCKWISE_ORDER: readonly DartNumber[] = Object.freeze([
  7, 16, 8, 11, 14, 9, 12, 5, 20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19,
]);

/** POS byte value meaning "the full ring". */
export const FULL_RING = 0x10;

function byte(value: number, name: string): number {
  if (!Number.isInteger(value) || value < 0 || value > 255) {
    throw new RangeError(`${name} must be an integer 0-255, got ${value}`);
  }
  return value;
}

function setColor(cmd: Uint8Array, offset: number, color: RGB): void {
  cmd[offset] = byte(color.r, "r");
  cmd[offset + 1] = byte(color.g, "g");
  cmd[offset + 2] = byte(color.b, "b");
}

function assertDartNumber(n: number): asserts n is DartNumber {
  if (!Number.isInteger(n) || n < 1 || n > 20) {
    throw new RangeError(`dart number must be 1-20, got ${n}`);
  }
}

export interface HitCommandOptions {
  /** Number of fade-out blinks; 1, 2 or 3. Defaults to 1. */
  blinks?: 1 | 2 | 3;
  /** Duration in board frames. Defaults to 0x14 (20). */
  duration?: number;
}

/** Blink one dart number's segment on the ring. */
export function buildHitCommand(dartNumber: number, color: RGB, options: HitCommandOptions = {}): Uint8Array {
  assertDartNumber(dartNumber);
  const { blinks = 1, duration = 0x14 } = options;
  if (blinks !== 1 && blinks !== 2 && blinks !== 3) {
    throw new RangeError(`blinks must be 1, 2 or 3, got ${blinks}`);
  }
  const cmd = new Uint8Array(16);
  cmd[0] = blinks;
  setColor(cmd, 1, color);
  cmd[10] = LED_POSITIONS[dartNumber]!;
  cmd[12] = byte(duration, "duration");
  return cmd;
}

/** Flash the whole ring, then auto-off after `duration` frames (default 0x1E). */
export function buildBlinkCommand(color: RGB, duration = 0x1e): Uint8Array {
  const cmd = new Uint8Array(16);
  cmd[0] = CommandType.BLINK;
  setColor(cmd, 1, color);
  cmd[12] = byte(duration, "duration");
  cmd[15] = 0x01;
  return cmd;
}

/** Two-color wave around the ring. `speed` defaults to 0x05. */
export function buildWaveCommand(colorUp: RGB, colorDown: RGB, speed = 0x05): Uint8Array {
  const cmd = new Uint8Array(16);
  cmd[0] = CommandType.WAVE;
  setColor(cmd, 1, colorUp);
  setColor(cmd, 4, colorDown);
  cmd[10] = FULL_RING;
  cmd[12] = byte(speed, "speed");
  return cmd;
}

/** Light the entire ring in one color until another command is sent. */
export function buildLightRingCommand(color: RGB): Uint8Array {
  const cmd = new Uint8Array(16);
  cmd[0] = CommandType.LIGHT_RING;
  setColor(cmd, 1, color);
  cmd[12] = 0x14;
  cmd[15] = 0x01;
  return cmd;
}

/**
 * Persistently light the given dart numbers (1-20) with a board palette color.
 * Bull is not addressable in this format.
 */
export function buildPersistentNumbersCommand(
  dartNumbers: Iterable<number>,
  paletteColor: number = PaletteColor.ORANGE,
): Uint8Array {
  byte(paletteColor, "paletteColor");
  const cmd = new Uint8Array(20);
  for (const n of dartNumbers) {
    assertDartNumber(n);
    cmd[n - 1] = paletteColor;
  }
  return cmd;
}

/** Turn every LED off. */
export function buildClearCommand(): Uint8Array {
  return new Uint8Array(20);
}

/** Linear interpolation between two colors, `t` in [0, 1]. */
export function lerpColor(from: RGB, to: RGB, t: number): RGB {
  const k = Math.min(1, Math.max(0, t));
  return {
    r: Math.round(from.r + (to.r - from.r) * k),
    g: Math.round(from.g + (to.g - from.g) * k),
    b: Math.round(from.b + (to.b - from.b) * k),
  };
}
