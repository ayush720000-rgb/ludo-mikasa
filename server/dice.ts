import { randomInt } from 'node:crypto';

/**
 * Roll a standard six-sided die using Node's cryptographically secure,
 * unbiased integer generator. Every call is independent: prior rolls,
 * player identity, token positions and match state do not alter the odds.
 *
 * randomInt uses an exclusive upper bound, so [1, 7) produces 1..6 with
 * exactly equal probability and avoids modulo bias.
 */
export function rollFairDie(): number {
  return randomInt(1, 7);
}

/**
 * Optional "shuffled bag" dice for one match. The six faces are shuffled into a bag and
 * dealt out; when the bag is empty it is reshuffled. Each face appears exactly once per
 * cycle of six rolls, so streaks of the same number are rare. The same bag serves every
 * player in the match, and nothing depends on who is rolling.
 */
export class ShuffledBagDie {
  private bag: number[] = [];

  next(): number {
    if (this.bag.length === 0) {
      this.bag = [1, 2, 3, 4, 5, 6];
      // Fisher-Yates with the secure generator
      for (let i = this.bag.length - 1; i > 0; i--) {
        const j = randomInt(0, i + 1);
        [this.bag[i], this.bag[j]] = [this.bag[j], this.bag[i]];
      }
    }
    return this.bag.pop()!;
  }
}
