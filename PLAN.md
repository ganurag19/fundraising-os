# PLAN.md

> Design locked to v4 on 12 Oct 2026 (DESIGN.md). v1 is the **core loop only**: find, write, send, follow up, track. Everything else in the v4 prototype comes in later phases. The plan will change as founders use it.

## Decisions taken (defaults, change anytime)

- Cheque fit: an investor fits if their largest cheque is at least 2% of her round and their smallest is no more than the whole round.
- Ask bands: ₹25–50L · ₹50L–1Cr · ₹1–3 Cr · ₹3–5 Cr · ₹5–10 Cr.
- Stage mapping: as in docs/SEED_FORMAT.md.
- Investors with only an email pattern: hidden in v1.
- Excluded from results: Tracxn (not an investor) and Omidyar Network India (stopped investing).
- Landing hook: A, "First round? Send your first investor email in 10 minutes."
- Sign-in: right after the reveal screen, before she reads her first email (Google or email link).
- Every email includes her company one-liner and founder line from Profile.
- Invite-only: **yes** (12 Oct). Landing buttons are "Request an invite" and "I have a code". Requests go to a waitlist; codes are checked on the server. Make a code with `npx convex run invites:createCode '{"code":"GROWTHX-S4","label":"GrowthX","maxUses":50}'`.

## v1: path to live

Landing page first: the v4 landing, founder side. The investor toggle shows "Investors: coming soon".

1. I can enter one real company and read 3 emails to real investors that I would send myself. The 3 top picks come from seed/investors_enriched.json, and each email uses my one-liner and founder line. **now**
2. I can see up to 20 investors ranked by match score from the researched list, with 3 gold top picks (reason, why they fit, watch out) and a retry message if it takes over 15 seconds.
3. I can edit an email and open it prefilled in my Gmail, or copy it if the link fails.
4. I can enter a sector with no match and get a clear message, not a junk list.
5. I can tap "I sent it" and see that investor in Pipeline under "Waiting on them".
6. I can see follow-ups written for investors I emailed 3 days ago, and a second one 7 days after that, in Pipeline under "Your move" and on Today.
7. I can mark a reply and that investor's follow-ups stop.
8. Today shows my next move, top picks and today's list. A stranger can finish the whole flow without me explaining it, and the step log shows each step reached.

Last: I can close it, reopen it, and my data is still there (Google sign-in).

Go live: you open it on your phone, logged out, on mobile data → deploy to prod → share with the first 10 founders.
At go-live, also: set the live Claude key on prod, import the investors into prod, and re-create invite codes on prod (GROWTHX-S4 and others) — dev codes don't carry over.

Before milestone 1: GitHub repo, Convex project, Claude keys and caps (the setup checklist below).

## Setup checklist

- [x] Node and npm installed
- [x] GitHub CLI installed (12 Oct)
- [x] GitHub sign-in (12 Oct, ganurag19)
- [x] Public repo pushed: github.com/ganurag19/fundraising-os
- [x] App scaffold: Vite + React + TypeScript + Convex (12 Oct, builds and runs)
- [x] Convex project `fundraisingos` signed in, dev deployment running; app connected (12 Oct)
- [x] `ANTHROPIC_API_KEY` set on the Convex dev deployment (12 Oct). Live key goes on prod at go-live.

## v1.5 (weeks 3–6, after the first founders)

Investor Q&A with answers unlocked by profile completion · Competition page · Data room checklist and share link · full Profile builder · Settings with Gmail and Calendar integrations · Chat with us · Gmail send-only · "Full research" panel with "What to say" · SEBI fund-list research pilot · checked-investor queue to 300.

## v2 (months 2–3, after legal review)

Investor side (confirm profile, founders for you, team members) · founder ratings, reviews and earned badges (need real data first) · leaderboards and Pick of the week · paid plan · incubator licences.

## Parked (not now)

- Skip an investor she already knows; "rewrite with this note"; "passed" suggests 3 next names; odd ask-size warning
- Import her Sheet; export to a Sheet
- Weekly digest; WhatsApp reminders
- Comparable rounds inside drafts
- Gmail read access (needs Google's security assessment)
- Deck, cap table and model builders; living data room; templates, learning, blog
- Pitch narrative, FAQ, DD folder; investor update emails
- Scheduled refresh of the investor list; reading her LinkedIn or deck to fill her profile (her website is read once at sign-up, since 2026-10-11)
- LinkedIn and email sign-in, offered in Settings next to Google
- Founder check: confirm she's real and part of the startup (search lookup, LinkedIn link vs company). Flag internally; show a subtle "unverified" only if it doesn't match. Today we only store, internally, whether her Google email domain matches her website.
- Installable app → Play Store / App Store
