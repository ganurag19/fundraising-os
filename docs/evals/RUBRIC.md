# RUBRIC.md · the first email, scored on three levers

Applies Eval basics (define what good looks like) to Bohni. Status: **[guess, review]**. The handbook says the rubric must be written by you ("you cannot offload this one"), so treat every level below as a draft to rewrite in your own words. Keep the numbers: they make a level checkable.

## The one output

**The first email Bohni writes for a founder to one investor** (subject, body, plus the reason, "why they fit" and "watch out" lines). Why this one: it is the job (send your first investor email in 10 minutes), and it carries the riskiest guess in `PRODUCT.md` section 6 ("founders will send an AI-drafted email"). The investor list is covered by code tests (cheque fit, sector and stage filter) and is a second rubric to write later, not now.

## Why these three levers

Your agent already checks some of this in code (`checkDraft`, `unsourcedFacts` in `convex/lib/checks.ts`): length, banned phrases, generic openers, missing one-liner, facts pointing at empty fields. Code checks are free and exact, so use them first. The judge model (Haiku) is only for what code cannot see: is the hook specific, is the tie to her company real, would she send it.

| Lever | What decides it | Checked by |
|---|---|---|
| A. The hook | True, specific, tied to her. The wrong-fact failure lives here | `unsourcedFacts` for truth; judge for specificity and the tie |
| B. Her story | Her one-liner, founder line and traction used as she wrote them; nothing invented | `checkDraft` for "missing" lines; judge for invented claims and flow |
| C. Ready to send | Subject, length, ask with amount, tone | `checkDraft` for the numbers; judge for tone and "would send" |

## The rubric (copy `rubric.csv` into a Google Sheet)

| Lever | L1 (worst) | L2 | L3 | L4 | L5 (best) |
|---|---|---|---|---|---|
| **A. The hook** | States a fact not in the investor's record (invented deal, company, cheque, quote or connection), or has no line about the investor | Only generic lines that could go to any investor ("climate is on your list of sectors") | True and specific (a portfolio company, a deal or a thesis point from the record) but not tied to her company | True, specific and tied to her company, but the tie is a stretch, or it describes a portfolio company's space without support in the record | A named recent deal or thesis point from the record, tied to her company in the same sentence; every fact is in `factsUsed` under a field that exists |
| **B. Her story** | Invents a credential, number or customer, or changes her words so the meaning changes | Leaves out her one-liner, founder line or traction, or paraphrases them loosely | All her lines present but out of order, repeated, or re-worded | All her lines word for word, right order, a small flow issue | Her lines word for word in order (hook, who she is, what the company does, traction, ask); nothing added she didn't say; reads as one person wrote it |
| **C. Ready to send** | No ask, a banned phrase, says or hints AI wrote it, or promises a meeting or a return | Ask has no amount or the wrong stage; subject 8+ words; body over 120 words | Within limits but generic or flattering ("impressive", "amazing"); more than 5 minutes to fix | Within limits, clear ask with amount and stage, 1–2 small edits (under 2 minutes) | Subject under 8 words and specific; body 60–100 words; ask with ₹ amount and stage in lower case; plain warm Indian English; she would send it as is |

**Pass bar for a case:** each lever at or above the level written in the case's "Good looks like". A normal case needs L4 on all three. A thin-record case may accept L2 or L3 on A, but never L1.

**Rule for the scorer:** one lever per call, quote the line it is scoring, and say "can't tell" instead of guessing.

## Edge cases we start with (add one line on every miss; don't just say "fix this")

- A: a portfolio company whose name hides its space ("Quillwork") must be named without saying what it does. (from the prompt rules)
- A: a hook built only from a sector or stage the investor lists is L2, never L3. (from the generic-opener list)
- A: copying 8 or more consecutive words from a long thesis is at most L3.
- B: if her own one-liner contains a banned word, the email keeps her words and the founder sees why it was flagged. **Decision needed from you** (case E07): today the rules conflict.
- C: money is written ₹, never "INR" or "Rs".

## Your turn

1. Rewrite each level in your own words; keep the numbers (word counts, minutes).
2. Add a fourth lever only if a group of failures needs it (see `RUNBOOK.md` step 1).
3. Paste the final rubric into `CC_PROMPTS.md` prompt 1.
