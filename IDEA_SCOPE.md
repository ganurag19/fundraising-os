# IDEA_SCOPE.md · Build Sprint 02

**Status:** DRAFT, not yet sent to Shaktimaan. Lines below are Anurag's own words, unedited. Lines with no answer from him are marked MISSING. Flags to resolve before sending are listed after the sheet.

---

IDEA LOCK · Build Sprint 02

**The idea, in one line:**
An AI-native fundraising OS for early-stage Indian founders raising their first round — covering investor readiness, outreach, and relationship management through agents that work across their inbox, WhatsApp, LinkedIn, and Drive.

**Why me (at least 1 of 3: an audience that trusts me, years inside the workflow, data nobody else has):**
4–5 years on the investment side at IFC World Bank, evaluating and funding early-stage ventures across India and emerging markets. Built two fundraising infrastructure businesses from scratch, delivering results for founders and organisations across India, UK, and the US. An active network of early-stage founders who trust this work. Deep inside the exact workflow this product automates — from both sides of the table.

## GOAL

**The one goal they hire it for (money, time, status or life):**
Money — close the first round faster, without hiring a fundraising resource or burning 6 months chasing the wrong investors with no system.

**Delta 4 (the steps today → the steps with my product):**
Today — 9 steps:

1. Google which investors are active in their sector
2. Ask founder friends for warm intros (hit or miss)
3. Build a tracker manually in Notion or Sheets
4. Research each investor individually
5. Write cold emails from scratch, one by one
6. Send outreach, track responses manually
7. Follow up whenever they remember
8. Prep deck, FAQ, DD folder when an investor asks
9. Draft investor updates and Q&A responses ad hoc under pressure

With the product — 3 steps:

1. Input company, sector, stage, ask size
2. Agent surfaces matched investors, drafts personalised outreach, and runs the follow-up cadence automatically
3. Founder shows up to meetings, responds to Q&A, and closes

**The sin it rides (optional):**
Greed — unlock the capital, close the round. Pride — show up to every investor conversation looking more prepared than any founder they've met that week.

## USER

**The trigger (when the pain hits):**
Two moments. First: the founder decides to raise but has no system, no deep enough warm network, and no time to build the pipeline while running the company. Second: the cash runway is shrinking — 3–4 months left — and there is no qualified pipeline, no outreach in motion, and no process to move fast enough.

**Today's path, step by step (including not solving it at all):**
Investor research done manually or via expensive paywalled platforms. Cold emails written from scratch with no sequence. Follow-ups missed because there is no cadence. DD folder assembled last-minute when an investor asks. Update emails drafted under pressure. Conversations go warm then go cold. 3–6 months pass on the wrong investors with nothing to show.

**Who they trust on this decision:**
Founders who have raised recently. VCs they know personally. Incubators and accelerator programme leads — especially government-backed ones (Startup India, IIT/IIM incubators) and private ones (GrowthX, YC India, Antler, 100X.VC). Fundraising consultants and advisors. In-house teams at well-networked companies who have done this before.

**Would they pay? (what exists today that people pay for):**
Founders already pay fundraising advisors ₹50,000–2,00,000/month for this done by humans. They pay for Tracxn and Venture Intelligence for investor data. They pay for pitch coaching and DD prep. The product replaces all three at a fraction of the cost with 10x the speed.

## PRODUCT

**Onboarding (how a first-time user feels the value fastest):**
Founder inputs company name, sector, stage, and ask size. Agent immediately returns a ranked list of 20 matched Indian investors with fit rationale, a ready-to-send cold email for the top 3, and a pre-built tracker. First value before they've had time to doubt whether it works.

**The core loop (user stories, written by me):**

*Investor Readiness*
When I'm preparing to raise, I want a pitch narrative, FAQ document, and DD folder structure generated from my inputs, so I can walk into any investor conversation looking prepared and credible.

*Investor Outreach*
When I'm ready to reach out, I want the agent to identify the right investors for my stage and sector, draft personalised cold emails and follow-up sequences, and send them through my own inbox — so I'm running a disciplined outreach campaign without doing the research or the writing myself.

*Relationship Management*
When a conversation goes warm, I want the agent to draft my investor update emails, respond to Q&A with sourced answers, and flag when a conversation has gone cold — so I never lose a deal to slow follow-through.

**Coming back (optional):**
Weekly — the agent surfaces new investors to add to the pipeline, drafts the monthly investor update, and flags warm conversations that need a nudge. The tracker is always live. The founder never has to remember to follow up.

**The AI-first part (onboarding, engagement or the core loop):**
AI is the core of every layer, not a feature on top. Investor matching runs on structured data plus AI scoring. Outreach drafts are personalised by agent to each investor's thesis and portfolio. Follow-up sequencing is triggered automatically. DD Q&A is answered by an agent trained on the founder's own documents. Remove the AI and the product does not exist.

*Access layer:* Inbox (Gmail / Outlook), LinkedIn, WhatsApp / chat, Google Drive for DD materials and trackers.

*Back-end repository:* Live Indian investor tracker — active VCs, angels, and syndicates with recent deployment signals, thesis updates, and portfolio moves. Startup funding tracker — recent Indian rounds by sector and stage, used to surface comparable raises and social proof for outreach personalisation.

## MARKET

**Tailwinds (where funding is going, what Google Trends shows, timing):**
India is the world's third-largest startup ecosystem. Total DPIIT-recognised startups crossed 2.23 lakh as of March 2026, with a record 55,200 new startups recognised in FY26 alone — the highest in a single year since Startup India launched in 2016. The total startup count grew 24% from 157,066 in 2024 to 194,854 in 2025, with incubators growing from 1,277 to 1,375 — a 7.7% increase. Indian startups raised $5.2 billion across 501 deals in H1 2026, with deal volume up 7% year-on-year — reflecting a selective but active funding environment, not a slowdown. [Centre Recognises Record 55,200 Startups In FY26 +2](https://inc42.com/buzz/centre-recognises-record-55200-startups-in-fy26/)

The gap the numbers reveal: 2.23 lakh recognised startups, 501 deals in half a year — meaning the overwhelming majority of founders never reach a funded round. The infrastructure to get from "decided to raise" to "first meeting booked" does not exist for most of them. That is the market.

AI-native tooling is replacing human advisory in every adjacent category. The founder population is growing faster than the support infrastructure. Government schemes — Fund of Funds for Startups, Startup India Seed Fund Scheme, Credit Guarantee Scheme — are pushing more capital into early-stage, creating more founders who need to raise but have no system to do it. GrowthX alone has 500+ active builders. The IIT / IIM / IFC network is a direct warm pipeline of founders at exactly this stage. [inc42](https://inc42.com/buzz/centre-recognises-record-55200-startups-in-fy26/)

**Competitors (and the flows I liked, with screenshots and why):**
Tracxn / Venture Intelligence — investor data only, no outreach, no workflow, paywalled and expensive. Built for funds, not founders.
LetsVenture / AngelList India — platform for discovery, not an active outreach and relationship OS. Passive listing, not agent-driven execution.
Fundraising advisors / consultants — human, expensive, slow, relationship-dependent. No system, no agents, no compounding.
ChatGPT — founders already use it for one-off tasks. No investor data, no memory, no pipeline, no sequencing. Generic, not built for this workflow.
The gap: no product combines real-time Indian investor data + AI-drafted personalised outreach + pipeline management + relationship cadence in one agent-driven loop. That intersection is unoccupied.

Flows I liked, with screenshots and why: **MISSING** (the teardown is yours to do)

**Size and fit (how many people in my extended network fit):**
India-first. The immediate addressable market is early-stage founders raising seed to pre-Series A — ₹50L to ₹10Cr. Tens of thousands of such founders active at any given time. The warm validation network — IIT Delhi, FMS, IFC, Enactus, GrowthX — is 200–300 people reachable by WhatsApp this week. That is the first cohort and the first distribution channel.

How many of those 200–300 are raising now or soon (and how many in your close circle, flag if under 10): **MISSING**

---

Shaktimaan, this is what I have thought about user, product and market. Lock it in.

---

## Flags to resolve before sending (Claude's review, not part of the lock)

Full evidence and sources are in `Idea_Lock_Review.docx` / `.pdf`. Each item needs your answer in your own words.

1. **"A product I already run" rule.** You run a fundraising consultancy (ImpactVerse). Say why this is a brand-new product, not that business in software form, or it is out under the kickoff rules. Also confirm it is not mainly an internal tool for your own practice.
2. **Three modules = a bundle.** Readiness, Outreach and Relationship are three products. The kickoff says one goal and v1 features that stack on it. Pick the single module that is v1 (your call, written by you).
3. **Kill rule 4 risk.** "Live Indian investor tracker" is a data-collection project. State what you will seed by hand for v1 and what you will not claim.
4. **Market numbers need fixing** (see review): H1 2026 funding is down 9% YoY on Inc42, not "not a slowdown"; the 157,066 to 194,854 and 1,277 to 1,375 figures could not be verified; GrowthX "500+" and the ₹50,000–2,00,000/month advisor fee are unverified.
5. **"Paywalled" is not fully true.** OpenVC is a free directory listing 1,676 India-based investors. Rewrite the competitor gap around execution, not data access.
6. **Three failure modes** (milestone-01 checklist): not on your sheet. MISSING.
7. **Authorship check.** Confirm the three user stories are in your words; if the other thread wrote them, rewrite them yourself.
8. **Build reality:** LinkedIn and WhatsApp agents are out of v1 realistically; Gmail send needs OAuth verification and reading replies needs a security assessment. Decide what the founder actually does in step 3 on Sunday.
