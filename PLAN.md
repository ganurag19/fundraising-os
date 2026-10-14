# PLAN.md

> Design locked to v4 on 12 Oct 2026 (DESIGN.md). v1 is the **core loop only**: find, write, send, follow up, track. Everything else in the v4 prototype comes in later phases. The plan will change as founders use it.

## Decisions taken (defaults, change anytime)

- Audience (14 Oct): **first-time founders raising their first round** (idea to seed, ₹25L–10 Cr, India). Not "any round". "Next cheque" comes later as retention for founders who already used FirstCheq, not as a new audience; revisit if /admin shows many repeat founders.
- Cheque fit: an investor fits if their largest cheque is at least 2% of her round and their smallest is no more than the whole round.
- Ask bands: ₹25–50L · ₹50L–1Cr · ₹1–3 Cr · ₹3–5 Cr · ₹5–10 Cr.
- Stage mapping: as in docs/SEED_FORMAT.md.
- Investors with only an email pattern: hidden in v1.
- Excluded from results: Tracxn (not an investor) and Omidyar Network India (stopped investing).
- Landing hook: A, "First round? Send your first investor email in 10 minutes."
- Sign-in: right after the reveal screen, before she reads her first email (Google or email link).
- Every email includes her company one-liner and founder line from Profile.
- Name: **FirstCheq** (13 Oct), at **firstcheq.ai** (also .com and .in; Anurag to buy). Rejected for clashes: First Round, Round1, First Close, RaiseX, Raise Desk, Beej, Shagun; Bohni considered and dropped. Risk accepted with eyes open: First Cheque (an India Quotient-linked fund, active in 2026) has used "First Cheque" since 2018. Mitigations: own trademark filing (classes 35, 36, 42), a short lawyer opinion before ads, own visual identity, "Not affiliated with any fund" in the footer.
- Security (13 Oct): invite-code guesses limited (10 an hour per visitor, 300 wrong an hour app-wide); waitlist and sign-ups capped app-wide per hour; beyond her top 3, an investor's email is revealed only when she asks for that email (capped 17 a day); hourly abuse watch writes ALERT lines to the Convex logs. Next: Cloudflare Turnstile bot check (needs Anurag's Cloudflare keys), a per-account fingerprint on revealed lists, two-factor login on every account.
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

## Next milestone (after the colleague test, 15 Oct): tracking without "I sent it"

1. "Did you send it?" when she returns to FirstCheq after Open in Gmail: one tap, Yes / Not yet.
2. Sent is marked automatically: Open in Gmail pre-fills a BCC unique to her (e.g. track-xyz@firstcheq.ai); when her copy arrives we mark that investor sent with the real time. Keep only recipient, time and subject, never the email body; say so in the app and in Privacy. Needs the firstcheq.ai inbound mail set up.
3. One-tap reply buttons in the 9 AM reminder: "Did they reply? Yes · Meeting · No reply yet" (signed links, her list only).
Later (v2): Gmail access to detect replies (a restricted Google scope: security assessment and review), and possibly a FirstCheq connector for founders' own Claude.

## Milestone after tracking: Readiness v1 (unlocks Round Pass Plus)

Founders need these ready before and during outreach ("send the deck", "what's your burn?"). Claude drafts from her facts only, code checks her numbers, she edits. Order (let the colleague test's coming-soon taps on /admin confirm it; deck review moves up if it wins):

1. Investor Q&A prep: ~20 questions Indian seed investors ask, answers drafted from her profile and numbers; gaps flagged ("you haven't told us your burn").
2. Two-page teaser: a shareable one-pager (problem, solution, traction, team, the ask) as a link or PDF to attach to emails.
3. Deck review: she uploads her deck (PDF, Convex storage); slide-by-slide notes on what investors will question, what's missing for her stage, and the order. Paid tier (about ₹20–50 of AI per review).
4. Readiness check: a score and gap list across deck, teaser, metrics, data room and Q&A.
5. Data room checklist and a financial model template (our structure, her numbers).

Never generated: full pitch decks (review hers or give a template), financial models with numbers (template plus a check of her figures), a valuation figure for her company (explain methods and typical ranges only).
First: a reference library (seed deck contents by stage for Indian investors, investor question bank with good and bad answers, metric definitions, data room list). Every output goes through the eval method in docs/evals (rubric, read 50) before launch.
Moves Investor Q&A and the data room up from v1.5.

## v1.5 (weeks 3–6, after the first founders)

Investor Q&A with answers unlocked by profile completion · Competition page · Data room checklist and share link · full Profile builder · Settings with Gmail and Calendar integrations · Chat with us · Gmail send-only · "Full research" panel with "What to say" · SEBI fund-list research pilot · checked-investor queue to 300.

## v2 (months 2–3, after legal review)

Investor side (confirm profile, founders for you, team members) · founder ratings, reviews and earned badges (need real data first) · leaderboards and Pick of the week · paid plan · incubator licences.

## Parked (not now)

- US version for first-time founders: only after India traction (e.g. founders sending 5+ emails, investor reply rate, week-2 return). Then a cheap demand test first: a US landing page and waitlist with about $300–500 of ads. If intent is strong, build a narrow version (one or two sectors) so the US investor list stays small enough to research well. (US investor lists are a commodity; US ad clicks cost several times more; the app is India-shaped: ₹, Indian stages, Indian investors.)
- "Raising again?": help for a founder's next round (Series A investors, warm intros, data room, metrics prep). v2, after the first-round product is proven; same account and pipeline.
- **Next version of LinkedIn notes:** one click to send on LinkedIn, like Open in Gmail (LinkedIn has no prefilled-note link, so this needs a browser extension or LinkedIn's API; still never sent without her press), plus a follow-up DM once they accept. Now: profile link (or search) + the note to copy.
- More comparison pages (vs ChatGPT, vs buying an investor list) and one page per sector ("Investors for Indian climate startups"), counts and made-up examples only, never real investor names. First one live: /compare/fundraising-consultant.
- A real testimonial on the landing page, once a founder agrees (never a made-up one).
- hello@ and anurag@ inboxes for firstcheq.ai (free: ImprovMX forwarding to Gmail + Gmail "Send mail as" through Resend SMTP; or Google Workspace). **Do before ads or a wider launch**: Privacy, Terms and the grievance contact point to hello@firstcheq.ai, which receives nothing until then.
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
