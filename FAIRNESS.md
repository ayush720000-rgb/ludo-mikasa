# Mikasa Ludo — dice fairness

## Design decision

Mikasa Ludo uses an independent, uniform six-sided die generated on the server
with Node.js `crypto.randomInt(1, 7)`. Each face has a 1-in-6 chance on every
roll. A player's previous rolls, losing streak, winning streak, token positions,
colour, account, or match situation do not change the next roll's odds.

We deliberately did **not** add a hidden “pity” or comeback system. Raising the
chance of 4/5/6 after low rolls (or lowering it after high rolls) would make the
dice biased and could secretly decide important turns. It can also create the
opposite frustration when players notice the system changing outcomes.

## Why this still feels fair

Independent random rolls naturally produce streaks. A run of low rolls does not
make a high roll “due”; the next roll remains 1/6 for each face. Short matches
can also have visibly uneven totals even when the generator is fair. The
production roll is generated only on the server, so clients cannot choose or
rewrite their result.

## Rules and move fairness

- The server validates whose turn it is before accepting a roll.
- The server calculates legal moves and validates the selected token move.
- Exact finishing, safe squares, captures, bonus rolls and the three-sixes
  penalty are handled by the server-side game manager/rules.
- Bots use the same die generator as human players; they do not receive better
  or worse dice odds.

## Verification

Run `npm run test:fairness` to sample 600,000 production dice rolls and check
that all six faces are within a conservative chi-square threshold. This is a
regression smoke test, not a formal RNG certification.
