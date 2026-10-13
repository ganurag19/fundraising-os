"""Add newly discovered investors to the research queue, skipping ones we already have.

Reads   seed/discovered/*.jsonl            (one candidate per line; files starting with _ are skipped)
        seed/investors_enriched.json       (everything we already have, old and new)
        seed/enrichment/queue_growth.json  (new investors already queued)
Writes  seed/enrichment/queue_growth.json  (new research units, appended; existing ones kept as they are)
        seed/enrichment/deals.json         (deals naming investors we already have, for merge_enrichment.py)
        seed/discovered/_dedupe_report.md  (every match, so a wrong one can be caught by eye)

Candidate line (docs/DATA_PIPELINE.md has the full shape):
  {"kind": "vc", "firm": "Example Ventures", "person_name": null, "website": "https://example.vc",
   "city": "Bengaluru", "sectors_hint": ["climate"], "found_via": "sebi_aif",
   "source_url": "https://...", "deal": null, "note": null}

Safe to re-run: a candidate already queued or already in the list is never added twice.
Run: python3 scripts/add_candidates.py
"""

import glob
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from pipeline_common import (KINDS, SECTORS, candidate_key, load_json, matcher_for_records,  # noqa: E402
                             read_jsonl, save_json, slugify, stable_id)


def problems(c):
    out = []
    if c.get("kind") not in KINDS:
        out.append(f"unknown kind {c.get('kind')!r}")
    if not (c.get("firm") or c.get("person_name")):
        out.append("no firm or person name")
    if not c.get("source_url"):
        out.append("no source_url")
    deal = c.get("deal")
    if deal and not (deal.get("company") and deal.get("source_url")):
        out.append("deal without company or source_url")
    return out


def deal_row(ref, deal, found_via):
    return {"record_id": ref, "company": deal["company"], "year": deal.get("year"), "round": deal.get("round"),
            "sector": deal.get("sector") if deal.get("sector") in SECTORS else None,
            "source_url": deal["source_url"], "found_via": found_via}


def run(seed):
    enr = os.path.join(seed, "enrichment")
    data = load_json(os.path.join(seed, "investors_enriched.json"), {"investors": []})
    records = data["investors"]
    queue_path = os.path.join(enr, "queue_growth.json")
    queue = load_json(queue_path, [])
    deals_path = os.path.join(enr, "deals.json")
    deals = load_json(deals_path, [])
    seen_deals = {(d["record_id"], d["company"].lower()) for d in deals}

    m = matcher_for_records(records)
    by_id = {r["id"]: r for r in records}
    units = {u["id"]: u for u in queue}
    for u in queue:
        m.add(("unit", u["id"]), u.get("firm"), u.get("person_name"), u.get("website"))

    files = sorted(p for p in glob.glob(os.path.join(seed, "discovered", "*.jsonl"))
                   if not os.path.basename(p).startswith("_"))
    added, matched, rejected, new_deals = [], [], [], 0
    for path in files:
        rows, bad = read_jsonl(path)
        rejected += bad
        for c in rows:
            p = problems(c)
            if p:
                rejected.append(f"{os.path.basename(path)}: {c.get('firm') or c.get('person_name')}: {', '.join(p)}")
                continue
            name = c.get("firm") or c.get("person_name")
            ref, how = m.find(c.get("firm"), c.get("person_name"), c.get("website"))
            found = {"found_via": c.get("found_via"), "source_url": c["source_url"]}
            if ref and ref[0] == "record":
                rec = by_id[ref[1]]
                matched.append((name, rec.get("firm") or rec.get("person_name"), how, os.path.basename(path)))
                if c.get("deal") and (ref[1], c["deal"]["company"].lower()) not in seen_deals:
                    deals.append(deal_row(ref[1], c["deal"], c.get("found_via")))
                    seen_deals.add((ref[1], c["deal"]["company"].lower()))
                    new_deals += 1
                continue
            if ref:  # already queued as a new investor: keep the extra sighting and deal
                u = units[ref[1]]
                if found not in u["discovered"]:
                    u["discovered"].append(found)
                if c.get("deal") and c["deal"]["company"].lower() not in {d["company"].lower() for d in u["seed_deals"]}:
                    u["seed_deals"].append(c["deal"])
                continue
            key = candidate_key(c)
            uid = stable_id(key)
            u = {
                "id": uid, "key": key, "origin": "growth", "kind": c["kind"],
                "firm": c.get("firm"), "person_name": c.get("person_name") if not c.get("firm") else None,
                "website": c.get("website"), "linkedin_url": None, "city": c.get("city"),
                "known_sectors": [s for s in c.get("sectors_hint") or [] if s in SECTORS],
                "known_stages": [], "known_portfolio": [],
                "record_ids": [uid], "discovered": [found],
                "seed_deals": [c["deal"]] if c.get("deal") else [],
                "note": c.get("note"), "added_from": os.path.basename(path),
            }
            u["slug"] = "g-" + slugify(name) + "-" + uid[2:6]
            units[uid] = u
            queue.append(u)
            m.add(("unit", uid), u["firm"], u["person_name"], u["website"])
            added.append(u)

    for i, u in enumerate(queue, start=1):
        u["n"] = i
    save_json(queue_path, queue)
    save_json(deals_path, deals)

    lines = ["# Dedupe report", "",
             f"Files read: {', '.join(os.path.basename(p) for p in files) or 'none'}",
             f"New investors queued: {len(added)}", f"Matched to investors we already have: {len(matched)}",
             f"Deals added for investors we already have: {new_deals}", f"Rejected lines: {len(rejected)}", "",
             "## Matches (check these: a wrong match hides a new investor)", ""]
    lines += [f"- {a} → {b} (by {how}, {f})" for a, b, how, f in matched] or ["- none"]
    lines += ["", "## Rejected", ""] + ([f"- {r}" for r in rejected] or ["- none"])
    os.makedirs(os.path.join(seed, "discovered"), exist_ok=True)
    with open(os.path.join(seed, "discovered", "_dedupe_report.md"), "w", encoding="utf-8") as f:
        f.write("\n".join(lines) + "\n")
    return {"added": len(added), "matched": len(matched), "deals": new_deals, "rejected": len(rejected),
            "queued_total": len(queue)}


if __name__ == "__main__":
    from pipeline_common import SEED
    s = run(SEED)
    print(f"new investors queued: {s['added']}   already had: {s['matched']}   "
          f"deals for known investors: {s['deals']}   rejected lines: {s['rejected']}")
    print(f"growth queue now {s['queued_total']} units → seed/enrichment/queue_growth.json")
    print("Read seed/discovered/_dedupe_report.md for the matches.")
