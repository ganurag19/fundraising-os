# CC_PROMPTS.md · prompts for Claude Code, in order

Paste into Claude Code in the Bohni repo, one at a time. Each ends with "plan first": your `AGENTS.md` already says to say it back and wait for your yes. The handbook's own prompts say "Codex"; these are the same prompts rewritten for your repo (tables, models and rules that exist).

These files live at `docs/evals/` in the repo (public, made-up data only). Read `RUBRIC.md` first.

## 0. Put the rules in AGENTS.md (2 minutes)

```
Read docs/evals/AGENTS_ADDITION.md. Add it to AGENTS.md as section 5 without changing
anything else in the file. Keep AGENTS.md under 200 lines. Show me the diff and wait.
```

## 1. Score and log every output (Eval basics: track)

```
I'm setting up observability for the first email Bohni writes to one investor.
Read docs/evals/RUBRIC.md: that is the rubric, three levers A, B and C, levels L1 to L5.

Log every output in Convex: the input, the output and its score against the rubric.
- Keep aiCalls as it is. Add a table "scores": aiCallId, draftId (if any), lever
  (A, B or C), level (1-5), quote (the line it scored), cantTell (boolean), reason,
  scorerModel, scoredAt. One row per lever per output.
- Also log the steps inside writeOne in convex/write.ts: attempt number, the problems
  checkDraft and unsourcedFacts returned, whether it retried, and the final warnings.
  Add them to the aiCalls row or a "steps" row without any personal data in the step
  name.
- Scoring runs in a Convex action, never in the interface, with Claude Haiku 4.5, one
  lever per call. Each call gets: the founder brief, the investor record used, the
  email, the check results, and that lever's five level definitions. It must return
  the level, a quote of the line it scored, and "cantTell: true" when the output does
  not show enough. Use structured output like the draft call.
- Use the code checks as the first pass: checkDraft already covers length, banned
  phrases, missing one-liner and founder line; unsourcedFacts covers invented facts.
  Where a code check already fixes a level (for example subject 8+ words is at most
  L2 on lever C), set the level in code and skip the model call for that part.
- Scoring must not run for live founders unless I turn it on. Add a switch in Convex
  env (EVAL_SCORING=on) and keep it off in prod. It never counts toward the 40 AI
  calls an hour for founders.
- Save which model scored each output.
Plan first: say back what you will build, what it costs per scored email, and how I
check it on my phone or in the Convex dashboard. Wait for my yes. Don't write code yet.
```

## 2. The review page (Advanced evals: make the reading quick)

```
Build me a local HTML page to review Bohni's outputs. Local only: it runs on my laptop
with `npm run evals:review`, reads from the dev Convex deployment, and is never deployed
or committed with data.
Pull the last 100 outputs (the input, the output, the rubric scores, the steps, the
code-check results).
Show one output at a time, with a box for a one-line note (the FIRST thing that went
wrong), a box for my own level (1-5) on each lever A, B and C, and keyboard keys for
next and previous.
Show where my level and the model's level differ, and highlight the ones where the
model said "can't tell".
Save my notes and levels to a CSV in evals/runs/ (gitignored) with each output's ID.
Also let me tag an output "bad live output" so it can become a test case.
Plan first, then wait for my yes.
```

## 3. The seed run (50 outputs to read)

```
I have no users yet, so make 50 real outputs for me to read. Write a script
`npm run evals:seed` that runs against the DEV deployment only (refuse to run if the
deployment is prod).
Use the 7 made-up founders in docs/evals/fixtures.json and investors from seed/
(my private file, never committed): a mix of rich records, thin records, records with
no thesis and records with no recent deals, plus the 9 made-up investors in the fixtures
file. Write one first email for each pair using the same draft function as the app, until
there are 50 outputs, and score each one with the scorer from prompt 1.
Stop and tell me the cost so far if it goes past $1.50. Save everything under evals/runs/
(gitignored) and in Convex dev. Show me the total cost at the end.
Plan first, then wait for my yes.
```

## 4. The test runner (Advanced evals: set up the runner)

```
Set up a test runner for Bohni.
My test cases are in docs/evals/tests.csv. Each row has an ID, a kind (Draft, Hard input
or Code), a founder and an investor from docs/evals/fixtures.json, what good looks
like (the level per lever, or a plain expected result), and a list (Fix next or Must keep
working).
- Draft and Hard input cases: run 3 times and score each run with the rubric scorer. A
  run passes when every lever scores at or above the level in "Good looks like". A case
  passes only if all 3 runs pass.
- Code cases: run once as normal vitest tests, not through the AI. Tell me which already
  have a test (the "Repo test today" column is my guess) and write the missing ones.
- Never send anything and never touch prod. Run only against the dev deployment. Replace
  the Gmail step with a fake that only records what would have happened.
- Save each run's results with the date, the git commit and a copy of the prompt text
  it used (convex/lib/prompt.ts) under evals/runs/ (gitignored).
- Show the results on a local HTML dashboard: case, last result, this result, time and
  cost. Mark every case that got worse, and show the total cost of the run.
- Add `npm run evals` (all), `npm run evals -- --list "Must keep working"` and
  `npm run evals -- --case E07`.
- The 40-calls-an-hour limit and the 3-runs-a-day limit must not apply to the runner
  (it uses a separate path), but the provider key limit still does.
Plan first, then wait for my yes.
```

## 5. After each change (every time, before a push)

```
I'm about to change [the prompt / the rubric / the model / a check]. Before I do: run
`npm run evals` on the current version and keep the result. Then make the change, run it
again, and show me every case that got better, every case that got worse, and the cost
and time of each version. Don't merge if anything in Must keep working got worse. Write
the failing case first if this is a fix.
```

## 6. A bad live output becomes a case

```
Founder output [paste the draft ID] is bad because: [one line]. Make it a test case:
copy the input, remove every personal detail (names, emails, company, website, phone),
replace the investor with a made-up one that has the same shape of record, write what
good looks like as levels per lever, add it to docs/evals/tests.csv under Fix next, and
run only that case to show me it fails today.
```

## 7. The daily note (from Users & distribution; used in sell week)

See `sell/SELL_PLAN.md`; the prompt there sorts what people did into blocker, friction or wish.

## Judge prompt (used inside prompt 1; the handbook gives none, so this is my draft)

```
You score ONE lever of one investor email. Lever: {lever name}.
Levels:
L1 {text} / L2 {text} / L3 {text} / L4 {text} / L5 {text}
You get: FOUNDER (her profile), INVESTOR (the only facts we hold), the EMAIL, and the
CHECKS (what our code already found).
Return: level (1-5); quote: the exact words of the email you scored, copied exactly;
reason: one sentence; cantTell: true if the email does not show enough to decide.
Only judge this lever. Do not reward length or polish. A statement about the investor
that is not in INVESTOR is always L1 on lever A. If you are unsure between two levels
choose the lower one.
```
