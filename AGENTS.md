# AGENTS.md

> Keep this file under 200 lines. Design is locked to v4 (DESIGN.md); scope and order are in PLAN.md.

Before building or changing any screen, read DESIGN.md and follow it. If a choice isn't covered here, ask me instead of guessing.

## 1. How the product works

Interface: a responsive web app, phone first, same screens on a laptop, dark theme from DESIGN.md. India only: Indian founders, investors who back Indian startups, amounts in ₹. The one thing a founder does there: enter company, sector, stage and ask size, then read, edit and send emails to investors that fit.
Business logic: Convex functions. A match function filters and scores the seeded investors in code (match score 0–100), then asks the AI to write the reason, "why they fit" and "watch out" bullets for the top 3 picks and one reason for the rest, using only stored facts. A draft function writes the emails for her top 3 picks right after matching, and one more each time she taps "Write email". It uses only the facts stored for that investor and her profile, and always includes her company one-liner and founder line. A follow-up function writes a nudge when one is due: 3 days after sent, then 7 days after that. Status changes (sent, replied, meeting, passed) are plain database updates.
Database: the investors (fields in docs/SEED_FORMAT.md: name, firm, email and email status, city, sectors, stages, cheque size, portfolio, thesis, sources, source date, last checked date); each founder's profile (name, company, website, LinkedIn, the one-liner parts: helps X achieve Y through Z reducing A, B, C; a line about each founder; revenue and customers); each founder's search and list; every draft and its edits; a status per investor; a log of every AI call; a step log with step name and time only, no names or emails.
Third party: the Claude API (key in Convex environment variables). Gmail only as a prefilled compose link the founder opens herself. Google sign-in right after the reveal screen.
Not in v1: everything PLAN.md puts in v1.5, v2 or Parked, including the investor side, Gmail API, Q&A, competition, data room, chat, integrations, ratings and payments.
When I report a bug, I'll name the part. Look there first, and tell me if you think I named the wrong one.

## 2. How we work

- Read IDEA_SCOPE.md, PRODUCT.md, PLAN.md and PROGRESS.md before anything else, and DESIGN.md before any screen work.
- Before writing code, tell me in two or three sentences what you think I'm after, then your plan. Wait for my yes. Don't guess.
- One milestone at a time: the next one in PLAN.md, working end to end. Nothing outside it.
- If I ask for something new mid-milestone, add it to the parked list in PLAN.md and carry on.
- Never say "done" until you've seen it work (a test, or screenshots at 360 px, 390 px and laptop width) and told me how to check it on my phone.
- When I report a bug, find the cause before changing anything. Fix only that.
- When we add something new, write tests so what already works doesn't break. When I drop a feature, drop its tests.
- Build and test only on the web: phone width first, then laptop.
- After I confirm a milestone works: commit, push, and add one line to PROGRESS.md.
- Never put a key or password in code, in a VITE_ variable (those are sent to every visitor) or in a committed file.
- Every claim about an investor in a draft must come from that investor's stored record. If a field is missing, leave the claim out.
- Nothing is ever sent for the founder. An email leaves only when she presses send in Gmail.
- Use made-up founders and investors in tests and examples.
- If an investor has no listed email, never build one from a pattern. Show the pattern or the pitch form and let her decide.
- Use the words in DESIGN.md section 3. If a new screen needs a word that isn't there, ask.

## 3. Shipping

Live link: [your .convex.site link]
Repo: github.com/ganurag19/fundraising-os, public
Deploy: npm run deploy. A push never deploys by itself. After I say a milestone works: commit, push, then deploy.
Keys: ANTHROPIC_API_KEY lives in Convex environment variables, set for dev (a separate dev key with a $5 limit) and for prod. Never in code, a VITE_ variable or a committed file. Never ask me to paste a key. .gitignore covers .env.local and the whole seed/ folder.
The investor seed lives in seed/ (raw files in seed/raw, cleaned seed/investors.json built by scripts/clean_investors.py). It stays out of the repo and is imported into Convex by a script I run, for dev and for prod. A scheduled refresh is parked; to update, I replace a raw file and re-run the two scripts.
Real people's data (names, emails, company details, drafts) never goes in the repo, not even as a test file.
Every limit and every "is this allowed" check happens in a Convex function. A founder's list is read only with her own long random token, checked in every query and mutation.
Before I share the link: I open it on my phone, logged out, on mobile data, and tell you what happened.

## 4. The AI call

Model: Claude Haiku 4.5 for matching and follow-ups; Claude Sonnet 5.5 for each founder's first three drafts. Thinking: low or off.
What goes in, and its limit: the founder's four fields and profile (length-limited) and only the filtered shortlist of investor records, never the whole list; at most 20 records per call.
Where it runs: a Convex action. Never in the interface.
Key: ANTHROPIC_API_KEY in Convex environment variables, dev and prod.
Reply cap: max_tokens 1500 (match), 700 (draft), 400 (follow-up).
Calls cap: at most 40 AI calls an hour across the app and 3 runs per visitor a day, checked in the kitchen (Convex rate limiter). A visitor is a long random token made on first visit and kept in her browser.
Provider limit: a hard monthly limit of $25, set by me in the Claude Console.
When a cap is hit or the call fails: show "Busy right now. Try again in a few minutes." and keep her details on screen.
Login: none for the 4 sign-up steps and matching; Google or email sign-in on the reveal screen, before she reads her first email. Her visitor token's matches move to her account.
The AI must never: state a fact about an investor (portfolio company, cheque size, thesis, geography) that isn't in the stored record; say an AI wrote the email; promise a meeting or an outcome; invent a mutual connection; send anything.
Voice rules: subject under 8 words, body under 120 words, no "I hope this finds you well", "game-changing" or "disrupt". Two good examples and one bad one go in the draft instructions: docs/DRAFT_EXAMPLES.md.
Log every AI call (input, output, time, and what the founder changed it to) in a table.
