// The plans, shared by the /kit page and the kit dashboard. No prices while founding access is by request.

export type Plan = { key: string; name: string; icon: string; line: string; tag: string; badge?: string; rec?: boolean; groups: [string, string[]][]; best: string; cta: string };
export const PLANS: Plan[] = [
  { key: "preview", name: "Preview", icon: "◔", line: "See your kit before you decide", tag: "Free", cta: "Get started, free", best: "Seeing if FirstCheq fits you",
    groups: [["Game plan", ["Who to approach first, and in what order"]], ["Fundraising kit", ["The first 3 slides of your deck and page 1 of your teaser, in your brand"]], ["Investor picks and outreach", ["Your 5 best-fit investors, researched", "A personal pitch to each, ready to swipe"]]] },
  { key: "raise_kit", name: "Raise Kit", icon: "◆", line: "Everything you need to raise, start to close", tag: "Founding access", badge: "Most founders", rec: true, cta: "Get founding access", best: "Founders ready to raise in the next 3 months",
    groups: [["Fundraising kit, in your brand", ["An investor-ready deck (PowerPoint, Google Slides, PDF)", "A two-page teaser to attach", "The 20 questions investors ask, answers drafted", "Your market and competition, with sources", "Data room checklist and templates"]], ["Investor picks and research", ["Every active investor who fits (up to 100), ranked, with the reason"]], ["Personalised outreach", ["A pitch, LinkedIn note and intro blurb for each", "Swipe to send, or schedule, from your Gmail", "Follow-ups written for day 3 and day 10"]], ["Your pitch profile", ["One private link for your deck and kit", "See who opened it, which slides, and who asked to meet", "You approve who gets in"]], ["Support", ["3 rounds of revisions"]]] },
  { key: "raise_kit_advisors", name: "Raise Kit + Advisors", icon: "✦", line: "A circle of founders who've raised, in your corner", tag: "Founding access", badge: "For a faster round", cta: "Request access", best: "Founders who want people who've done it, and warm doors",
    groups: [["Everything in Raise Kit, plus", ["Calls with founders who closed their first round: what worked, what to skip", "Your deck and story pressure-tested before you send", "Mock investor Q&A before your first meetings", "Warm connects through the circle's networks, when you're ready"]], ["Support", ["Priority help while you raise"]]] },
];
export const COMPARE: [string, string, string, string, string][] = [
  ["Raise plan and sequence", "✓", "✓", "✓", "✓"],
  ["Deck and teaser in your brand", "3 slides", "✓", "✓", "✓"],
  ["Investor Q&A, market, competition", "–", "✓", "✓", "✓"],
  ["Investors who fit, with reasons", "Top 5", "Up to 100", "Up to 100", "Up to 100"],
  ["Personal pitches and follow-ups", "5", "✓", "✓", "✓"],
  ["Swipe to send from Gmail", "5", "✓", "✓", "✓"],
  ["Private pitch room, with who opened what", "Beta", "✓", "✓", "✓"],
  ["Calls with founders who've raised", "–", "–", "✓", "✓"],
  ["Warm connects", "–", "–", "✓", "✓"],
  ["Outreach run with you, day to day", "–", "–", "–", "✓"],
  ["Meeting prep and term-sheet support", "–", "–", "Q&A prep", "✓"],
];

