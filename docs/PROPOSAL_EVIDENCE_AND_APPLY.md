# Proposal: deal evidence in matching, and apply links instead of email

Status: **proposed, not built.** Written 13 Oct 2026 by the data session. The main session owns `convex/` and `src/`; nothing here changes until Anurag says yes. The data side already collects the fields (docs/ENRICHMENT_SPEC.md v2), so either change can land whenever it's approved.

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

## What I need from Anurag

1. Yes or no on each part (they're independent).
2. The words for the Apply flow (part 2).
3. The answer to the open question in part 1.
