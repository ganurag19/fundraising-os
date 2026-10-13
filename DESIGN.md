# DESIGN.md

> **Locked: v4, 12 Oct 2026.** The reference is `references/prototypes/demo-v4-dark.html` (also at https://claude.ai/artifact/QTPxFwD3SKpCeE2FAaj9pM). When this file and the prototype disagree, this file wins; ask before guessing.
> Rule for the agent: if a choice isn't covered here, ask instead of guessing.

## 1. The feeling

- Calm and in control at 11 PM: one clear next move on every screen, never a wall of options.
- Proof before trust: every investor shows why, with a source and a date.
- Premium and dark, like GrowthX; big confident type, like Apple; one italic serif word for emotion, like Boketto.
- Hero emotion: **"The best-prepared founders don't wing their raise. Neither should you."**

## 2. Colour and type (tokens; use the names, never raw values)

| Token | Value | Use |
|---|---|---|
| `--bg` / `--bg2` | #050507 / #0B0B0E | Page / side panels |
| `--card` / `--card2` | #111115 / #17171C | Cards / hover, selected |
| `--line` / `--line2` | #24242B / #33333C | Borders |
| `--fg` / `--fg2` / `--muted` | #F4F4F6 / #B6B6C0 / #83838F | Text levels |
| `--blue` | #3D7BFF | The one main action per screen; active states |
| `--blue-ink` / `--blue-soft` | #9DBBFF / blue at 14% | Links, highlight on dark |
| `--gold` | #E9C46A | **Top picks only** (cards, medals, "Pick of the week") |
| `--green` / `--amber` / `--red` | #3DDC84 / #F5B544 / #FF6B6B | Done, due or "check this", error or conflict |
| Logo mark | conic blue → #7B5CFF | Logo only |

- Dark only. No light theme in v1.
- Fonts: **Inter Tight** for headings, **Inter** for body, **Instrument Serif italic** for one emphasised phrase per heading, **JetBrains Mono** for small labels and kickers.
- Sizes: display 40–88 (landing hero only), page title 30, card heading 15–22, body 15, small 12–13.
- Radius: 14 on cards, 22 on big panels, pill on buttons and chips. Spacing steps 8 / 16 / 24 / 40.
- Contrast: body text at least 4.5:1 on its background.

## 3. Words (plain English for Indian first-time founders)

Use these words, never the ones on the right.

| Say | Never |
|---|---|
| Investors for you | Matches, deal flow |
| FirstCheq Fit Score (short: Fit Score) | Match score, rating algorithm |
| Full research | Dossier |
| What they invest in | Thesis (founder side) |
| Who can reach you | Door policy |
| Confirmed by investor / Checked by our team / Researched | Claimed, vetted |
| Founders who want to talk to investors | Startups raising, deals, listings |
| Ask for a conversation | Request deck & intro, invest |
| I sent it | Mark as sent |
| Apply (opens the programme's or fund's own form) | Submit application |
| I applied | Mark as applied |
| Closes 12 Nov | Deadline, due date |

Buttons say what happens next ("Open email", "Send follow-up"), never "Submit" or "Get started". Errors say what happened and offer two ways forward.

## 4. Components

- **Fit Score dial:** a 0–100 ring. Gold at 85 and above, blue at 70–84, grey below 70.
- **Top pick card (gold):** a face or logo, name, rating, badges, the dial and a 1–2 line reason. Then "Why they fit" (4 bullets), "Watch out" (2), and "What to say" (in Full research). Sources line with the check date. Top picks only.
- **Compact top-pick row (Today):** medal, face or logo, name, cheque, one-line reason, rating, badges, a small dial, and Email / Why buttons.
- **Badges** (earned): ⚡ Replies in 2 days · ♥ Founder favourite · ◆ Leads rounds · ✦ Clear feedback · ▲ Active this month · 1 Writes first cheques. At most 3 on a card.
- **Medals:** gold, silver and bronze for ranks 1–3 in leaderboards and top picks.
- **Verification ladder:** ◌ Researched → ◐ Checked by our team → ● Confirmed by investor.
- **Faces and logos:** fund logo from the fund's own site. People show their own photo only once they confirm their profile; until then, initials or an illustrated face. Never photos taken from LinkedIn.
- **Email panel:** To, Subject, Body (editable). Lines from her profile are highlighted blue; unsourced claims get an amber "check this". Word count. Buttons: Open in Gmail (main), Copy, I sent it.
- **Email / LinkedIn note switch** above each email. The LinkedIn note: "LinkedIn note to {person}", the note, a character count out of 300. Buttons: Open LinkedIn (when we have their profile link) or Find on LinkedIn (a LinkedIn search she opens), and Copy note. Help line: "tap Connect, then Add a note, and paste." Old emails without a note show "Write LinkedIn note".
- **Pipeline row:** face or logo, the next action and why, a status tag, a due chip (red for today, amber for later), one action button, and "Status ▾".
- **"Coming soon" tag:** small mono "SOON" label; the button is shown but does nothing except a toast.

## 5. Screens

**Landing.** A founder/investor toggle. Hero: **"First round? Send your first investor email *in 10 minutes.*"** (hook A from the Hook lab; B and C stay as tests). Then:
- the 3 steps with honest times (2, 3 and 5 minutes) and a live preview of step 2
- 6 pain cards, in founders' own words
- the hero-emotion band
- the first two weeks with real times
- "Not a generic list. Tailored to you."
- "They will ask these. Are you ready?"
- competition preview, picks of the week with medals and badges
- built for India, coming soon, FAQ, final call to action

**Founder sign-up (7 steps, with a "time left" chip).** Startup name → your name → sector (AI, Climate, Deeptech open; others "soon") → stage and raise → website and LinkedIn (we read the website once to draft her one-liner) → "A few words about you" (rough notes: what the company does, about you, vision, revenue, customers) → "How you'll come across" (polished founder line, one-liner and traction; she edits; used word for word). Then the matching screen ("Written in N seconds"), then the reveal.

**Reveal ("3 investors to email today"), before sign-in.** One line: "Picked from N that fit {company}." Three gold cards: logo, name, person · city · website ↗, rank, dial, a one-line reason, a gold "Why they fit you +" button (2 reasons, 1 watch-out, sources), then the email in this order: hook → who she is → what the company does → traction → the ask. Buttons: Open in Gmail (blue), a copy icon, "I sent it". Below: "N more investors fit {company}" with blurred rows (score and city only; names and emails never leave the server), a ✓ list of what she gets (investors ranked, how many backed a startup recently, how many lead), "See all of them" (Google), and "Coming to your dashboard" cards tagged SOON.

**Dashboard (after sign-in).** "Your investors." Stats: fit, emails ready, sent. Top picks (gold rows), then "Next best" with Write email, then "Coming soon" cards.

**Founder app.** The sidebar, in order, and what each screen does:
- **Today:** do-this-next card, compact top picks, today's list with time per task, round so far, Q&A readiness, news, data room score
- **Investors for you:** gold top picks, then tabs: All, Founder-friendly, Funds, Angels, Backed a competitor
- **Pipeline:** stage counters, then Your move / Waiting on them / Meetings / Closed
- **Inbox:** Gmail, investor emails only, with a suggested reply
- **Competition:** summary, table, feature comparison, positioning map with the gap, strengths and weak spots, who funds the space, your angles, your answer, news
- **Investor Q&A:** 10 groups, answers drafted from her profile, locked ones say what's missing, 2-minute pitch, call prep
- **Data room:** checklist with Add buttons, readiness score, who opened it, create buttons (soon), living data room (soon)
- **Profile:** company one-liner builder, founders (with LinkedIn), numbers that unlock answers, company details, "let investors find you"
- **Coming soon:** Templates, Learning, Blog

Bottom left: watch-demo card, Gmail status, and the avatar menu (Settings, Integrations, Chat, Log out). A "Chat with us" button floats on every app screen.

**Settings.** Founder tabs:
- account
- email and signature (one-liner and founder line on by default)
- writing style
- integrations: Gmail and Google Calendar now; Drive, Notion, Slack, WhatsApp, LinkedIn and CRMs "soon"
- notifications
- usage
- privacy and data (download, delete)
- help and chat

Investors get account, **team members**, who can reach you, integrations, notifications, privacy and help.

**Investor side.** Join in 3 steps: work email → "Is this still what you invest in?" (pre-filled) → who can reach you, plus inviting the team. App screens:
- Founders for you (conversation requests, round details hidden)
- Saved
- This week
- Your reviews
- Your profile

## 6. States (every screen)

Empty: one sentence plus the next action. Loading: grey shapes of the real layout, and honest steps for AI work ("Checking 611 investors…"). Error: plain words and two ways forward. Done: say what happened and what's next ("I sent it" → "First follow-up on day 3").

## 7. Principles

- **Less is more.** Every word earns its place: no repeats, no filler, nothing the founder already knows. If a line could be cut and she'd lose nothing, cut it.
- One blue button per screen, and it's the main action.
- Gold means "top pick". Nothing else is gold.
- Every claim about an investor shows its source, or is marked "check this".
- Nothing is sent without her pressing send in Gmail.
- Plain words over clever ones (section 3).
- Dark by default, with a light mode in Settings (same token names, so blue and gold stay on-brand).
- Phone first at 360–390 px; laptop is the same screens, wider; the sidebar becomes a bottom tab bar on phones.
- We're a research and outreach service, not a marketplace: no public "raising" listings, and round details are shared only when the founder accepts.
- Optimistic about saving her data, honest about the AI: she sees the wait.
