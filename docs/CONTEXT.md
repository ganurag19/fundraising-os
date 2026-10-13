# docs/CONTEXT.md · what the Cowork sessions added, for Claude Code

Written 13 Oct 2026 by Claude (Cowork) for Anurag's Claude Code sessions. Read this, then the files it points to. Update the "Status log" at the bottom when you finish work, so the next session (Cowork or Code) is not guessing.

Source of truth for code and what is built: this repo, `PROGRESS.md`, `PLAN.md`, `AGENTS.md`, `DESIGN.md`. Where this file and the repo disagree, the repo wins; tell Anurag.

## Map of the docs

| Path | What | Status | Tracked in git? |
|---|---|---|---|
| `docs/evals/` | Rubric, 33 test cases, fixtures (made-up), workbook, runbook, CC prompts 0–6, AGENTS addition | Written; **nothing built from it yet** | yes (public-safe) |
| `docs/SPRINT_STATUS.md` | Where the product stands vs `PLAN.md` on 13 Oct, gaps for Sell and Evals | Snapshot, goes stale | yes |
| `docs/sell/` | Sell-week plan: `SELL_PLAN.md`, `USER_SESSIONS.md`, `DISTRIBUTION.md`, `BUILD_IN_PUBLIC.md`, `LAUNCH_VIDEO.md`, `sell-tracker.xlsx` | Written; Anurag rewrites the words | **no, gitignore** (personal plans, DM lists) |
| `docs/ads/` | Distribution and ads: `README.md`, `01-strategy/GO_TO_MARKET.md`, `meta/`, `google/`, `linkedin/`, `creative/`, `cc/CC_PROMPTS.md` (A1–A8), `ads-tracker.xlsx` | Written; **no ads built or run** | **no, gitignore** (budgets, unit economics) |

Not copied here on purpose: the Meta ads ebook (PDF), its transcript and the video-prompt skill. They are third-party material and the repo is public. They live in Anurag's planning folder `AI-Fundraising-OS-India/distribution-ads/00-source-docs/`.

## What happened in the last two rounds

**Round 1 (evals + sell).** Anurag added the Sell, Eval basics and Advanced evals chapters. Cowork read the repo (last commit `1852c74`), found: Bohni works on a phone in dev; 20 ranked investors behind Google sign-in; not built: "I sent it"/Pipeline, follow-ups (day 3, day 7), "replied" stops them, 15-second retry, edit email, unaided stranger run; **no prod deploy, no live link, no visitor analytics**. Then wrote the evals docs (rubric on three levers: hook, her story, ready to send; levels L1–L5; 33 cases in "Fix next" and "Must keep working"; every AI case runs 3 times and passes only if all pass; scorer check on 30 outputs) and the sell docs (watch 3 users, a 4-line post, 10 named DMs, build in public, a 60-second launch video).

**Round 2 (distribution + ads).** Anurag added a Meta-ads ebook, its course transcript and a Hinglish video-prompt skill. Cowork wrote the ads folder. Verdict: **no paid ads yet**. Gates red: G1 no live link, G2 no unaided stranger run, G3 no sign-up/source tracking, plus no price and no consent notice. Plan: organic and DMs now; Meta test later (cap ₹1,500, ₹500/day, no edits for 3 days); then Google Search; LinkedIn paid last. Optimise on Lead (invite request), not Traffic. Read Convex sign-ups by source before the ad platform.

## Open decisions (Anurag's; do not decide them)

1. E07 rule conflict: her own one-liner is used word for word, but "revolutionis…" and "disrupt" are banned in the same text, so a founder using those words gets a flag and retry every time.
2. Invite-code route for ads: A public code, B request form, C auto-issued single-use code.
3. Price model and target cost per Lead (needed before any Purchase event).
4. Domain `bohni.ai` (to buy), ad accounts, GSTIN.
5. Sprint track (Virality) and the Scoring/Submit chapters (not seen).
6. Whether showing real investors in public video is allowed (DPDP; counsel).

## Rules that apply to anything you build from these docs

- No real investor or founder data in tests, logs, fixtures, commits or docs. Made-up data only (`docs/evals/fixtures.json`).
- No secrets in the repo or in chat. Anurag types keys into Convex env vars himself; you tell him the variable names.
- Never deploy to production, run a paid ad, or enter payment details. Anurag decides and publishes.
- Nothing is ever emailed for a founder. She sends from her own Gmail.
- No income, funding or outcome claims in copy; no price in copy until decided.
- One batch at a time: do one prompt, stop, report what changed and what to check on a phone.
- Repo is public: keep `docs/sell/` and `docs/ads/` out of git.

## Suggested build order (CC should propose, Anurag approves)

1. Go live: prod deploy, investors and codes in prod, phone check logged out (`START_CC.md` section E; the repo has no static hosting config yet).
2. Evals prompt 0 (add section 5 to `AGENTS.md`), then 1 (score and log), 2 (review page), 3 (seed run of 50).
3. Ads prompts A2, A3, A6 (attribution, events, consent), then A1 (landing), A4 (server events), A7, A8.
4. Leftover product work from `PROGRESS.md` (Pipeline, follow-ups, edit email, 15-second retry).

Anurag may reorder.

## Status log (append, newest last)

- 2026-10-13 · Cowork · Wrote docs above. Changed no code, `AGENTS.md`, `PLAN.md` or `PROGRESS.md`.
- 2026-10-13 · Claude Code · Read and aligned the Cowork docs (table of mismatches given to Anurag); gitignored docs/sell, docs/ads, evals/runs; added the AGENTS pointer. Name locked as FirstCheq (firstcheq.ai), replacing Bohni; app renamed. Next: go live.
- 2026-10-13 · Claude Code · Logo (tick-arrow mark, two-weight wordmark) and tagline added; site hosted on Convex; production live at dazzling-fox-925.ap-southeast-2.convex.site with codes FIRSTCHEQ (100) and GROWTHX-S4 (50). Waiting on Anurag: live Claude key, Google redirect + publish, investor import to prod, firstcheq.ai domain.
- 2026-10-13 · Claude Code · Security quick wins: rate-limited code checks, app-wide caps on waitlist and sign-ups, emails beyond the top 3 revealed only per request, hourly abuse watch (ALERT in Convex logs), Privacy and Terms pages. Data-growth thread queued as a separate session.
- 2026-10-13 · Claude Code · Live at www.firstcheq.ai: custom domain, sign-in on firstcheq.ai (CUSTOM_AUTH_SITE_URL), Google app published. firstcheq.in forwarding still pending (GoDaddy KYC).
- 2026-10-13 · Claude Code · Milestones 5–7 built on dev (not yet on prod): statuses (sent, replied, meeting, passed), follow-up 1 on day 3 and follow-up 2 seven days after #1 is sent (Haiku, under 60 words), a reply or pass cancels pending ones; pipeline on the reveal page and dashboard; re-running matching blocked once she has sent; 36 tests.
- 2026-10-13 · Claude Code · Live: pipeline and follow-ups (with a no-invented-progress check), email editing, 15-second message, and the dashboard (Today / Investors / Pipeline tabs, bottom bar on phones), one-line reasons for all 20 investors and a tap-to-see score breakdown.
- 2026-10-13 · Claude Code · Live: v4-style dashboard shell (workspace card, Your raise / Prepare menu with SOON previews, More sheet on phones), Profile page to edit name, company and lines, Settings with dark/light mode.
- 2026-10-13 · Claude Code · Live: Today with a next-move card and raise progress strip; medals for the top 3; badges from real data only (Leads rounds, Invested this year, Writes first cheques).
