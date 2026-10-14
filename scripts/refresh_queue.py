"""Build a re-check batch: investors in the app whose last check is older than --months (default 6).

Never-checked records come first, then the oldest. Firms are one unit (one website, all their people).
Reads   seed/investors_enriched.json
Writes  seed/enrichment/queue_refresh_<date>.json  (researched like any unit; merge_enrichment.py applies it)

The monthly "recent deals" pass needs no queue: it writes seed/discovered/deals_<YYYY-MM>.jsonl and
add_candidates.py routes each deal to the investor we already have (docs/DATA_PIPELINE.md).

With --sectors, only investors tagged with one of those sectors (or sector_agnostic) are queued, and
the thinnest come first: no thesis, then no sector-tagged deal.

Run: python3 scripts/refresh_queue.py [--months 6] [--limit 50] [--sectors fintech,b2b_saas]
"""

import argparse
import datetime
import glob
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


def thin(r):
    """0 = no thesis, 1 = thesis but no sector-tagged deal, 2 = has both."""
    if not r.get("thesis"):
        return 0
    return 1 if not any(d.get("sector") for d in r.get("recent_investments") or []) else 2


def unconfirmed_since(seed, today, days):
    """Angels whose identity a refresh couldn't confirm in the last `days` days: searching again so soon fails again."""
    if not days:
        return set()
    since = (today - datetime.timedelta(days=days)).isoformat()
    ids = set()
    for p in glob.glob(os.path.join(seed, "enrichment", "queue_refresh_*.json")):
        for u in load_json(p, []):
            res = load_json(os.path.join(seed, "enrichment", "results", u["slug"] + ".json"), {})
            if res.get("identity_confirmed") is False and (res.get("checked_on") or "") >= since:
                ids.update(u["record_ids"])
    return ids


def run(seed, months=6, limit=None, today=None, sectors=None, skip_unconfirmed_days=30):
    today = today or datetime.date.today()
    cutoff = months_ago(today, months)
    records = load_json(os.path.join(seed, "investors_enriched.json"))["investors"]
    due = [r for r in records if in_app(r) and (r.get("last_checked") or "") < cutoff
           and r["id"] not in unconfirmed_since(seed, today, skip_unconfirmed_days)]
    if sectors:
        due = [r for r in due if set(sectors + ["sector_agnostic"]) & set(r.get("sectors") or [])]

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
            "last_checked": r.get("last_checked"), "thin": thin(r),
        })
        u["record_ids"].append(r["id"])
        for f, src in (("known_sectors", "sectors"), ("known_stages", "stages"), ("known_portfolio", "portfolio")):
            for x in r.get(src) or []:
                if x not in u[f]:
                    u[f].append(x)
        u["thin"] = min(u["thin"], thin(r))
        if (r.get("last_checked") or "") < (u["last_checked"] or ""):
            u["last_checked"] = r.get("last_checked")

    queue = sorted(units.values(), key=lambda u: ((u["thin"] if sectors else 0), u["last_checked"] is not None, u["last_checked"] or "",
                                                 u["firm"] is None, u["firm"] or u["person_name"] or ""))
    if limit:
        queue = queue[:limit]
    # a second batch on the same day gets its own file and slugs, so earlier results still find their unit
    tag, n = today.isoformat(), 0
    while os.path.exists(os.path.join(seed, "enrichment", f"queue_refresh_{tag}.json")):
        n += 1
        tag = today.isoformat() + "abcdefghij"[n - 1]
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
    ap.add_argument("--sectors", help="comma-separated sector keys, e.g. fintech,b2b_saas,consumer,health")
    a = ap.parse_args()
    s = run(SEED, a.months, a.limit, sectors=a.sectors.split(",") if a.sectors else None)
    print(f"records last checked before {s['cutoff']} (or never): {s['due_records']}")
    print(f"units in this batch: {s['units']} (never checked: {s['never_checked']}) → {os.path.relpath(s['path'])}")
