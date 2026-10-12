# RUNBOOK.md · read what broke, test set, scorer check, test every change, watch it live

Applies Advanced evals to Bohni. The first round takes a few hours. After that: a weekly read, and the test set before every change ships. Prompts for Claude Code are in `CC_PROMPTS.md`.

## What exists today in the build (12 Oct)

| Piece | State |
|---|---|
| `aiCalls` table: purpose, model, input, output, ms, tokens, error | Exists, logs every call |
| `drafts` table: draft plus what she edited it to | Exists |
| `steps` table: step name only | Exists |
| Code checks on every draft (`checkDraft`, `unsourcedFacts`) | Exist, shown to her as warnings |
| Unit tests (match, links, invites, founders) | Exist; no AI-output tests |
| A rubric score per output | **Missing** |
| Logging of each step inside a draft (attempt 1 problems, retry, final) | **Missing**; today `aiCalls` has the model call only |
| A test set and runner | **Missing** (this folder adds the cases) |

## The order of work (7 items; tick as you go)

- [ ] 1. Make 50 outputs and read them (below)
- [ ] 2. Group the notes and count; know the biggest group
- [ ] 3. Test set of 20+ cases in two lists (start from `tests.csv`, 33 cases)
- [ ] 4. Every case runs 3 times and passes only if all 3 pass (AI cases; code cases run once)
- [ ] 5. Score 30 outputs yourself and learn how many bad ones the scorer catches
- [ ] 6. Run the set before every prompt or model change
- [ ] 7. Every bad live output becomes a case, every week

## 1. Read what broke

There are no real users yet, so use your own test runs (the handbook allows it).

**The seed run (50 outputs):** 7 made-up founders in `fixtures.json` against investors sampled from your private seed (mix of rich, thin and no-thesis records, plus the made-up ones), until 50 emails exist. Run it on the **dev** deployment only. Outputs stay in Convex dev and in a gitignored `evals/runs/` folder; never in the public repo, because they hold real investors' facts. Prompt: `CC_PROMPTS.md` 3. Estimated cost about $0.9 with scoring (see Cost).

**Read them yourself:** one note per output, the **first** thing that went wrong, in one specific line. "Wrong hook" is too loose; "Said Quillwork is a climate company; record has no space" is right. If nothing is wrong, write "ok". Use the review page (`CC_PROMPTS.md` 2): one output at a time, a box for the note, your own level per lever, keys for next and previous, and a column showing where your level and the model's differ.

**Group and count:** paste your notes into Claude or ChatGPT:

```
Here are my notes, one per AI-written investor email. Group them into five to eight
groups of the same kind of failure, plus an "other" group for notes that fit nowhere.
Give each group a short name, the count, and the note numbers in it. Don't invent
notes. Biggest group first.
```

Stop reading when nothing new turns up. Then for each group:

| Kind of group | What to do |
|---|---|
| Plain bug (missing instruction, broken lookup, wrong format) | Fix in the prompt or code today; one test case keeps it fixed |
| A miss on lever A, B or C | Add an edge case to that level in `RUBRIC.md`: "L3 should also consider this" |
| A failure no lever covers | Add a lever with its own worst and best |

Start with the biggest group. A real example from the handbook: Nurture Boss counted its failures; three groups made up over 60% of them; dates alone failed 66% of the time; after working on dates, date handling went from 33% to 95%.

## 2. The test set (`tests.csv`, 33 cases)

| Kind | Count | Runs | Scored by |
|---|---|---|---|
| Draft (AI, rubric-scored) | 13 | 3 | code checks first, then the judge per lever |
| Hard input and break-it (AI) | 4 | 3 | judge plus plain checks |
| Code (no AI) | 16 | 1 | normal tests |

- Two lists: **Fix next** (12 cases) and **Must keep working** (21 cases). The starting split is a guess; the first full run settles it. Any "Must keep" that fails on the first run moves to Fix next.
- These are starting cases from known risks in your docs and code. **Replace or add after step 1:** two or three cases from each failure group you counted, biggest first.
- Made-up data only (`fixtures.json`). The file is safe to commit.
- 6 cases already have a repo test (E22, E23, E24, E29, E30, E33, via `founders.test.ts`, `match.test.ts` and `invites.test.ts`) and 2 have part of one (E19, E28); the rest need a test written. The column `Repo test today` is my reading of the test names; your agent confirms it.
- A case is "too loose" if you and a friend could disagree on whether it passed; rewrite it until you'd both mark it the same.
- If an answer does things (saves a draft, uses a run), also check the database: E27 passes only if exactly one set of drafts exists.
- Fake the risky steps: tests never email anyone (the app never sends anyway) and never burn the production cap.

**Run it more than once.** The same input can give a different answer each time. At 90% right per run, five runs in a row are all right only 59% of the time; ten messages at 90% are all right only 35% of the time. So every AI case runs 3 times and passes only if all 3 pass. For each Fix-next case also write two more versions (other words, another order, a typo); if one passes and another fails, the failing one is a new case.

## 3. Check your scorer

1. Take 30 to 50 logged outputs, good and bad mixed (the seed run).
2. Score them yourself on the review page **without** looking at the model's level.
3. Count how often the model gives the same level as you.
4. Look hardest at the outputs you scored worst: how many did the scorer also score worst?

Why: a scorer can agree with you on 42 of 50 and still catch only 2 of your 8 bad ones. When it misses: show it everything (founder brief, investor record, the email, the checks), one lever per call, make it quote the line it scored, let it say "can't tell", put the miss into the rubric, then try another model. Re-check whenever the rubric or the scorer model changes, and save which model scored each output.

Pass bar I suggest **[guess, review]**: it catches at least 7 of 10 of your worst-level outputs and agrees with you on at least 80% of all.

## 4. Test every change

Before any prompt, rubric, model or tool change goes live: run the whole set, 3 runs per AI case. Ship only if nothing in Must keep broke.

- Compare case by case. Two versions with the same score can have swapped cases. List every case that got worse.
- Small sets move by luck. With 30 cases a 70% score could really be anywhere from 54% to 86%. With 50 cases, 57% to 83%. A change of a few points can be noise; look at which cases changed.
- Write the case before the fix: (1) add the failing input to Fix next, (2) watch it fail (if it passes, the case isn't testing what you think), (3) change one thing, (4) run until it passes 3 runs in a row, (5) run the whole set.
- Note time and cost of each answer next to the score. A fix that doubles the cost is a decision to make on purpose.
- If a score looks wrong, read the outputs. The handbook's example: a public benchmark scored a model 42% until the grading was fixed (an answer of 96.12 was marked wrong against a key of 96.124991); after fixing the grading, the same model scored 95%.

### Cost (estimates; recompute on the first real run)

Prices from platform.claude.com checked 5 Oct 2026: Haiku 4.5 $1 in / $5 out per million tokens; Sonnet 5.5 $2 / $10. Assumed 2,300 tokens in and 450 out per draft (the draft prompt is about 5,300 characters, with a 30% larger newer tokenizer), 2,000 in and 150 out per lever score.

| Run | Estimate |
|---|---|
| One Sonnet draft | about $0.009 |
| One lever score (Haiku) | about $0.003 |
| Seed run: 50 drafts plus 150 scores | about $0.9 |
| Full set: 13 draft cases × 3 runs, 3 lever scores each, plus the hard cases | about $0.65 |

Your dev key is limited to $5, which is about five full runs plus one seed run. Raise the dev limit to $10, or make a third key for evals with its own $10 hard limit. Evals run against the **dev** deployment and never count toward the live 40-calls-an-hour cap.

## 5. Watch it live

- Every day: read the lowest-scoring live outputs. Watch for founders who regenerate, rewrite the whole email, or leave the draft screen without tapping Open in Gmail. `drafts.editedBody` against `body` is your best live signal: a big edit means the draft missed.
- Every week: read 20 live outputs even when scores look fine.
- Every bad one becomes a case: (1) copy the input into Fix next and write what good looks like, (2) remove what is personal (names, emails, company, phone, website), (3) if a lookup was involved, save what it returned and replay it in the test.
- Privacy: live drafts hold founders' details and investors' facts. Keep them in Convex and a gitignored folder; anonymise before a case goes anywhere public.

## 6. When a sheet and a page aren't enough

Langfuse (open source, self-host), Braintrust (hosted, runs side by side), promptfoo (cases in a file that runs on every code change), Arize Phoenix (each step on a timeline). Not needed this week; the sheet, review page and runner are enough.

## Done when

- [ ] I read 50 real outputs and wrote one note on each
- [ ] My notes are grouped and counted, and I know my biggest group
- [ ] I have 20 or more cases in two lists
- [ ] Every case runs three times and passes only if all three pass
- [ ] I scored 30 outputs myself and know how many bad ones my scorer catches
- [ ] Every prompt or model change runs the set first
- [ ] Bad live outputs go into the set every week
