"""Build the research queue for enrichment from seed/investors.json.

Selects records that are India based, have a listed email, and are tagged
AI, Climate, Deeptech or sector agnostic. Groups them by firm so each firm's
website is researched once (angels without a firm are their own unit).

Writes seed/enrichment/queue.json, ordered: AI, Climate, Deeptech, then agnostic.
Run: python3 scripts/build_enrichment_queue.py
"""

import json
import os
import re
from urllib.parse import urlparse

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "seed", "investors.json")
OUT_DIR = os.path.join(ROOT, "seed", "enrichment")
OUT = os.path.join(OUT_DIR, "queue.json")

FOCUS = ["ai", "climate", "deeptech"]
PERSONAL_DOMAINS = {"gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "yahoo.co.in", "rediffmail.com", "icloud.com"}


def domain(url):
    if not url:
        return None
    u = url if url.startswith("http") else "http://" + url
    d = urlparse(u).netloc.lower().removeprefix("www.")
    return d or None


def unit_key(r):
    if r["firm"]:
        d = domain(r["website"])
        return "firm:" + (d or re.sub(r"[^a-z0-9]", "", r["firm"].lower()))
    return "person:" + r["id"]


def priority(sectors):
    for i, s in enumerate(FOCUS):
        if s in sectors:
            return i
    return len(FOCUS)


def main():
    records = json.load(open(SRC, encoding="utf-8"))["investors"]
    picked = [r for r in records
              if r["india_based"] and r["email_status"] == "listed"
              and (set(FOCUS) & set(r["sectors"]) or "sector_agnostic" in r["sectors"])]

    units = {}
    for r in picked:
        k = unit_key(r)
        u = units.setdefault(k, {
            "key": k, "kind": r["kind"], "firm": r["firm"], "person_name": None,
            "website": None, "linkedin_url": None, "city": r["city"],
            "known_sectors": [], "known_stages": [], "known_portfolio": [],
            "record_ids": [], "priority": 9,
        })
        u["record_ids"].append(r["id"])
        if not r["firm"]:
            u["person_name"] = r["person_name"]
            u["linkedin_url"] = r["linkedin_url"]
        site = r["website"]
        # an angel's "website" is often their employer, not their investing; keep it as a hint only
        if site and not u["website"] and domain(site) not in PERSONAL_DOMAINS:
            u["website"] = site
        for f, src in (("known_sectors", "sectors"), ("known_stages", "stages"), ("known_portfolio", "portfolio")):
            for x in r[src]:
                if x not in u[f]:
                    u[f].append(x)
        u["priority"] = min(u["priority"], priority(r["sectors"]))

    # firms before solo angels within each sector group: firm sites yield far more
    queue = sorted(units.values(), key=lambda u: (u["priority"], u["firm"] is None, u["firm"] or u["person_name"] or ""))
    for i, u in enumerate(queue, start=1):
        u["n"] = i
        u["slug"] = re.sub(r"[^a-z0-9]+", "-", (u["firm"] or u["person_name"] or u["key"]).lower()).strip("-")[:60] + f"-{i:03d}"

    os.makedirs(os.path.join(OUT_DIR, "results"), exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(queue, f, ensure_ascii=False, indent=2)

    by_p = {}
    for u in queue:
        by_p[u["priority"]] = by_p.get(u["priority"], 0) + 1
    names = FOCUS + ["sector_agnostic"]
    print(f"records selected: {len(picked)}")
    print(f"research units:   {len(queue)}  (firms: {sum(1 for u in queue if u['firm'])}, solo angels: {sum(1 for u in queue if not u['firm'])})")
    for p, c in sorted(by_p.items()):
        print(f"  {names[p]:16} {c}")
    print(f"Wrote {OUT}")


if __name__ == "__main__":
    main()
