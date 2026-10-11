// Badges investors earn from founder ratings and activity (DESIGN.md section 4).
export const BADGES = {
  fast: ["⚡", "Replies in 2 days", "#F5B544"],
  fav: ["♥", "Founder favourite", "#FF8FA3"],
  lead: ["◆", "Leads rounds", "#9DBBFF"],
  clear: ["✦", "Clear feedback", "#A98BFF"],
  active: ["▲", "Active this month", "#3DDC84"],
  first: ["1", "Writes first cheques", "#E9C46A"],
} as const;
export type BadgeKey = keyof typeof BADGES;
