/** Which part of the board a notification came from. */
export type SegmentRing =
  | "inner"
  | "outer"
  | "triple"
  | "double"
  | "bull"
  | "double_bull"
  | "miss"
  | "button";

/** Canonical segment identifier, e.g. `"TRP_20"`, `"DBL_BULL"`, `"MISS"`. */
export type SegmentId =
  | `INNER_${DartNumber}`
  | `OUTER_${DartNumber}`
  | `TRP_${DartNumber}`
  | `DBL_${DartNumber}`
  | "BULL"
  | "DBL_BULL"
  | "MISS"
  | "RESET_BUTTON";

export type DartNumber =
  | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10
  | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20;

export interface Segment {
  id: SegmentId;
  ring: SegmentRing;
  /** Dart number 1-20, 25 for bull/double bull, `null` for miss and the button. */
  number: DartNumber | 25 | null;
  /** 1, 2 or 3 for scoring segments (double bull is 2), 0 for miss and the button. */
  multiplier: 0 | 1 | 2 | 3;
  /** Points scored: `number * multiplier`, 0 for miss and the button. */
  score: number;
}

/**
 * Raw notification code → segment id. The code is the notification bytes
 * joined with `-` (they are ASCII, e.g. `"51-46-52-64"` is `"3.4@"`).
 */
export const SEGMENT_CODES: Readonly<Record<string, SegmentId>> = Object.freeze({
  "50-46-51-64": "INNER_1", "50-46-52-64": "TRP_1", "50-46-53-64": "OUTER_1", "50-46-54-64": "DBL_1",
  "57-46-49-64": "INNER_2", "57-46-48-64": "TRP_2", "57-46-50-64": "OUTER_2", "56-46-50-64": "DBL_2",
  "55-46-49-64": "INNER_3", "55-46-48-64": "TRP_3", "55-46-50-64": "OUTER_3", "56-46-52-64": "DBL_3",
  "48-46-49-64": "INNER_4", "48-46-51-64": "TRP_4", "48-46-53-64": "OUTER_4", "48-46-54-64": "DBL_4",
  "53-46-49-64": "INNER_5", "53-46-50-64": "TRP_5", "53-46-52-64": "OUTER_5", "52-46-54-64": "DBL_5",
  "49-46-48-64": "INNER_6", "49-46-49-64": "TRP_6", "49-46-51-64": "OUTER_6", "52-46-52-64": "DBL_6",
  "49-49-46-49-64": "INNER_7", "49-49-46-50-64": "TRP_7", "49-49-46-52-64": "OUTER_7", "56-46-54-64": "DBL_7",
  "54-46-50-64": "INNER_8", "54-46-52-64": "TRP_8", "54-46-53-64": "OUTER_8", "54-46-54-64": "DBL_8",
  "57-46-51-64": "INNER_9", "57-46-52-64": "TRP_9", "57-46-53-64": "OUTER_9", "57-46-54-64": "DBL_9",
  "50-46-48-64": "INNER_10", "50-46-49-64": "TRP_10", "50-46-50-64": "OUTER_10", "52-46-51-64": "DBL_10",
  "55-46-51-64": "INNER_11", "55-46-52-64": "TRP_11", "55-46-53-64": "OUTER_11", "55-46-54-64": "DBL_11",
  "53-46-48-64": "INNER_12", "53-46-51-64": "TRP_12", "53-46-53-64": "OUTER_12", "53-46-54-64": "DBL_12",
  "48-46-48-64": "INNER_13", "48-46-50-64": "TRP_13", "48-46-52-64": "OUTER_13", "52-46-53-64": "DBL_13",
  "49-48-46-51-64": "INNER_14", "49-48-46-52-64": "TRP_14", "49-48-46-53-64": "OUTER_14", "49-48-46-54-64": "DBL_14",
  "51-46-48-64": "INNER_15", "51-46-49-64": "TRP_15", "51-46-50-64": "OUTER_15", "52-46-50-64": "DBL_15",
  "49-49-46-48-64": "INNER_16", "49-49-46-51-64": "TRP_16", "49-49-46-53-64": "OUTER_16", "49-49-46-54-64": "DBL_16",
  "49-48-46-49-64": "INNER_17", "49-48-46-48-64": "TRP_17", "49-48-46-50-64": "OUTER_17", "56-46-51-64": "DBL_17",
  "49-46-50-64": "INNER_18", "49-46-52-64": "TRP_18", "49-46-53-64": "OUTER_18", "49-46-54-64": "DBL_18",
  "54-46-49-64": "INNER_19", "54-46-48-64": "TRP_19", "54-46-51-64": "OUTER_19", "56-46-53-64": "DBL_19",
  "51-46-51-64": "INNER_20", "51-46-52-64": "TRP_20", "51-46-53-64": "OUTER_20", "51-46-54-64": "DBL_20",
  "56-46-48-64": "BULL", "52-46-48-64": "DBL_BULL",
  "66-84-78-64": "RESET_BUTTON", "79-85-84-64": "MISS",
});

const PREFIX_RING: Record<string, { ring: SegmentRing; multiplier: 1 | 2 | 3 }> = {
  INNER: { ring: "inner", multiplier: 1 },
  OUTER: { ring: "outer", multiplier: 1 },
  TRP: { ring: "triple", multiplier: 3 },
  DBL: { ring: "double", multiplier: 2 },
};

/** Describe a segment id: ring, number, multiplier and score. */
export function describeSegment(id: SegmentId): Segment {
  switch (id) {
    case "BULL":
      return { id, ring: "bull", number: 25, multiplier: 1, score: 25 };
    case "DBL_BULL":
      return { id, ring: "double_bull", number: 25, multiplier: 2, score: 50 };
    case "MISS":
      return { id, ring: "miss", number: null, multiplier: 0, score: 0 };
    case "RESET_BUTTON":
      return { id, ring: "button", number: null, multiplier: 0, score: 0 };
  }
  const [prefix, n] = id.split("_") as [string, string];
  const info = PREFIX_RING[prefix];
  const number = Number(n) as DartNumber;
  if (!info || !(number >= 1 && number <= 20)) {
    throw new Error(`Unknown segment id: ${id}`);
  }
  return { id, ring: info.ring, number, multiplier: info.multiplier, score: number * info.multiplier };
}
