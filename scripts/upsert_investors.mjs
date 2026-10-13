// Safe investor import (updates in place by seedId; never deletes), for dev or prod.
//   node scripts/upsert_investors.mjs seed/investors_import_v2.jsonl          # dev
//   node scripts/upsert_investors.mjs seed/investors_import_v2.jsonl --prod   # live
// Use this instead of `npx convex import --replace` on prod: --replace gives every investor a new id
// and breaks founders' existing lists.
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

const [file, ...flags] = process.argv.slice(2);
if (!file) { console.error("Usage: node scripts/upsert_investors.mjs <file.jsonl> [--prod]"); process.exit(1); }
const rows = readFileSync(file, "utf8").split("\n").filter((l) => l.trim()).map((l) => JSON.parse(l));
const BATCH = 50;
const total = { inserted: 0, updated: 0, skipped: 0 };
for (let i = 0; i < rows.length; i += BATCH) {
  const out = execFileSync("npx", ["convex", "run", ...flags, "investors:upsertMany", JSON.stringify({ rows: rows.slice(i, i + BATCH) })], { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
  const r = JSON.parse(out.slice(out.indexOf("{")));
  for (const k of Object.keys(total)) total[k] += r[k];
  process.stdout.write(`\r${Math.min(i + BATCH, rows.length)} of ${rows.length}`);
}
console.log(`\nDone: ${total.inserted} new, ${total.updated} updated, ${total.skipped} skipped (no email or apply link).`);
