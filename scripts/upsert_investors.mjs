// Safe investor import (updates in place by seedId; never deletes), for dev or prod.
//   node scripts/upsert_investors.mjs seed/investors_import_v2.jsonl          # dev
//   node scripts/upsert_investors.mjs seed/investors_import_v2.jsonl --prod   # live
// Use this instead of `npx convex import --replace` on prod: --replace gives every investor a new id
// and breaks founders' existing lists.
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

const [file, ...flags] = process.argv.slice(2);
if (!file) { console.error("Usage: node scripts/upsert_investors.mjs <file.jsonl> [--prod]"); process.exit(1); }
const lines = readFileSync(file, "utf8").split("\n").filter((l) => l.trim()).map((l) => JSON.parse(l));
// {"seedId": "...", "retired": true} lines retire an investor (hidden from new matches, kept on existing lists).
const retire = lines.filter((l) => l.retired === true && Object.keys(l).length === 2).map((l) => l.seedId);
const rows = lines.filter((l) => !(l.retired === true && Object.keys(l).length === 2));
const BATCH = 50;
const total = { inserted: 0, updated: 0, skipped: 0 };
// Run one Convex function; on failure print only Convex's error line, never the rows (they hold real emails).
function run(fn, args) {
  try {
    return execFileSync("npx", ["convex", "run", ...flags, fn, JSON.stringify(args)], { encoding: "utf8", maxBuffer: 16 * 1024 * 1024, stdio: ["ignore", "pipe", "pipe"] });
  } catch (e) {
    const msg = String(e.stderr || e.message).split("\n").find((l) => /error|could not|failed/i.test(l)) ?? "unknown error";
    console.error(`\n${fn} failed: ${msg.trim()}\nNothing after this batch was written. If the function is missing, deploy first (npx convex deploy), then run this again; it's safe to repeat.`);
    process.exit(1);
  }
}
for (let i = 0; i < rows.length; i += BATCH) {
  const out = run("investors:upsertMany", { rows: rows.slice(i, i + BATCH) });
  const r = JSON.parse(out.slice(out.indexOf("{")));
  for (const k of Object.keys(total)) total[k] += r[k];
  process.stdout.write(`\r${Math.min(i + BATCH, rows.length)} of ${rows.length}`);
}
let retiredNote = "";
if (retire.length) {
  const out = run("investors:retireMany", { seedIds: retire });
  const r = JSON.parse(out.slice(out.indexOf("{")));
  retiredNote = `, ${r.retired} retired${r.missing ? ` (${r.missing} not found)` : ""}`;
}
console.log(`\nDone: ${total.inserted} new, ${total.updated} updated, ${total.skipped} skipped (no email or apply link)${retiredNote}.`);
