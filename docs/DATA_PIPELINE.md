# Investor data pipeline: grow and refresh the list

Goal: from 433 investors in the app (90 with a thesis) to 1,500+ by early December 2026, every fact with a source link, and the list kept fresh after that. Real data lives only in `seed/` (gitignored). Scripts and docs live in the repo, and their tests use made-up investors only.

## The six steps

```
discover ─▶ de-duplicate ─▶ research ─▶ check ─▶ import to dev ─▶ refresh
seed/discovered/*.jsonl      add_candidates.py   ENRICHMENT_SPEC   merge_enrichment.py      build_import.py
                                                  (Claude agents)   check_records.py
```

| Step | Who | Command / input | Output |
|---|---|---|---|
| 1. Discover | Claude agent, one source at a time | sources below | `seed/discovered/<batch>.jsonl` |
| 2. De-duplicate | script | `python3 scripts/add_candidates.py` | new units in `seed/enrichment/queue_growth.json`; deals for investors we have in `seed/enrichment/deals.json`; `seed/discovered/_dedupe_report.md` |
| 3. Research | Claude agents, about 10 units each | docs/ENRICHMENT_SPEC.md v2 | `seed/enrichment/results/<slug>.json` |
| 4. Merge + check | script | `python3 scripts/merge_enrichment.py && python3 scripts/check_records.py --verify-emails` | `seed/investors_enriched.json`, `checks_report.md`, `spot_check_<date>.md`, "Spot check" sheet |
| 5. Import to dev | script, then Convex | `python3 scripts/build_import.py && npx convex import --table investors --replace -y seed/investors_import.jsonl` | dev has the new list; **Anurag runs `--prod` himself** |
| 6. Refresh | script + agents | `python3 scripts/refresh_queue.py --limit 50`, then step 3 on that queue | `seed/enrichment/queue_refresh_<date>.json` |

Tests: `python3 -m unittest discover scripts/tests` (made-up data, temp folder; run after any script change).

## Step 1: discovery file

One JSON object per line. Every line needs a `source_url`.

```json
{"kind": "vc", "firm": "Example Ventures", "person_name": null, "website": "https://example.vc", "city": "Bengaluru",
 "sectors_hint": ["climate"], "found_via": "sebi_aif", "source_url": "https://...", "deal": null, "note": null}
```

- `kind`: vc, angel, angel_network, accelerator, corporate_vc, family_office, grant, venture_debt, other.
- `found_via`: sebi_aif, fund_site, ivca, funding_report, aim, nidhi, startup_india, news, other.
- `deal` (for a name found in a funding article): `{"company", "year", "round", "sector", "source_url"}`.
- An individual angel only counts if the article names them as an investor in that round.

## Step 2: de-duplicate rules

A candidate is the same investor as an existing record (or an earlier candidate) when it matches on:

1. Website domain, with subdomains counting as the same site. Shared hosts never match: gmail, LetsVenture, AngelList, gov portals and so on.
2. The cleaned firm name: "Blue Kettle Capital" = "Blue Kettle Ventures".
3. The person's name, when one side has no firm or both firms are the same.

When a candidate matches, its deal (if any) goes to that investor. When it doesn't, it gets a stable id (`g_` plus a hash) that stays the same across rebuilds, so the Convex `seedId` never shifts. The dedupe report lists every match; a wrong match hides a new investor, so skim it.

## Step 4: automatic checks (check_records.py)

| Check | Passes when | New investor fails → |
|---|---|---|
| email | listed, printed on the investor's own site or an official page (.gov.in, .nic.in, .ac.in, .res.in), page recorded; with `--verify-emails` the page is opened once and contains the address (also "[at]" / "[dot]") | blocked |
| sources | thesis, stages, sectors, cheque, pitch route each have a source URL; every deal has a link | blocked |
| india | `india_based` is true, backed by a source | blocked |
| active | marked active, or a deal dated this year or last year | blocked, except accelerators and grants |

Records from the original spreadsheets are never blocked here (their emails came from the files). Their failures are counted in `checks_report.md` and feed the refresh queue. On 13 Oct: 19 of the 433 have no source at all, and 364 show no deal from 2025–26.

**Spot check:** 1 in 10 of the records checked in a batch (at least 3), picked at random, go into `seed/enrichment/spot_check_<date>.md` and the "Spot check" sheet. Anurag opens the links and marks each one right or wrong. If more than 1 in 10 are wrong on any field, stop and fix the research brief before the next batch.

## Sources and what they're allowed for

Checked 13 Oct 2026 (robots.txt and terms). Details are in `seed/discovered/_source_terms.md`.

<!-- SOURCE_TABLE -->

Never used: LinkedIn, Crunchbase, Tracxn, OpenVC (terms forbid automated reading). We read pages one at a time, the way a person would. No crawling, no getting around a block, login or captcha.

## Batches and the 1,500 target

The pilot sets the yield (see the status log in docs/CONTEXT.md). The plan from here, adjusted after each batch:

| Week | Batch | Discover | Expected new in app |
|---|---|---|---|
| 1 (13 Oct) | Pilot | ~60 mixed | measured |
| 2–3 | Funds | SEBI Cat I VC AIF list → AI, climate, deeptech, agnostic seed funds | ~150–250 |
| 3–4 | Angels | 3 months of weekly funding reports (single articles) | ~150–250 |
| 4–5 | Networks + corporate arms + family offices | IVCA members, network sites | ~80–120 |
| 5–6 | Incubators + grants | AIM, NIDHI, Startup India lists | most need the apply-link change (docs/PROPOSAL_EVIDENCE_AND_APPLY.md) |
| 6–8 | Refresh the original 433 | refresh_queue.py | fewer stale records, not more records |

If an investor has no published email, it can't be in the app today, so the real count depends on how many publish one. The pilot measures this.

## Refresh cadence

- **Monthly (first week):** a recent-deals pass. An agent reads that month's weekly funding reports (single articles) and writes `seed/discovered/deals_<YYYY-MM>.jsonl` with a `deal` on each line. `add_candidates.py` routes deals to investors we already have and queues new names. Then run merge → check → import.
- **Every 6 months per investor:** `refresh_queue.py` lists investors in the app whose `last_checked` is over 6 months old (never-checked first). Research those like any unit; the newer result wins on merge.
- **`last_checked`** is the date the research result was written. `source_date` is when a record first came in. The app shows "Recently checked by us" from `lastChecked`.
- A result with `active: false` excludes the investor at the next import. The record stays in the file, so it isn't rediscovered.

## Rules (from AGENTS.md, repeated because they matter here)

- Never build an email from a pattern. Never take one from a directory or aggregator.
- No LinkedIn. No site whose terms forbid automated reading.
- Real investor data stays in `seed/`. Never in the repo, tests, logs or chat summaries beyond counts.
- Nothing is emailed to anyone. The import to prod is Anurag's.
