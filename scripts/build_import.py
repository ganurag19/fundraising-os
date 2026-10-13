"""Turn seed/investors_enriched.json into seed/investors_import.jsonl for Convex.

Keeps only investors we can show: India based, not excluded, and (for investors added by the
growth pipeline) passing check_records.py.

  --schema 1 (default, today's app): a listed email is required; grants are left out.
  --schema 2 (after the app change in docs/PROPOSAL_EVIDENCE_AND_APPLY.md): an email or an apply
             link; adds applyUrl / applyDeadline / applyType, and a sector on up to 10 recent deals.
             Every investor exported before and missing now gets a line {"seedId": ..., "retired": true},
             so the safe import hides it from new matches (seed/enrichment/exported_ids.json remembers them).

Before writing, every seedId is compared with what it was last exported as. If an id now names a
different investor (the spreadsheet ids inv_0001... shift when a raw file changes), nothing is
written: an in-place import would put one investor's facts on another's record.
The output stays in seed/ (gitignored). Load it with:

  node scripts/upsert_investors.mjs seed/investors_import_v2.jsonl          # dev
  node scripts/upsert_investors.mjs seed/investors_import_v2.jsonl --prod   # live (Anurag only)

Never `convex import --replace` on prod: it gives every investor a new id and breaks founders' lists.

Run: python3 scripts/build_import.py [--schema 2]
"""

import argparse
import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from check_records import apply_url  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "seed", "investors_enriched.json")
REGISTRY = os.path.join(ROOT, "seed", "enrichment", "exported_ids.json")
OUT = os.path.join(ROOT, "seed", "investors_import.jsonl")
# the app's Funds tab knows vc and corporate_vc; a family office invests like a corporate arm
IMPORT_KIND = {"family_office": "corporate_vc"}


def clean_list(xs, limit):
    out = []
    for x in xs or []:
        x = (x or "").strip()
        if x and x.lower() not in {o.lower() for o in out}:
            out.append(x)
    return out[:limit]


def identity_clashes(registry, rows):
    """An id names the same investor if its name or its email is unchanged."""
    out = []
    norm = lambda x: re.sub(r"[^a-z0-9]", "", (x or "").lower())
    for d in rows:
        old = registry.get(d["seedId"])
        if old and norm(old["name"]) != norm(d["displayName"]) and (old.get("email") or "") != (d.get("email") or ""):
            out.append(f"{d['seedId']}: was {old['name']}, now {d['displayName']}")
    return out


def main(schema=1):
    data = json.load(open(SRC, encoding="utf-8"))
    rows = []
    for r in data["investors"]:
        has_email = r.get("email_status") == "listed" and bool(r.get("email"))
        if r.get("origin") == "growth" and (r.get("checks") or {}).get("email", {}).get("result") != "pass":
            has_email = False  # a new investor's email goes out only once it was seen on its page
        link = apply_url(r) if schema >= 2 and (r.get("checks") or {}).get("apply", {}).get("result") == "pass" else None
        if not r.get("india_based") or r.get("exclude") or r.get("import_blocked"):
            continue
        if not (has_email or link):
            continue
        if schema < 2 and r["kind"] == "grant":
            continue
        firm = r.get("firm")
        if firm:  # "Venture Catalysts++ | India's 1st Multi-Stage VC" -> "Venture Catalysts++"
            firm = re.split(r"\s[|–—-]\s|\s\(", firm)[0].strip()
        person = r.get("person_name")
        doc = {
            "seedId": r["id"],
            "kind": IMPORT_KIND.get(r["kind"], r["kind"]),
            "displayName": firm or person,
            "sectors": r.get("sectors") or [],
            "stages": r.get("stages") or [],
            "portfolio": clean_list(r.get("portfolio"), 15),
            "recent": [
                {k: v for k, v in {"company": x.get("company"), "year": x.get("year"), "round": x.get("round"),
                                   "sector": x.get("sector") if schema >= 2 else None}.items() if v is not None}
                for x in (r.get("recent_investments") or [])[:(10 if schema >= 2 else 3)] if x.get("company")
            ],
            "sourceUrls": clean_list([s.get("url") for s in (r.get("enrichment") or {}).get("sources", [])], 6),
            "sourceDate": r.get("source_date"),
        }
        app = r.get("application") or {}
        optional = {
            "email": r["email"] if has_email else None,
            "applyUrl": link, "applyDeadline": app.get("deadline") if link else None,
            "applyType": app.get("type") if link and app.get("url") == link else ("form" if link else None),
            "person": person, "firm": firm, "title": r.get("title"), "city": r.get("city"),
            "website": r.get("website"), "thesis": r.get("thesis"),
            "chequeMinLakh": r.get("cheque_min_inr_lakh"), "chequeMaxLakh": r.get("cheque_max_inr_lakh"),
            "leadsRounds": r.get("leads_rounds"), "active": r.get("active"),
            "pitchRoute": ((r.get("pitch_route") or {}).get("value") if (r.get("pitch_route") or {}).get("type") not in (None, "unknown") else None),
            "lastChecked": r.get("last_checked"),
        }
        doc.update({k: v for k, v in optional.items() if v not in (None, "")})
        rows.append(doc)

    registry = json.load(open(REGISTRY, encoding="utf-8")) if os.path.exists(REGISTRY) else {}
    clashes = identity_clashes(registry, rows)
    if clashes:
        print("STOPPED: these ids now name a different investor, so an in-place import would mix them up:")
        for c in clashes[:20]:
            print("  " + c)
        print("Ids from clean_investors.py shifted (a raw file changed?). Nothing written.")
        sys.exit(1)
    current = {d["seedId"] for d in rows}
    retired = sorted(k for k in registry if k not in current) if schema >= 2 else []
    for d in rows:
        registry[d["seedId"]] = {"name": d["displayName"], "email": d.get("email")}
    with open(OUT, "w", encoding="utf-8") as f:
        for d in rows:
            f.write(json.dumps(d, ensure_ascii=False) + "\n")
        for k in retired:
            f.write(json.dumps({"seedId": k, "retired": True}) + "\n")
    os.makedirs(os.path.dirname(REGISTRY), exist_ok=True)
    with open(REGISTRY, "w", encoding="utf-8") as f:
        json.dump(registry, f, ensure_ascii=False, indent=1)
    print(f"{len(rows)} investors → {OUT}")
    print(f"  with thesis: {sum(1 for d in rows if d.get('thesis'))}")
    print(f"  with cheque size: {sum(1 for d in rows if 'chequeMaxLakh' in d)}")
    print(f"  added by the growth pipeline: {sum(1 for d in rows if d['seedId'].startswith('g_'))}")
    if schema >= 2:
        print(f"  apply link only, no email: {sum(1 for d in rows if 'email' not in d)}")
        print(f"  retired (exported before, not now): {len(retired)}")
    blocked = sum(1 for r in data["investors"] if r.get("import_blocked") and not r.get("exclude"))
    if blocked:
        print(f"  held back by checks: {blocked} (see seed/enrichment/checks_report.md)")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--schema", type=int, default=1, choices=[1, 2])
    ap.add_argument("--out", help="write here instead of seed/investors_import.jsonl")
    a = ap.parse_args()
    if a.out:
        OUT = a.out
    main(a.schema)
