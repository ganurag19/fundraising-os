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
| 5. Import | script, then Convex | `python3 scripts/build_import.py --schema 2 --out seed/investors_import_v2.jsonl && node scripts/upsert_investors.mjs seed/investors_import_v2.jsonl` | updates investors in place by `seedId` and never deletes, so founders' lists survive. **Prod: Anurag adds `--prod` himself. Never run `convex import --replace` on prod**: it gives every investor a new id and breaks every live founder's list. Schema 1 (`build_import.py` with no flag) is only for a deployment still on the old schema |
| 6. Refresh | script + agents | `python3 scripts/refresh_queue.py --limit 50`, then step 3 on that queue | `seed/enrichment/queue_refresh_<date>.json` |

Tests: `python3 -m unittest discover scripts/tests` (made-up data, temp folder; run after any script change).

## Step 1: discovery file

One JSON object per line. Every line needs a `source_url`.

```json
{"kind": "vc", "firm": "Example Ventures", "person_name": null, "website": "https://example.vc", "city": "Bengaluru",
 "sectors_hint": ["climate"], "found_via": "sebi_aif", "source_url": "https://...", "deal": null, "note": null}
```

- `kind`: vc, angel, angel_network, accelerator, incubator, corporate_vc, family_office, grant, venture_debt, other.
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
| contact | email passes, **or** apply passes (an apply link reaches the app only with `build_import.py --schema 2`) | blocked |
| ↳ email | listed, printed on the investor's own site or an official page (.gov.in, .nic.in, .ac.in, .res.in), page recorded; with `--verify-emails` the page is opened once and contains the address (also "[at]" / "[dot]") | blocked |
| ↳ apply | an application or pitch-form link on the investor's own site or an official page; with `--verify-emails` it must open | (part of contact) |
| sources | thesis, stages, sectors, cheque, pitch route each have a source URL; every deal has a link | blocked |
| india | `india_based` is true, backed by a source | blocked |
| active | marked active, or a deal dated this year or last year | blocked, except accelerators and grants |

Records from the original spreadsheets are never blocked here (their emails came from the files). Their failures are counted in `checks_report.md` and feed the refresh queue. On 13 Oct: 19 of the 433 have no source at all, and 364 show no deal from 2025–26.

**Spot check:** 1 in 10 of the records checked in a batch (at least 3), picked at random, go into `seed/enrichment/spot_check_<date>.md` and the "Spot check" sheet. Anurag opens the links and marks each one right or wrong. If more than 1 in 10 are wrong on any field, stop and fix the research brief before the next batch.

## Sources and what they're allowed for

Checked 13 Oct 2026 (robots.txt and terms). Details are in `seed/discovered/_source_terms.md`.

| Source | Verdict | Use for |
|---|---|---|
| SEBI AIF register (sebi.gov.in) | ok | names only: 2,038 trust names, 25 per page, with no sector or website. Weak for discovery; use it to confirm a fund is registered |
| Atal Innovation Mission (aim.gov.in) | ok | list of Atal Incubation Centres |
| DST NIDHI (nidhi.dst.gov.in) | ok to read; copying needs permission | incubator names; store facts only, never copy text |
| Startup India (startupindia.gov.in) | ok | Seed Fund Scheme incubators, programmes |
| Fund, network and incubator websites | ok unless their own terms say no | the main research source |
| Outlook Business | ok (robots.txt allows Claude) | single funding articles: angels and deals |
| IVCA (ivca.in) | single pages only | member list is behind a login, so not usable |
| Indian Angel Network (iangroup.vc) | single pages only | their own facts |
| Inc42 | **out** (Cloudflare check; we don't get around it) | none |
| Entrackr | **out** (terms ban automated collection and building a database) | none |
| YourStory | **out** (robots.txt disallows ClaudeBot) | none |
| VCCircle | **out** (blocked) | none |
| LetsVenture / LVX | **out** (terms ban automated access) | none |
| TechCrunch | **out** (robots.txt disallows ClaudeBot) | none |

**This changes the plan for angels and monthly deals.** The four Indian funding-report sites the brief named are all out. Deals and angel names now come from: fund and network sites (portfolio and news pages), the startup's own announcement page, Outlook Business articles, and other news sites once each one's robots.txt and terms are checked and added to this table. If Anurag wants Inc42 or Entrackr, the honest route is to ask them for permission or a data licence.

Never used: LinkedIn, Crunchbase, Tracxn, OpenVC (terms forbid automated reading). We read pages one at a time, the way a person would. No crawling, no getting around a block, login or captcha.

## Batches and the 1,500 target

The pilot sets the yield (see the status log in docs/CONTEXT.md). The plan from here, adjusted after each batch:

| Week | Batch | Discover | Expected new in app |
|---|---|---|---|
| 1 (13 Oct) | Pilot | ~60 mixed | measured |
| 2–3 | Funds | SEBI Cat I VC AIF list → AI, climate, deeptech, agnostic seed funds | ~150–250 |
| 3–4 | Angels | allowed news (Outlook Business), network and syndicate sites, startups' own funding posts | lower than first hoped: the main funding-report sites are out |
| 4–5 | Networks + corporate arms + family offices | IVCA members, network sites | ~80–120 |
| 5–6 | Incubators + grants | AIM, NIDHI, Startup India lists | most need the apply-link change (docs/PROPOSAL_EVIDENCE_AND_APPLY.md) |
| 6–8 | Refresh the original 433 | `refresh_queue.py --sectors fintech,b2b_saas,consumer,health --limit 100` first (all 12 sectors are live since 13 Oct; these have the fewest theses and tagged deals), then the rest | fewer stale records, better emails for the new sectors |

If an investor has no published email, it can't be in the app today, so the real count depends on how many publish one. The pilot measures this.

## Retiring and safe ids

- `build_import.py --schema 2` remembers every investor it has exported (`seed/enrichment/exported_ids.json`). An investor that was exported before but isn't now (it stopped investing, failed a re-check, or lost its only contact route) gets a line `{"seedId": "...", "retired": true}`. The safe import hides it from new matches and keeps it on founders' existing lists. If it comes back later, the full row clears the mark.
- The import replaces each investor's data, so a fact dropped in research (an email, a passed deadline) disappears from the app too.
- The spreadsheet ids (`inv_0001`…) come from row order in `clean_investors.py` and shift if a raw file changes. `build_import.py` stops with "STOPPED: these ids now name a different investor" if that happens, rather than putting one investor's facts on another's record. Ask Claude to map old ids to new before importing.

## Weekly routine (about 30 minutes; Anurag starts it, nothing runs on its own)

What the landing page can truthfully say: contact links checked every week; every investor re-researched at least every 6 months.

1. `python3 scripts/refresh_queue.py --months 0 --limit 25`: the 25 investors checked longest ago (never-checked first; angels whose identity failed in the last 30 days are skipped). Includes apply-only programmes.
2. Ask the data session: "research this week's refresh queue". Agents follow ENRICHMENT_SPEC v2 (about 15 minutes).
3. `python3 scripts/merge_enrichment.py && python3 scripts/check_records.py --verify-emails`: opens every email page and apply link for **all** investors (about 2 minutes). A page that fails to open twice in a row, a closed call, or a dead link retires that investor.
4. Read the research notes for anything not marked excluded that should be: not an investor, growth or PE only, dead or taken-over domain, merged. Record each decision in `seed/enrichment/refresh_overrides_<date>.json` with its reason.
5. `python3 scripts/build_import.py --schema 2 --out seed/investors_import_v2.jsonl`, then Anurag runs `node scripts/upsert_investors.mjs seed/investors_import_v2.jsonl` (dev), checks, then `--prod`.
6. One line in the docs/CONTEXT.md status log.

With 574 investors and 25 a week, the list rolls through in about 23 weeks.

## Refresh cadence

- **Monthly (first week):** a recent-deals pass. An agent reads that month's funding news from allowed sources only (table above; single articles) and writes `seed/discovered/deals_<YYYY-MM>.jsonl` with a `deal` on each line. `add_candidates.py` routes deals to investors we already have and queues new names. Then run merge → check → import.
- **Every 6 months per investor:** `refresh_queue.py` lists investors in the app whose `last_checked` is over 6 months old (never-checked first). Research those like any unit; the newer result wins on merge.
- **`last_checked`** is the date the research result was written. `source_date` is when a record first came in. The app shows "Recently checked by us" from `lastChecked`.
- A result with `active: false` excludes the investor at the next import. The record stays in the file, so it isn't rediscovered.

## Rules (from AGENTS.md, repeated because they matter here)

- Never build an email from a pattern. Never take one from a directory or aggregator.
- No LinkedIn. No site whose terms forbid automated reading.
- Real investor data stays in `seed/`. Never in the repo, tests, logs or chat summaries beyond counts.
- Nothing is emailed to anyone. The import to prod is Anurag's.

## Open notes (parked, Anurag will revisit)

**SEBI AIF register** (sebi.gov.in, `OtherAction.do?doRecognisedFpi=yes&intmId=16`), studied 14 Oct 2026, not started.
- 2,038 registered AIFs, 25 per page (82 pages, paged by a form post). robots.txt allows it. Each entry: trust name, registration no., email, address, contact person, validity.
- Category from the registration no.: `IN/AIF1/` = Cat I (VC, angel, social), `AIF2` = mostly PE, debt, real estate, `AIF3` = hedge funds. Page 1 sample: 7 of 25 Cat I.
- Realistic yield: 300–500 new early-stage investors, not 2,000 (Cat I plus a slice of Cat II; one manager often has several trusts; many already in our list).
- Email caution: these are regulatory contacts, often a compliance officer or a trustee company serving many funds. Proposed rule: use a SEBI email only if its domain matches the fund's own site and research shows it's a general/pitch address or an investing partner; never trustee-company addresses; an address on the fund's own site wins. Note `check_records.py` treats .gov.in pages as official, so this rule must be added before any SEBI email is exported. Contact names kept only for matching; addresses never stored.
- Plan when picked up: `scripts/fetch_sebi_aif.py` (one polite pass, 1 request / 2 s, raw pages saved to seed/raw/sebi_aif_<date>/) → parse, filter Cat I (+ Cat II if chosen), drop real estate / credit / infra by name, group trusts by email domain → `seed/discovered/sebi_aif_<date>.jsonl` → dedupe → research in batches of ~100 → checks → upsert.
- Decisions taken 14 Oct (Anurag: "let's do all"): Cat I plus Cat II names that suggest venture, angel, seed or tech; the register is used only as a list of names to research (name, category, email domain to find the fund's site). No SEBI text or email goes into the app.
- SEBI's website policy (sebi.gov.in/website-policy.html): reproducing material needs permission by email; automated reading isn't addressed; robots.txt allows the list pages.
- **Blocked on 14 Oct.** Page 1 loads, but the next pages come from an AJAX endpoint, and SEBI's firewall answered our single test request with "Unauthorized Request Blocked". We don't get around blocks, and there is no official download. Way forward: Anurag emails websitehelp@sebi.gov.in asking for the registered AIF list as a file and permission to use it as a research index (and, if wanted, to show the listed emails). With the file, the plan above runs from step 2.
