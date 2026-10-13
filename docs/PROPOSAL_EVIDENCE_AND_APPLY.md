# Proposal: deal evidence in matching, and apply links instead of email

Status: **approved by Anurag on 13 Oct 2026 (both parts); app side live on dev (commit 5cd23e3, not on prod). "Dated deals" counts only deals with a year and a sector tag in the last 3 years.** Written by the data session. The main session owns `convex/` and `src/` and builds the app side. The data side is ready: `python3 scripts/build_import.py --schema 2` writes `recent[].sector`, `applyUrl`, `applyDeadline` and `applyType`, and includes rows with an apply link but no email. Plain `build_import.py` stays on today's schema until the main session says the new one is live.

Defaults taken with the approval (Anurag can change them):
- Open question in part 1: **yes**. A listed sector with 0 matching deals out of 5+ dated deals drops from 30 to 24.
- Words for part 2: "Apply", "I applied", "Closes <date>". Add them to DESIGN.md section 3.

## 1. Sector tags on deals, so the score uses evidence

**Today.** "Invests in your space" (30 points) comes only from the investor's `sectors` list. A fund that writes "sector agnostic" but did 5 climate deals last year scores 12 for a climate founder, and a fund that lists climate but never did a climate deal scores 30.

**Data side (done).** Each recent investment can carry `sector` (one key from SEED_FORMAT.md), taken from the funding article or the company's own one-liner, with its `source_url`. Monthly funding-report passes add deals to investors we already have (`seed/enrichment/deals.json`).

**App side (proposed).**

- Schema: `recent: { company, year?, round?, sector? }` (one optional field, so existing rows stay valid). Portfolio companies keep plain names. Tagging every portfolio company is a lot of research for little extra signal, so deals only.
- `build_import.py` passes `sector` through. It's held back today because the current schema would reject it.
- Score, keeping the 30-point cap: evidence counts toward "Invests in your space":
  - 2 or more deals in her sector in the last 3 years: 30, even if `sectors` says agnostic;
  - 1 such deal: at least 24;
  - otherwise as today.
- Breakdown and reason text: "3 of 7 recent deals are climate" in "why they fit", built in code from the stored deals, so the AI never counts.
- Tests: an agnostic fund with 2 climate deals beats one with none; a deal with no sector changes nothing.

Open question for Anurag: should a listed sector with **zero** matching deals (when the investor has 5+ dated deals) lose points? I'd say yes, from 30 to 24, but it penalises funds whose portfolio pages we read badly.

## 2. Accelerators, incubators, grants: an application link instead of an email

**Today.** `investors.email` is required and `build_import.py` keeps only records with a listed email. Most incubators and every grant scheme publish an application form, not a pitch address, so they are researched but never reach the app. The same goes for funds that only take decks through a form.

**Data side (done).** Records carry `application: {url, deadline, type}` (type `rolling`, `cohort` or `call`) with a source. Grants (`kind: grant`) are held back by `build_import.py` for now.

**App side (proposed).**

- Schema: `email` becomes optional and `applyUrl?`, `applyDeadline?` and `applyType?` are added. A row must have one of email or applyUrl. That's checked in `build_import.py` and in the import mutation.
- Matching: unchanged for funds. Accelerators and grants appear only if her stage is idea or pre-seed (grants: idea, pre-seed or seed), and never as one of the 3 gold top picks, since there's no email to write.
- Card: instead of "Write email", an "Apply" button opens the link in a new tab, plus the deadline if there is one. "I applied" puts it in Pipeline under "Waiting on them". No follow-ups (there's no inbox to nudge).
- Words: "Apply", "I applied" and "Closes 12 Nov" aren't in DESIGN.md section 3 yet, so Anurag needs to approve them.
- Funds whose only route is a form: same Apply button, ranked as today but not a top pick.
- New kind labels: `family_office` is imported as `corporate_vc` today, so it shows under Funds. `grant` would need a "Programmes" filter, or would only show under All.

## Order to ship

1. Main session: schema (`email` optional, `applyUrl?`, `applyDeadline?`, `applyType?`, `recent[].sector?`), with an import check that each row has an email or an applyUrl. Matching and card changes, with tests.
2. Data session: `build_import.py --schema 2`, then import to dev. Anurag checks dev on his phone.
3. Anurag: the prod import, after the prod deploy.
