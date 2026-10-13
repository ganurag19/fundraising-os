"""Build a re-check batch: investors in the app whose last check is older than --months (default 6).

Never-checked records come first, then the oldest. Firms are one unit (one website, all their people).
Reads   seed/investors_enriched.json
Writes  seed/enrichment/queue_refresh_<date>.json  (researched like any unit; merge_enrichment.py applies it)

The monthly "recent deals" pass needs no queue: it writes seed/discovered/deals_<YYYY-MM>.jsonl and
add_candidates.py routes each deal to the investor we already have (docs/DATA_PIPELINE.md).

Run: python3 scripts/refresh_queue.py [--months 6] [--limit 50]
"""

import argparse
import datetime
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from pipeline_common import SHARED_DOMAINS, domain, load_json, norm_firm, save_json, slugify  # noqa: E402


def months_ago(today, months):
    y, m = today.year, today.month - months
    while m <= 0:
        y, m = y - 1, m + 12
    return datetime.date(y, m, min(today.day, 28)).isoformat()


def in_app(r):
    return r.get("india_based") and r.get("email_status") == "listed" and not r.get("exclude") and not r.get("import_blocked")


def run(seed, months=6, limit=None, today=None):
    today = today or datetime.date.today()
    cutoff = months_ago(today, months)
    records = load_json(os.path.join(seed, "investors_enriched.json"))["investors"]
    due = [r for r in records if in_app(r) and (r.get("last_checked") or "") < cutoff]

    units = {}
    for r in due:
        d = domain(r.get("website"))
        if r.get("firm"):
            key = "firm:" + (d if d and d not in SHARED_DOMAINS else norm_firm(r["firm"]) or slugify(r["firm"]))
        else:
            key = "person:" + r["id"]
        u = units.setdefault(key, {
            "key": key, "origin": "refresh", "kind": r["kind"], "firm": r.get("firm"),
            "person_name": None if r.get("firm") else r.get("person_name"),
            "website": r.get("website"), "linkedin_url": None, "city": r.get("city"),
            "known_sectors": [], "known_stages": [], "known_portfolio": [], "record_ids": [],
            "last_checked": r.get("last_checked"),
        })
        u["record_ids"].append(r["id"])
        for f, src in (("known_sectors", "sectors"), ("known_stages", "stages"), ("known_portfolio", "portfolio")):
            for x in r.get(src) or []:
                if x not in u[f]:
                    u[f].append(x)
        if (r.get("last_checked") or "") < (u["last_checked"] or ""):
            u["last_checked"] = r.get("last_checked")

    queue = sorted(units.values(), key=lambda u: (u["last_checked"] is not None, u["last_checked"] or "",
                                                 u["firm"] is None, u["firm"] or u["person_name"] or ""))
    if limit:
        queue = queue[:limit]
    tag = today.isoformat()
    for i, u in enumerate(queue, start=1):
        u["n"] = i
        u["slug"] = f"r{tag.replace('-', '')}-" + slugify(u["firm"] or u["person_name"] or u["key"]) + f"-{i:03d}"
    out = os.path.join(seed, "enrichment", f"queue_refresh_{tag}.json")
    save_json(out, queue)
    return {"due_records": len(due), "units": len(queue), "never_checked": sum(1 for u in queue if not u["last_checked"]),
            "cutoff": cutoff, "path": out}


if __name__ == "__main__":
    from pipeline_common import SEED
    ap = argparse.ArgumentParser()
    ap.add_argument("--months", type=int, default=6)
    ap.add_argument("--limit", type=int)
    a = ap.parse_args()
    s = run(SEED, a.months, a.limit)
    print(f"records last checked before {s['cutoff']} (or never): {s['due_records']}")
    print(f"units in this batch: {s['units']} (never checked: {s['never_checked']}) → {os.path.relpath(s['path'])}")
