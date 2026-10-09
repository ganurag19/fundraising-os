# Investor seed: files and format

No real investor data is in this repo. It lives in `seed/`, which is gitignored.

## Files

| Path | What it is |
|---|---|
| `seed/raw/impactverse_investor_list.xlsx` | Untouched copy. Sheets: Angels, Early Stage Investors, Accelerator/Angel Network. File date 29 Mar 2023. |
| `seed/raw/vc_access_file.xlsx` | Untouched copy. VC firms with focus sector and portfolio. File date 17 Jul 2025. |
| `seed/raw/jumbo_pack.xlsx` | Untouched copy. People at funds: name, title, email, LinkedIn. No sector or stage. File date 25 Nov 2025. |
| `seed/reference/fundraising_guide.pdf` (+ `.txt`) | Background reading for the draft instructions. Not shown to users. |
| `seed/investors.json` | Cleaned, merged records. The Convex import reads this. |
| `seed/investors_clean.xlsx` | The same records for review by hand: Summary, Investors, AI-Climate-Deeptech, Needs review. |

Rebuild after changing a raw file: `python3 scripts/clean_investors.py`

## How the cleaning works

1. Each sheet is read by its own reader into one record shape.
2. Firm rows (fund sheet, networks, VC access file) are merged by website domain, then by firm name.
3. People from the Jumbo pack take sector, stage and portfolio from their firm when the domain or name matches.
4. Everything is deduped by email. Raw text from every source is kept, joined with ` | `.
5. Each record gets `needs_review` flags for whatever is missing.

Nothing is invented. A fund that gives only an email pattern (`firstname@fund.com`) gets `email_status: "pattern_only"` and no email. We never build an address from a pattern.

## Record fields

| Field | Meaning |
|---|---|
| `id` | `inv_0001`… Stable only within one build. The import should match on email, then firm. |
| `kind` | angel, vc, corporate_vc, venture_debt, angel_network, accelerator, other (may not be an investor) |
| `person_name`, `title`, `firm`, `people[]` | `people` lists partner names for firm rows with no personal email |
| `email`, `email_status`, `email_pattern`, `other_emails[]` | status is listed, pattern_only or none |
| `how_to_reach`, `pitch_form_url` | e.g. "Pitch through website" |
| `website`, `linkedin_url`, `city`, `country`, `india_based` | |
| `sectors[]`, `sectors_raw` | normalised keys below, plus the source wording |
| `stages[]`, `stages_raw`, `stages_inferred` | inferred = taken from investor type only |
| `cheque_min_usd`, `cheque_max_usd`, `cheque_*_inr_lakh`, `cheque_raw` | ₹ uses a fixed rate (`usd_to_inr` at the top of the JSON) |
| `leads_rounds`, `portfolio[]`, `portfolio_count`, `response_time` | |
| `thesis` | Empty in every source today |
| `sources[]` | file, sheet and row for every fact |
| `source_date` | Date of the oldest source file. **Not** a check date. |
| `last_checked` | Set only when a person checks the record by hand |
| `needs_review[]` | no_email, email_pattern_only, no_sector, no_stage, stage_inferred, no_cheque_size, not_india_based, may_not_be_investor, no_portfolio |

## Sector keys

ai, climate, deeptech, b2b_saas, fintech, consumer, health, edtech, agritech, web3, adtech, impact, sector_agnostic, tech_general. The patterns are in `SECTOR_RULES` in the script.

## Stage mapping (review this)

| Source wording | Mapped to |
|---|---|
| Idea | idea |
| MVP | pre_seed |
| Customer Traction | seed |
| Revenue Traction | pre_series_a |
| Early Stage | pre_seed, seed, pre_series_a |
| Growth Stage | series_a, series_b_plus |
| Late Stage | series_b_plus |
| Accelerator (type only) | idea, pre_seed (inferred) |
| Angel network (type only) | pre_seed, seed (inferred) |

## Cheque fit

Cheque fit compares her round size with the investor's cheque range. An investor fits when their maximum cheque is at least 2% of her round and their minimum is no more than her whole round. If no cheque size is known, the investor is not excluded but ranks lower. **[guess, review: the 2% floor]**
