"""Turn seed/investors_enriched.json into seed/investors_import.jsonl for Convex.

Keeps only investors we can show: India based, a listed email, not excluded, and (for investors
added by the growth pipeline) passing check_records.py. Grant schemes wait for the application-link
change in the app (docs/PROPOSAL_EVIDENCE_AND_APPLY.md).
The output stays in seed/ (gitignored). Load it with:

  npx convex import --table investors --replace -y seed/investors_import.jsonl       # dev
  npx convex import --table investors --replace --prod seed/investors_import.jsonl   # live

Run: python3 scripts/build_import.py
"""

import json
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "seed", "investors_enriched.json")
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


def main():
    data = json.load(open(SRC, encoding="utf-8"))
    rows = []
    for r in data["investors"]:
        if not r.get("india_based") or r.get("email_status") != "listed" or r.get("exclude"):
            continue
        if r.get("import_blocked") or r["kind"] == "grant":
            continue
        firm = r.get("firm")
        if firm:  # "Venture Catalysts++ | India's 1st Multi-Stage VC" -> "Venture Catalysts++"
            firm = re.split(r"\s[|–—-]\s|\s\(", firm)[0].strip()
        person = r.get("person_name")
        doc = {
            "seedId": r["id"],
            "kind": IMPORT_KIND.get(r["kind"], r["kind"]),
            "displayName": firm or person,
            "email": r["email"],
            "sectors": r.get("sectors") or [],
            "stages": r.get("stages") or [],
            "portfolio": clean_list(r.get("portfolio"), 15),
            "recent": [
                {k: v for k, v in {"company": x.get("company"), "year": x.get("year"), "round": x.get("round")}.items() if v is not None}
                for x in (r.get("recent_investments") or [])[:3] if x.get("company")
            ],
            "sourceUrls": clean_list([s.get("url") for s in (r.get("enrichment") or {}).get("sources", [])], 6),
            "sourceDate": r.get("source_date"),
        }
        optional = {
            "person": person, "firm": firm, "title": r.get("title"), "city": r.get("city"),
            "website": r.get("website"), "thesis": r.get("thesis"),
            "chequeMinLakh": r.get("cheque_min_inr_lakh"), "chequeMaxLakh": r.get("cheque_max_inr_lakh"),
            "leadsRounds": r.get("leads_rounds"), "active": r.get("active"),
            "pitchRoute": ((r.get("pitch_route") or {}).get("value") if (r.get("pitch_route") or {}).get("type") not in (None, "unknown") else None),
            "lastChecked": r.get("last_checked"),
        }
        doc.update({k: v for k, v in optional.items() if v not in (None, "")})
        rows.append(doc)

    with open(OUT, "w", encoding="utf-8") as f:
        for d in rows:
            f.write(json.dumps(d, ensure_ascii=False) + "\n")
    print(f"{len(rows)} investors → {OUT}")
    print(f"  with thesis: {sum(1 for d in rows if d.get('thesis'))}")
    print(f"  with cheque size: {sum(1 for d in rows if 'chequeMaxLakh' in d)}")
    print(f"  added by the growth pipeline: {sum(1 for d in rows if d['seedId'].startswith('g_'))}")
    blocked = sum(1 for r in data["investors"] if r.get("import_blocked") and not r.get("exclude"))
    if blocked:
        print(f"  held back by checks: {blocked} (see seed/enrichment/checks_report.md)")


if __name__ == "__main__":
    main()
