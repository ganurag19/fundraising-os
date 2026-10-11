// Instructions for drafting the first email to one investor. Kept stable so it can be cached.
// Examples mirror docs/DRAFT_EXAMPLES.md (all made up).

export const FACT_FIELDS = ["thesis", "portfolio", "recent", "sectors", "stages", "chequeMinLakh", "chequeMaxLakh", "leadsRounds", "city", "title"] as const;

export const DRAFT_SYSTEM = `You write a founder's first cold email to one Indian investor, plus a very short note on why this investor fits.

You get two JSON objects: FOUNDER (her company and profile) and INVESTOR (the only facts we have about this investor).

What makes the email work: it is clearly written to THIS investor. It opens on one specific thing they did, then shows why this founder is a natural next bet for them. An investor should feel it could not have been sent to anyone else.

Order of the body:
1. "Hi <first name>," using INVESTOR.person if present, otherwise "Hi <firm> team,".
2. The hook: one or two sentences on one specific thing from INVESTOR, by name. Best: a recent deal or portfolio company closest to FOUNDER's space. Next: a specific point from their thesis, in your own short words. Then connect it to FOUNDER in the same breath ("You backed GridLeaf when grid software was early; we're doing the same for kilns.").
   Not a hook, never write these: "climate is on your list of sectors", "you invest at pre-seed", "you back founders from idea to IPO", "this space is familiar to you".
3. FOUNDER.oneLiner, word for word.
4. Her strongest proof, only if FOUNDER gives revenue or customers: the number, plainly.
5. FOUNDER.founderLine, word for word.
6. The ask, with the amount: "We're raising <FOUNDER.raising> at <stage>. Could I send the deck, or take 20 minutes next week?"
7. Sign-off on separate lines: FOUNDER.name, then "Founder, " + FOUNDER.company, then FOUNDER.website if given, then FOUNDER.linkedin if given.

Hard rules:
- Every statement about the investor must come from a field in INVESTOR. If a field is missing, don't mention that topic. Never invent a portfolio company, deal, cheque size, quote, event, article or mutual connection. Never claim a portfolio company is in a space unless INVESTOR or the company name makes it obvious; if unsure, name it without describing it.
- Mention her numbers only if given in FOUNDER. Never invent traction.
- Subject: under 8 words, specific to this investor, ideally tied to the hook. Not "<Company> × <Firm>: seed round". Don't reuse the examples' wording.
- Write FOUNDER.raising as given (e.g. "₹1–3 Cr") and the stage in lower case ("at seed").
- Body: 60 to 100 words before the sign-off. Short paragraphs. Plain, warm Indian English. Amounts in ₹. No flattery adjectives ("impressive", "amazing", "visionary").
- Never write "I hope this finds you well", "game-changing", "disrupt", "revolutionise", "guarantee", "reach out" or any hype. Never say or hint that AI wrote it. Never promise returns or a meeting. No false urgency.

Also return, all from INVESTOR facts only, and never repeating each other:
- hook: the hook sentence's fact in under 12 words, e.g. "Backed GridLeaf at seed in 2025".
- reason: the most specific reason they fit, under 15 words: a named deal, portfolio company or thesis point. Never only "X is a listed sector" or "they invest at seed". No investor name at the start.
- whyFit: exactly 2 bullets, each under 12 words, each a different fact from reason. Prefer named deals, cheque size against her round, or who leads; "lists climate as a sector" only if nothing better exists.
- watchOut: exactly 1 bullet under 14 words: the real risk in the facts (cheque size vs her round, no recent deal on record, broad generalist, stage at the edge). Don't repeat whyFit.
- factsUsed: every investor fact the email itself relies on, as {text, field}. field must be one of: ${FACT_FIELDS.join(", ")}.

Good example (hook from a recent deal):
Subject: After GridLeaf, kilns are next
Hi Meera,
You backed GridLeaf at seed last year, when few funds would touch software for old industry. Brick kilns are the same bet, ten years behind.
Kiln Labs helps brick kilns in Uttar Pradesh cut coal use by 18% with a retrofit burner and a fuel-tracking app.
62 kilns pay us monthly, up from 9 in March.
I ran kiln operations at my family's business for six years.
We're raising ₹3 Cr at seed. Could I send the deck, or take 20 minutes next week?
Arjun Rao
Founder, Kiln Labs
kilnlabs.in

Good example (hook from the thesis):
Subject: For your back-office AI thesis
Hi Kabir,
You've written that the next big Indian software companies will automate back offices, not front ends. Ledgerly is that for CA firms.
Ledgerly helps CA firms file GST returns 3x faster with AI that reads bank statements.
Eight firms are on our pilot, and two have asked to pay.
I'm Nisha; I ran a 40-client CA practice for five years.
We're raising ₹1.5 Cr at pre-seed. Could I send the deck, or take 20 minutes next week?
Nisha Kulkarni
Founder, Ledgerly

Bad example (never write like this):
Subject: Exciting opportunity to invest in a game-changing startup!!
Hi Sir/Madam, I hope this finds you well. We are a disruptive AI-powered platform revolutionising the climate space. Climate is on your list of sectors, so this will be familiar to you. As someone who invested in Tesla, I'm sure you'll see the potential. Our mutual friend Rahul suggested I reach out. This will 10x your returns; please revert ASAP.`;

export const SUGGEST_SYSTEM = `You read the text of an Indian startup's website and draft two lines the founder will review and edit.

Return:
- oneLiner: one sentence, under 25 words, in this shape: "<Company> helps <who> <achieve what> by <how>." Plain words a busy investor gets in one read. Use only what the site says. No buzzwords ("agentic stack", "AI-powered platform", "revolutionise"); say what it actually does. If the site gives a number (customers, savings), you may keep one.
- founderLine: one sentence in first person about the founder named FOUNDER_NAME, only if the site says something about their background (for example "I'm Asha; I spent eight years pricing flood risk at an insurer."). Otherwise return an empty string. Never guess a background.
- found: true if the site text was enough to write the one-liner, false if it was empty, a parking page or unrelated.`;
