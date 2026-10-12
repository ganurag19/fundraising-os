# SPRINT_STATUS.md · Bohni (AI Fundraising OS) · Tuesday 13 Oct 2026

Read from your real repo (`~/Developer/fundraising-os`, last commit `1852c74` on 12 Oct) and the planning folder. The repo is the source of truth; the older planning files are not updated yet (see "Stale").

## What it is now

**Bohni**: a first-time Indian founder enters her startup (7-step sign-up, her website is read once to draft her one-liner), sees 3 top-pick investors with gold cards ("why they fit", "watch out", sources), and gets a hook-first email for each. She sends it herself through "Open in Gmail". Invite-only with a waitlist and server-checked codes. Dark v4 design. Stack: Vite, React, TypeScript, Convex, Claude (Sonnet 5.5 for the first 3 drafts, Haiku 4.5 for the rest). Public repo `github.com/ganurag19/fundraising-os`. Seed (private, gitignored): 611 records from three spreadsheets, 148 researched, 63 of 72 funds with a thesis.

## Milestones against `PLAN.md`

| # | "I can..." | State |
|---|---|---|
| Landing | v4 landing, invite-only | Works on phone (dev) |
| 1 | Enter a company, read 3 emails | **Works on phone (dev)** |
| 2 | See 20 ranked investors, retry after 15 s | List of 20 behind Google sign-in exists; the 15-second retry is not built |
| 3 | Edit the email, open in Gmail or copy | Open in Gmail (phones, several accounts) and copy work; editing the email and the 15-second retry are listed as leftovers in `PROGRESS.md`; the too-long-link fallback is not verified |
| 4 | Sector with no match → clear message | Code message exists ("We don't have investors for this sector and stage yet."); no test |
| 5–7 | "I sent it" → Pipeline; follow-ups at day 3 and day 7; "replied" stops them | Not built |
| 8 | A stranger finishes unaided; step log | Step log table exists; unaided run not done |
| Last | Close, reopen, data is there | Google sign-in exists; not checked end to end |
| **Go live** | Phone check logged out → prod deploy → first 10 founders | **Not done**: no prod deploy, no static hosting, no live key on prod, investors and codes not in prod |

## What is missing for Sell week and Evals

| Gap | Why it matters | Where handled |
|---|---|---|
| **No live link** | Every Sell task needs a stranger to open it | `sell/SELL_PLAN.md`, Tuesday |
| No visitor analytics | Graders cap "visitors" at L2 without read-only access | `sell/SELL_PLAN.md` prompts |
| Invite-only vs the chapter's "no waitlist between them and the thing" | A stranger can't finish unaided without a code | Print a public code in every post |
| No rubric score on any output | Can't tell if a prompt change helped | `docs/evals/` |
| Only 6 of 33 starting cases have a repo test (2 more partly) | Changes can break the draft silently | `docs/evals/tests.csv`, column "Repo test today" |
| Rule conflict (E07) | Her one-liner is used word for word, but "revolutionis…" and "disrupt" are banned in the same text, so a founder with those words gets a flag and a retry every time | Your decision, `docs/evals/RUBRIC.md` |
| Eval cost vs dev key | A full run is about $0.65; the $5 dev limit allows about five | Raise dev limit to $10 or add an eval key |
| Scoring and Submit chapters missing from what you added | I don't know the weights or the submission format | Please share them |

## Stale (not yet synced; I did not overwrite your agent's work)

Planning folder `AI-Fundraising-OS-India/` still describes the 5 Oct plan (name "AI Fundraising OS", light design, 20 cards without gold picks, no invite-only). The repo has moved on: name Bohni, dark v4, cheque-fit rule decided, ask bands, invite-only, 7-step sign-up, follow-ups at day 3 and 7. Of the 14 decisions in `REVIEW_BEFORE_BUILD.md`, the repo has answered investor emails (listed ones only, pattern-only hidden), sectors (AI, Climate, Deeptech), cheque fit, drafts (top 3 auto, "Write email" for the rest), identity (token, then Google) and follow-up timing. Still open: return trigger, the E07 conflict, the 3 interviews and the 30-minute test, Gmail on a phone (looks done), legal view.

## What I created

| Where | File | What |
|---|---|---|
| Repo `docs/evals/` | `README.md`, `RUBRIC.md`, `rubric.csv`, `tests.csv`, `fixtures.json`, `evals-workbook.xlsx`, `RUNBOOK.md`, `CC_PROMPTS.md`, `AGENTS_ADDITION.md` | Eval basics + Advanced evals applied to the first email |
| Planning folder `sell/` | `SELL_PLAN.md`, `USER_SESSIONS.md`, `DISTRIBUTION.md`, `BUILD_IN_PUBLIC.md`, `LAUNCH_VIDEO.md`, `sell-tracker.xlsx` | Users & distribution, Build in Public, Launch Video applied to Bohni |
| Planning folder | `SPRINT_STATUS.md` (this) | Status and gaps |

I did **not** change any code, `AGENTS.md`, `PLAN.md` or `PROGRESS.md` in the repo. The one uncommitted change there is a single line in `PLAN.md` from your agent.

## Only you can do

1. Go live (prompts in `START_CC.md` section E, prompt 9 in section F, and `sell/SELL_PLAN.md`).
2. Rewrite the rubric levels, the posts, the DM list and the video lines in your own voice.
3. Pick your 3 founders for Wednesday and your 10 named people.
4. Read 50 outputs and write one note on each; score 30 yourself.
5. Decide E07, the track, and the public code.
6. Share the Scoring and Submit chapters.
