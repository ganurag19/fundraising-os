# DESIGN.md

> Built from `product-thinking/06`, `07`, `08`. Sections 1, 2 and 6 are the parts only you can write: my drafts are marked **[guess, review]**. Sections 3, 4, 5 come from chapters 2 and 3. Nothing is left blank.
> Rule for the agent: if a choice isn't covered here, ask instead of guessing.

## 1. The feeling, in labels

- Investor row: six fixed slots in the same order (name, geography, cheque size, stages, fit reason, action), one coloured button at the right, so a founder can scan 20 investors in seconds **[guess, review]**
- Fit reason: one grey line under each investor name saying why they match, so she can check the AI's work without opening anything **[guess, review]**
- Primary button: the only filled, coloured element on the screen, so the thumb knows where to go **[guess, review]**
- Email draft: plain white card, large readable body, editable in place, so it feels like her own Gmail and not a new tool **[guess, review]**
- Error and empty states: one plain sentence and two exits, never a blank page or a code **[guess, review]**

## 2. References, one per component

- **Investor list / row:** `references/openvc-investor-list.jpg`
  Take: the fixed six-slot row, the count in the header, the "last updated" line, one coloured action button per row whose label depends on the investor.
  Ignore: the map, the dark promo banner between rows, the chat bubble, numbered stage chips.
- **Error state:** Visible.vc 404 page (visible.vc/404, screenshot to add in `references/visible-404.jpg`)
  Take: plain words saying what happened, two exits ("Back to website", "Log into Visible").
  Ignore: dark theme, outlined serif "404".
- **Primary and secondary buttons:** Visible.vc home (screenshot to add in `references/visible-home.jpg`)
  Take: two levels, one filled and one outlined.
  Ignore: green, the two-audience cards.
- **Email draft card:** to find: a Gmail compose window or Superhuman screenshot, by hand. **[yours to do: no reference chosen yet]**
  Take: compose box with subject and body, nothing else on the page.
  Ignore: toolbar, attachments, formatting row.
- **Tracker row with status chip:** to find: a CRM pipeline or Linear list, searched with a label ("status chips in a list, one line per row") on Mobbin or Pinterest. **[yours to do]**
- **Empty state:** to find on Mobbin ("empty state, first action"). **[yours to do]**

Keep references in one direction; screenshot each one with its label written beside it.

## 3. Type and colour

- Font: Inter, one typeface **[guess, review]**
- Sizes: display 40 for the headline (one per screen), heading 20, body 16. No other sizes without asking.
- Text: #1A1A1A on #FAF8F5 (muted #5C5C5C for fit reasons and dates; cards #FFFFFF)
- Accent: #B4451F, only on the main action. Red #B3261E only for errors.
- Space: 8, 16, 24, 40. Radius 12 on cards and buttons, nothing else rounded.
- Contrast of every text and button pair at least 4.5:1 (checked by calculation).
- Tokens: define each value once in code as a named token and use only the names, never raw values.

## 4. Screens

Flow: Start -> Results -> Draft -> Tracker, plus a Save your list sheet. Full wireflow with error exits: `product-thinking/07-screens-and-states.md`. Phone first, check at 360 px and laptop.

### Start
- For: a founder opening the link for the first time, on her phone, at night
- Top to bottom: one line on what this does; four fields (company, sector, stage, ask size); data line; one button
- Main action: Find my investors -> Results
- Empty, first visit: this is the screen; fields empty with hints
- Empty, coming back: skip to Tracker if a list exists
- Loading: button says "Finding...", fields lock
- Error: sector has no match: "We don't have investors for [sector] yet. These three are closest." Exits: pick one, or Edit my details
- Done: hands off to Results
- If the AI answer is wrong: n/a, no AI output here

### Results
- For: a founder who wants proof it understood her
- Top to bottom: header with company, count and "Investor list updated 5 Oct"; 20 cards with name, fit reason, cheque size, stage, Write email
- Main action: Write email on the top card -> Draft
- Empty, first visit / coming back: not reachable
- Loading: progress bar with honest steps, her details stay on screen
- Error: after 15 seconds, "This is taking longer than it should. Your details are saved." Exits: Try again, Edit my details
- Done: 20 cards, or fewer with "Only 12 fit. We'd rather show 12 right ones than pad the list."
- If the AI answer is wrong: Not a fit removes the card; the fit reason shows why it was picked

### Draft
- For: a founder deciding whether to send this in her name
- Top to bottom: investor name and fit reason; editable email card (subject, body); sources line for any claim; buttons
- Main action: Open in Gmail -> Gmail; she sends there. Then Mark as sent. Secondary: Copy email
- Empty, first visit: never empty
- Empty, coming back: shows the sent email read-only, plus the follow-up if due
- Loading: "Writing to [Investor]..." then a single fade-in of the draft
- Error: Gmail won't open: "Gmail wouldn't open this one. Your email is copied, paste it into a new message." Exits: Copy again, Back to list
- Done: "Marked as sent to [Investor]. Next: [Investor 2]." Main action Write next email
- If the AI answer is wrong: edit in place; unsourced claims highlighted "Check this"; Rewrite this line; Skip this investor

### Tracker
- For: a founder coming back on a second day
- Top to bottom: "3 follow-ups due"; Due group on top with follow-ups already written; the rest grouped by status
- Main action: Send follow-up on the first due row -> Draft
- Empty, first visit: not reachable
- Empty, coming back: "Nothing sent yet. Your first email is one tap away." Button Open Results
- Loading: grey placeholder rows in the same shape
- Error: "We couldn't load your list. It's saved, try again." Exits: Try again, Back to Start
- Done: "You're up to date. Next check: [date]."
- If the AI answer is wrong: status chips changeable in one tap; replied stops follow-ups
- Status changes are optimistic; AI steps never are

### Save your list (sheet)
- For: a founder who just marked her first email sent
- Top to bottom: "Save your list so it's here tomorrow."; one field; one button
- Main action: Save my list -> Tracker
- Loading: "Saving..." Error: "Couldn't save. Your list is still on this screen." Exits: Try again, Not now. Done: closes to Tracker

## 5. The first screen's words (written by me, not the AI)

Placeholders from me; rewrite them in your own words after the interviews. **[guess, review]**
- Headline: Your next 20 investors, with emails ready.
- Under it: Enter your company and round. We match investors who fit and write the first email. You edit it and send from your own Gmail.
- Button: Find my investors

## 6. Principles (kept, not tactics)

**[guess, review]** each, from the work so far; add one on the day you make a correction.
- One filled coloured button per screen, and it is the main action.
- Every AI claim about an investor shows where it came from, or is marked "check this".
- Nothing is sent, and nothing leaves her control, without her pressing send.
- Every error says what happened in plain words and offers two ways forward.
- Optimistic about saving her data, honest about the AI: she sees the wait.
- Words on buttons say what happens next, never "Get started" or "Submit".
- Works first on a phone at 360 px; the laptop is the same screen, wider.
- Added on day _: (fill in each time you correct the agent)

## The correction loop (daily)

Reference -> hand over (image plus your words) -> build one component -> label what's off -> add a principle to section 6 only if it holds on every screen -> next screen. One-off fixes stay out of this file.

## Add to AGENTS.md

```
Before building or changing any screen, read DESIGN.md and follow it. If a choice isn't covered here, ask me instead of guessing.
```

If the project also has CLAUDE.md, its first line is `@AGENTS.md`.

## Send to Shaktimaan

```
Shaktimaan, here's my DESIGN.md for Build Sprint. Check it the way the Design
thinking pages on the dashboard teach: labels instead of vague words, one
reference per component with what to take and what to ignore, one font, a few
sizes and the colours, every screen with its empty, loading, error and done
states, first-screen words that say the outcome, and principles that hold on
every screen. Tell me the weakest part first and make me rewrite it. Don't write
it for me.
```
