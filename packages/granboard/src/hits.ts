import { SEGMENT_CODES, describeSegment, type Segment } from "./segments.js";

/** Anything that holds the bytes of a BLE notification. */
export type BytesLike = Uint8Array | ArrayBuffer | DataView | ArrayLike<number>;

/**
 * A decoded dart hit, miss or button press, as returned by {@link decodeHit}
 * and passed to {@link GranboardClient.onHit} listeners.
 *
 * ```ts
 * { id: "TRP_20", ring: "triple", number: 20, multiplier: 3, score: 60, code: "51-46-52-64", raw }
 * ```
 */
export interface Hit extends Segment {
  /** Dash-joined decimal byte string, e.g. `"51-46-52-64"`. */
  code: string;
  /** The raw notification bytes. */
  raw: Uint8Array;
}

/** Copy any byte container into a Uint8Array, respecting DataView offsets. */
export function toBytes(data: BytesLike): Uint8Array {
  if (data instanceof Uint8Array) return data;
  if (data instanceof ArrayBuffer) return new Uint8Array(data);
  if (ArrayBuffer.isView(data)) return new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
  return Uint8Array.from(data);
}

/** Notification bytes → lookup code (`[51, 46, 52, 64]` → `"51-46-52-64"`). */
export function toCode(data: BytesLike): string {
  return Array.from(toBytes(data)).join("-");
}

/**
 * Decode a hit notification. Returns `null` for codes not in the known
 * mapping (use `toCode` to log them and please report them upstream).
 */
export function decodeHit(data: BytesLike): Hit | null {
  const raw = toBytes(data);
  const code = toCode(raw);
  const id = SEGMENT_CODES[code];
  if (!id) return null;
  return { ...describeSegment(id), code, raw: Uint8Array.from(raw) };
}
