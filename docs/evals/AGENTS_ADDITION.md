## 5. Evals

Rubric: docs/evals/RUBRIC.md (the first email, levers A hook, B her story, C ready to send). Cases: docs/evals/tests.csv with made-up data in docs/evals/fixtures.json. How we use them: docs/evals/RUNBOOK.md.

- Before changing a prompt in convex/lib/prompt.ts, a model name, a check in convex/lib/checks.ts or the rubric: run `npm run evals`, make the change, run it again, and show me every case that got better and every case that got worse. Never merge if something in "Must keep working" got worse.
- A fix starts with a failing case. Add the case to tests.csv under "Fix next", watch it fail, change one thing, run it until it passes 3 runs in a row, then run the whole set.
- AI cases run 3 times and pass only if all 3 pass. Code cases run once.
- Evals run against the dev deployment only. They never use the prod key, never send anything and never count toward the live 40-calls-an-hour cap.
- Outputs, scores, notes and run results live in Convex dev and in evals/runs/, which is gitignored. They hold real investors' facts and founders' details: never commit them, and remove every personal detail before a bad output becomes a case.
- Fix the rubric, not the symptom: when the scorer or an output misses, add an edge case to the right level ("L3 should also consider this").
- If an output reads wrong, read it before trusting the score. Tell me when the rubric, the scorer model or a threshold changes.
