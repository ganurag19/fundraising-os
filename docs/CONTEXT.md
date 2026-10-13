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
- 2026-10-13 · Claude Code · Live: landing rewrite (tagline 'Your journey to your first cheque starts here.', 3 pains, 3 numbered 'done for you' boxes, an example email; removed promises v1 doesn't keep: 18 answers, competitor table, ratings). Email hooks must name a deal when the record has one (checked in code); sign-up asks for one proof number.
- 2026-10-13 · Claude Code · Live: emails phrase her story fresh for each investor (facts and numbers checked in code, no invented numbers); public pages always dark, dashboard light by default; calmer sidebar type.
- 2026-10-13 · Claude Code (data) · Growth pipeline built (docs/DATA_PIPELINE.md; scripts add_candidates, check_records, refresh_queue; merge handles new records, refreshes, deals; 15 tests, made-up data) and spec v2. Pilot: 72 found, 68 new researched, 28 with an email verified on its own page, 23 pass every check and are in the import file (456 total); dev import waiting on Anurag. Inc42, Entrackr, YourStory, VCCircle, LVX are out by their terms. Proposal for deal sectors and apply links in docs/PROPOSAL_EVIDENCE_AND_APPLY.md, not built.
- 2026-10-13 · Claude Code (data) · Funds batch: 110 found (Blume micro-VC list, SIDBI Fund of Funds page), 108 new researched. Pipeline now 176 new: 77 pass every check (49 by verified email, 27 by apply link only). Import files: investors_import.jsonl 482 (schema 1), investors_import_v2.jsonl 510 (schema 2, live on dev via main session 5cd23e3). Fixed: same-name/different-site false match, unverified email exported alongside an apply link; added forms linked from own site, Cloudflare-hidden emails; 21 tests. Dev import waiting on Anurag.
- 2026-10-13 · Claude Code (data) · Anurag imported investors_import_v2.jsonl to dev (510 investors, 27 reachable by apply link only). Prod import not done. Incubator and grant batch running.
- 2026-10-13 · Claude Code (data) · Safe import wired in: docs point to scripts/upsert_investors.mjs (never --replace on prod); build_import --schema 2 writes retired lines for dropped investors and refuses to run if spreadsheet ids shift (exported_ids.json seeded from prod 433 + dev 510); 23 tests.
- 2026-10-13 · Claude Code (data) · Incubator/grant batch: 251 found (Seed Fund Scheme list, NIDHI, AIM, BIRAC), 249 new researched; new kind "incubator". v2 import now 654 (221 new; 56 apply-link only); schema 1 file 588. Added: kind-aware dedupe (programmes sharing a site), distinct ids on shared sites, closed calls and past deadlines dropped, official Indian lists count as India, fetch retries. 29 tests. Upsert to dev waiting on Anurag.
- 2026-10-13 · Claude Code (data) · Anurag upserted investors_import_v2.jsonl to dev: 144 new, 510 updated, 0 skipped (654 total). Prod upsert not done.
- 2026-10-13 · Claude Code (data) · Prod upserted by Anurag (per main session): 221 new, 433 updated, 654 investors live; founder lists intact. Main session checked a made-up agritech/climate founder on dev: 235 fit, top 3 funds, 5 programmes in her 20.
- 2026-10-14 · Claude Code · Email reminders live via Resend (welcome after sign-in, 9 AM follow-up reminder, logo, Settings switch); firstcheq.ai verified in Resend. Parked: hello@/anurag@ inboxes (needed before ads, since policies point to hello@).
- 2026-10-14 · Claude Code (data) · Sector refresh (fintech, B2B SaaS, consumer, health): 78 units re-researched; of the 81 records, thesis 0→35, sector-tagged deals 0→31; 25 angels skipped (identity not confirmed, still due); 1 retired (stopped investing). Refresh merges no longer erase earlier findings; one failed page-open keeps a pass (check_state.json). v2 import 653. 31 tests. Upsert waiting on Anurag.
- 2026-10-14 · Claude Code · Landing v6 live: hero with Start-here card (answers carry into sign-up), proof bar with ribbon, before/after block, product demo in light mode, 3 personalised emails with FirstCheq Fit Score, Fit Score block, fuller comparison, SOON hooks; pricing moved inside the dashboard (Request access, no prices); new wordmark (First + italic Cheq); 'FirstCheq Fit Score' replaces 'Match score' in DESIGN.
- 2026-10-14 · Claude Code · Landing tweaks live: both buttons in the Start-here card with dividers, ribbon "checked every week" (links weekly, full re-research every 6 months, per data session), animated strikes, Fit Score and Compare copy, 6-card What's more with gold VIP card, FAQ centred, Fit Score number centred in its ring; dashboard Founders connect (SOON).
- 2026-10-14 · Claude Code · Owner dashboard live at /admin (Google sign-in as ADMIN_EMAIL + ADMIN_PIN, 5 tries/hour, 12-hour unlock): funnel, clicks, who's trying it, forms, invite codes, AI calls. New events table (page visits + data-track clicks, hashed visitor, no typed text); Privacy updated. Invite code placeholder no longer shows a real code.
- 2026-10-14 · Claude Code · Landing v7 live (ideas from revnu.com, own words): top bar with live count, hero activity feed, highlighter on key lines, Fit Score as a self-sorting table with pointer and 'Why they fit' + sources, 'Which should you choose?' (own / consultant / FirstCheq), 9 AM reminder phone, '4 questions, 2 minutes'; new page /compare/fundraising-consultant (honest comparison, tracked as visit_compare). Parked: more comparison and sector pages, real testimonial.
- 2026-10-14 · Claude Code · More space between landing blocks; dashboard investor list now a table like the landing demo (Fit Score bars, recent deal in her space via dealToShow, cheque, 'Why they fit' panel with sources and score parts); 6th VIP card in dashboard coming-soon; key differences: FirstCheq column as a highlighted card, new rows Targeted reach and Personalised emails.
- 2026-10-14 · Claude Code · LinkedIn notes live: every new draft returns a LinkedIn connection note (≤300 chars, checkNote: company named, no invented numbers, banned phrases) in the same AI call; old emails get one via write.writeNote (Haiku, 20/day per founder). Email / LinkedIn note switch on every email; Open LinkedIn (investors.linkedin, new optional field from the research) or Find on LinkedIn (her search). Landing: notes on the 3 examples, hero chip, 'Ways in' row. Parked: one-click send on LinkedIn. Asked data session for investor LinkedIn links.
- 2026-10-14 · Claude Code (data) · Export now carries "linkedin" (canonical /in/ or /company/) for 326 of 653 investors, taken only from Anurag's spreadsheets; no new LinkedIn lookups (his "no LinkedIn" rule; awaiting his decision). 32 tests.
- 2026-10-14 · Claude Code · Fix: a new startup on the home page showed the old list's emails (the browser's visitor token kept pointing at it). Now: sign-out gives the browser a fresh token; sign-in finds her list by account (founders.myToken); a different startup typed while signed out, or over a claimed list, starts a new visitor; a claimed list's emails and profile show only to its signed-in owner (server-side).
