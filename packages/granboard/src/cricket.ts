import type { DartNumber } from "./segments.js";

/** The numbers played in Cricket. Bull (25) counts in the game but can't be lit by the board. */
export const CRICKET_NUMBERS = Object.freeze([15, 16, 17, 18, 19, 20, 25] as const);

/** One of the Cricket numbers: 15-20 or 25 (bull). */
export type CricketNumber = (typeof CRICKET_NUMBERS)[number];

/** One player's marks per Cricket number (0-3; anything above 3 counts as closed). Missing numbers count as 0. */
export type CricketMarks = Partial<Record<CricketNumber, number>>;

/**
 * The Cricket numbers still in play: not yet closed (3 marks) by every
 * player. Bull is left out because the board can't light it, so the result
 * can go straight to `board.lightNumbers()`.
 *
 * ```ts
 * cricketOpenNumbers([{ 20: 3, 19: 1 }, { 20: 3 }]); // [15, 16, 17, 18, 19]
 * ```
 */
export function cricketOpenNumbers(players: readonly CricketMarks[]): DartNumber[] {
  return CRICKET_NUMBERS.filter(
    (n): n is Exclude<CricketNumber, 25> =>
      n !== 25 && (players.length === 0 || !players.every((marks) => (marks[n] ?? 0) >= 3)),
  );
}
