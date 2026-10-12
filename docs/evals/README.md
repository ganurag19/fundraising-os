# docs/evals · how we measure the first email

Public-safe: made-up founders and investors only. Real outputs, scores and notes go in `evals/runs/` (gitignored) and Convex dev, never here.

| File | What it is | Status |
|---|---|---|
| `RUBRIC.md` / `rubric.csv` | The first email scored on three levers (hook, her story, ready to send), levels L1–L5 | Draft, **[guess, review]**: rewrite the levels in your words |
| `tests.csv` | 33 starting cases in two lists (12 Fix next, 21 Must keep working) | Draft; replace or add after you read 50 outputs |
| `fixtures.json` | 7 made-up founders, 9 made-up investors | Done |
| `evals-workbook.xlsx` | Rubric, test set, 50-row notes sheet, groups, scorer check with formulas, change log | Done; for you to fill |
| `RUNBOOK.md` | Read what broke, test set, scorer check, test every change, watch it live, cost | Done |
| `CC_PROMPTS.md` | Prompts 0–6 for Claude Code, plus the judge prompt | Done; nothing built yet |
| `AGENTS_ADDITION.md` | Section 5 for `AGENTS.md` | Not yet added; prompt 0 adds it |

Order: 0 (AGENTS) → 1 (score and log) → 2 (review page) → 3 (seed run, 50 outputs) → read and note → group and count → 4 (runner) → check your scorer → run the set before every change.

Source: GrowthX Build Sprint chapters Eval basics (intro, defining, improving) and Advanced evals.
