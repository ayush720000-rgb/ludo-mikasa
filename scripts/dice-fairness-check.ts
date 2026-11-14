import { rollFairDie } from '../server/dice';

// Statistical smoke test for the production die function. This does not prove
// randomness mathematically, but it catches gross distribution regressions.
const ROLLS = 600_000;
const counts = Array<number>(6).fill(0);
for (let i = 0; i < ROLLS; i += 1) {
  const value = rollFairDie();
  if (!Number.isInteger(value) || value < 1 || value > 6) {
    throw new Error(`Invalid die value: ${value}`);
  }
  counts[value - 1] += 1;
}

const expected = ROLLS / 6;
const chiSquare = counts.reduce((sum, count) => sum + ((count - expected) ** 2) / expected, 0);
// df=5; 24.1 is a deliberately conservative upper bound (p is very small).
if (chiSquare > 24.1) {
  throw new Error(`Dice distribution outside smoke-test threshold. χ²=${chiSquare.toFixed(2)}; counts=${counts.join(',')}`);
}

console.log(`PASS: ${ROLLS.toLocaleString()} rolls; counts=${counts.join(', ')}; χ²=${chiSquare.toFixed(2)}`);
