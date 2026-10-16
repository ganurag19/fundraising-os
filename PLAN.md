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

## New direction (15 Oct, confirmed): FirstCheq Raise Kit

**"Paste your website. In 5 minutes: your raise plan, your investor kit in your brand, and pitches to the investors who fit, sent with a swipe."** From the GrowthX feedback ("collateral building is the real pain", AI-native) and Relay's pattern.

1. **Input:** website; about-you text (pasted, or LinkedIn's own "Save to PDF"; we never read LinkedIn); stage and amount; 5 questions (traction, team, use of funds, two competitors, milestones).
2. **Output:** (a) **Raise plan:** investor types, how many fit each, sequence (angels and networks → accelerators and grants → micro-VCs), timeline. (b) **Investor kit in her brand** (logo, colours, fonts from her site): deck from Anurag's templates, two-page teaser, investor Q&A, business model, roadmap, team, funding trends in her sector (from our data), competition and market sizing (web research, every claim sourced or marked), compliance and data-room checklist and templates. Paid sections shown as locked previews. (c) **Outreach cards:** one investor at a time, why them, the personalised pitch; edit, swipe left to skip, swipe right to send. Plus LinkedIn note (copy and open profile), forwardable intro blurb, build-in-public post templates and their sequence. No X tagging.
3. **Sending:** Saturday: swipe right opens Gmail with the email ready. Next: optional "Connect Gmail" (gmail.send; Google's sensitive-scope review, up to 100 listed testers meanwhile): swipe right sends or schedules from her Gmail, spaced 10–15 a day in IST business hours. Rule: nothing is sent without her explicit swipe, send or schedule. LinkedIn never automated.
4. **Price:** free preview (strategy snapshot, deck cover + 2 slides, top 3 with pitches) → **Raise Kit ₹24,999** (3 revisions included) → add-ons (deck and story review call +₹10–15k, done-with-you sprint +₹25k, warm-intro help +₹5k) → credits (₹2,500 for 10).
5. **Test-and-fly slice (15 Oct, final; ~4 build days, non-stop):** **Built 16 Oct on dev (awaiting your check):** /build (reading your website with live findings and brand, optional PDF upload, Confirm your facts with one-tap suggestions, real build progress, reveal with plan, deck, teaser and top 5) → Google sign-in → /app (Outreach cards with swipe and list, Raise plan, Deck with 3 of 9 slides open, Teaser with page 1 open, Q&A / Market / Data room as SOON with samples, Profile as a pitch-room preview over a moving scene, Request full access with the friends-test questions, shown on /admin). Top 5 instead of 3. Classic flow saved as tag v1-classic. Not yet: PDF/PowerPoint download, payments, the real pitch room.
   Original plan: the real flow from /kit to "I want to pay", with the full kit locked.
   - **Entry:** /kit "Get started" (no pop-up). Links carry their own code (`?code=META1`), applied automatically and tracked per channel; no invite wall from ads.
   - **Step 1, Reading your website:** live findings, Relay-style (what you do, who it's for, numbers found, logo, colours, fonts). Fallback: pick your colour.
   - **Step 2, Enrich (optional, encouraged):** upload an existing pitch deck (PDF), founder CV or LinkedIn's "Save to PDF", any one-pager; or answer quick fields instead. We read them once to pull out team, traction, product, customers and partners, use of funds.
   - **Step 3, Confirm your facts:** one screen, pre-filled from the site and uploads, every field editable, missing ones marked. Only confirmed facts go into the kit (her numbers, never invented).
   - **Step 4, Building your kit:** progress.
   - **Step 5, The reveal:** raise plan (real counts, order), her deck in her brand (cover + 2 slides open, rest blurred), teaser preview, top 3 investors as swipe cards with her personalised pitch (swipe right → Gmail).
   - **Step 6, Get founding access:** plan (Raise Kit / + Advisors / Done for you), when she's raising, name, email, phone (optional). Shown on /admin. Payment by hand for now.
   - Sign-in: wow first; Google sign-in at "Get founding access" (and to keep her kit).
   - Uploads: PDF only, ≤15 MB, private (her list's token), sent to Claude only to read facts, deleted on request; Privacy updated.
   - /admin funnel: kit started → enriched → facts confirmed → reveal seen → access requested, per channel code.
   - Build order: Day 1 entry + code-in-link + website reading + brand; Day 2 uploads + facts screen; Day 3 deck content (checked) on the sample layouts in her brand + teaser; Day 4 reveal + access form + /admin + privacy + quality check on 5 real startups, then deploy.
6. **Next week:** Connect Gmail (send, schedule; review submitted), competition and market research with sources, investor Q&A, editable PowerPoint, payments; then the tracking and readiness milestones below fold into this.
Needs from Anurag: deck and teaser templates.

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

- **Friends-test feedback, Apurv (16 Oct; would pay ₹15–25k, wants Raise Kit + Advisors + DFY, raising in 3–6 months):** (1) generated deck "looks like AI slop" (second time after UD) → deck design overhaul with real templates; (2) "partner connections matter more than cold decks" → warm intros up the list, track whether pitches land calls; (3) humanise investors: background, what they care about, how they like to be pitched, recent posts; (4) investor interview prep (Q&A tab); (5) readiness verdict: raise now or push for traction (built 16 Oct as Deck review); (6) global investors (later); (7) "analysed connect & review": ask him what he meant; (8) "better for very early stage": say so on the page. Interest chips on the dashboard count what others want.
- **SalesRobot partnership (parked 16 Oct, after the friends test and first ads):** pilot with 15 founders (FirstCheq targeting and kit, SalesRobot delivery), then API integration with replies back via webhooks, two-way revenue share (their affiliate: 40% first month, 20% to month 12), bundle in Advisors/DFY, joint DFY outreach, intro videos for the pitch room. One-pager: docs/sell/SALESROBOT_PITCH.md (private). Decide our LinkedIn-automation stance first (AGENTS.md: never automate LinkedIn). Order: test → ads → numbers → partnerships (leverage).
- **AI cost at scale (parked 17 Oct, revisit when sign-ups grow):** today about $0.55 a founder, market research (~$0.35) the biggest part. Options then: run research only when she opens Market, share a sector's recent rounds across founders for a week, log tokens from every search round, and test Perplexity Sonar for research side by side on 3 real companies. Keep pitches and the deck on Sonnet; no open-source models.
- **Warm connects (parked 17 Oct, next after deck themes):** founder (and co-founders) upload their own LinkedIn connections export (Settings → Get a copy of your data → Connections); we match connections against investor partners (from fund team pages) and founders of investors' portfolio companies, and show "who can introduce you" with a short intro request. Read once, keep only matches, delete the file. Never scrape LinkedIn or use tools that harvest employees' networks; 1st-degree only.
- **Pitch room (idea, 15 Oct; candidate for v1.5, before v2):** each founder gets firstcheq.ai/p/<startup>, the home for her kit (deck, teaser, data room). Every pitch carries a link unique to that investor, so she sees who opened it, how long they spent on each slide, and whether it was forwarded, with no email gate for the investor. One-tap "Interested" / "Pass (one reason)" for investors. "Opened twice" feeds the follow-up timing. Path: founder tools → pitch rooms (every email shows investors firstcheq.ai) → investor accounts → marketplace. Rules: noindex, private by default, she can expire links; tell investors views are shared with the founder; never charge per intro or per meeting (SEBI). Test first: does the link hurt deliverability or reply rate vs no link (A/B in the first 2 weeks)? Needs words in DESIGN.md (e.g. "Pitch room"). Note: OpenVC already offers free per-investor deck links and slide analytics, so analytics alone isn't our edge; the edge is India data + a pitch per investor + the kit. "Actively raising" badge: opt-in, auto-expires after 90 days, shown only inside her room or to signed-in investors later, never a public listing. Filter email-scanner bot opens (count a view only after JS loads plus a few seconds on the page).
- **Warm intros (candidate, from the GrowthX feedback 14 Oct):** "top VCs don't fund cold emails; intros matter". If the pain question or the mandates point here: "Ask for an intro": who in her network could introduce her (she checks LinkedIn mutuals herself; we never read LinkedIn) + a short forwardable blurb for the connector. Never paid-per-intro (seen as pay-to-pitch; arranging investment for a fee is SEBI territory).
- US version for first-time founders: only after India traction (e.g. founders sending 5+ emails, investor reply rate, week-2 return). Then a cheap demand test first: a US landing page and waitlist with about $300–500 of ads. If intent is strong, build a narrow version (one or two sectors) so the US investor list stays small enough to research well. (US investor lists are a commodity; US ad clicks cost several times more; the app is India-shaped: ₹, Indian stages, Indian investors.) Notes 15 Oct: price test $100–500 per kit; target first-time, non-YC pre-seed founders and Indian-origin founders raising from US investors (our India edge carries over); YC founders are the weakest target (Bookface, Demo Day, strong networks); no scraped YC-directory cold email (terms and reputation risk), use ads and communities; the kit itself is market-agnostic, only the investor data, currency and stages change.
- "Raising again?": help for a founder's next round (Series A investors, warm intros, data room, metrics prep). v2, after the first-round product is proven; same account and pipeline.
- **Next version of LinkedIn notes:** one click to send on LinkedIn, like Open in Gmail (LinkedIn has no prefilled-note link, so this needs a browser extension or LinkedIn's API; still never sent without her press), plus a follow-up DM once they accept. Now: profile link (or search) + the note to copy.
- More comparison pages (vs ChatGPT, vs buying an investor list) and one page per sector ("Investors for Indian climate startups"), counts and made-up examples only, never real investor names. First one live: /compare/fundraising-consultant.
- A real testimonial on the landing page, once a founder agrees (never a made-up one).
- ~~hello@ and anurag@ inboxes~~ **Done 14 Oct**: ImprovMX forwarding to Gmail (MX mx1/mx2.improvmx.com, root SPF include:spf.improvmx.com); Resend records untouched. Optional: Gmail "Send mail as" through smtp.resend.com.
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
