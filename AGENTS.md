# AGENTS.md

> Draft assembled from `tech-thinking/09` to `12` and the DESIGN.md line. Lines marked **[guess, review]** are my best guesses for you to confirm or rewrite. Keep this file under 200 lines. Brackets in square brackets with a value are placeholders you decide.

Before building or changing any screen, read DESIGN.md and follow it. If a choice isn't covered here, ask me instead of guessing.

## 1. How the product works

Interface: a responsive web page, phone first, same screens on a laptop. India only: Indian founders, investors who back Indian startups, amounts in ₹. The one thing a founder does there: enter company, sector, stage and ask size, then read, edit and send emails to investors that fit.
Business logic: Convex functions. A match function filters the seeded investors in code, then asks the AI to rank the best 20 and give one reason each. A draft function writes one email when she taps "Write email" on an investor, using only the facts stored for that investor and her own profile. A follow-up function writes a nudge when one is due: 3 days after sent, then 7 days after that. Status changes (sent, replied, meeting, passed) are plain database updates.
Database: the investors (fields in docs/SEED_FORMAT.md: name, firm, email and email status, city, sectors, stages, cheque size, portfolio, thesis, sources, source date, last checked date); each founder's profile (name, one line on her background, company website, one line on what the company does), asked once before her first draft; each founder's search and list; every draft and its edits; a status per investor; a log of every AI call; a step log with step name and time only, no names or emails.
Third party: the Claude API (key in Convex environment variables). Gmail only as a prefilled compose link the founder opens herself. Google sign-in later, at "Save your list".
Not in v1: Gmail API sending or reading replies, LinkedIn, WhatsApp, deck upload, login before first value, payments, investor-side accounts.
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
- [a rule of your own: anything you've had to say twice]

## 3. Shipping

Live link: [your .convex.site link]
Repo: [github.com/you/your-repo], public
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
Login: none until "Save your list" (after her first email is marked sent); then Google sign-in, which moves her token's list to her account.
The AI must never: state a fact about an investor (portfolio company, cheque size, thesis, geography) that isn't in the stored record; say an AI wrote the email; promise a meeting or an outcome; invent a mutual connection; send anything.
Voice rules: subject under 8 words, body under 120 words, no "I hope this finds you well", "game-changing" or "disrupt". Two good examples and one bad one go in the draft instructions: docs/DRAFT_EXAMPLES.md.
Log every AI call (input, output, time, and what the founder changed it to) in a table.
