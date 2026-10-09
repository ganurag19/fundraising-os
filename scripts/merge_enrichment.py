"""Merge research results into the cleaned investor list.

Reads   seed/investors.json, seed/enrichment/queue.json, seed/enrichment/results/*.json
Writes  seed/investors_enriched.json   (what the Convex import reads)
        seed/enrichment/report.md       (what was found, what wasn't)
        adds an "Enriched" sheet and a "Spot check" sheet to seed/investors_clean.xlsx

Safe to re-run: the pipeline is raw -> clean_investors.py -> merge_enrichment.py.
Run: python3 scripts/merge_enrichment.py
"""

import glob
import json
import os
import random
from collections import Counter

import openpyxl
from openpyxl.styles import Font, PatternFill
from openpyxl.utils import get_column_letter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SEED = os.path.join(ROOT, "seed")
ENR = os.path.join(SEED, "enrichment")

STAGES = ["idea", "pre_seed", "seed", "pre_series_a", "series_a", "series_b_plus"]


def load_results():
    out = {}
    bad = []
    for p in sorted(glob.glob(os.path.join(ENR, "results", "*.json"))):
        try:
            r = json.load(open(p, encoding="utf-8"))
            out[r["slug"]] = r
        except (json.JSONDecodeError, KeyError) as e:
            bad.append(f"{os.path.basename(p)}: {e}")
    return out, bad


def sourced(res):
    """Fields that at least one source URL claims to support."""
    s = set()
    for src in res.get("sources") or []:
        s.update(src.get("supports") or [])
    return s


def apply(rec, res):
    ok = sourced(res)
    changed = []

    def put(field, value):
        if value not in (None, [], ""):
            rec[field] = value
            changed.append(field)

    if "thesis" in ok:
        put("thesis", res.get("thesis"))
    if res.get("website") and not rec.get("website"):
        put("website", res["website"])
    if res.get("confidence") == "high":
        if "sectors" in ok and res.get("sectors"):
            put("sectors", res["sectors"])
        if "stages" in ok and res.get("stages"):
            put("stages", [s for s in STAGES if s in res["stages"]])
            rec["stages_inferred"] = False
    else:
        if "sectors" in ok:
            for s in res.get("sectors") or []:
                if s not in rec["sectors"]:
                    rec["sectors"].append(s)
                    changed.append("sectors")
    if rec.get("cheque_min_inr_lakh") is None and res.get("cheque_min_inr_lakh") is not None:
        put("cheque_min_inr_lakh", res["cheque_min_inr_lakh"])
    if rec.get("cheque_max_inr_lakh") is None and res.get("cheque_max_inr_lakh") is not None:
        put("cheque_max_inr_lakh", res["cheque_max_inr_lakh"])
    seen = {p.lower() for p in rec["portfolio"]}
    for c in res.get("portfolio_add") or []:
        if c.lower() not in seen:
            rec["portfolio"].append(c)
            seen.add(c.lower())
            changed.append("portfolio")
    em = (res.get("public_email") or "").lower()
    if em and em != rec.get("email") and em not in rec["other_emails"]:
        rec["other_emails"].append(em)
        changed.append("other_emails")

    rec["active"] = res.get("active")
    rec["recent_investments"] = res.get("recent_investments") or []
    rec["pitch_route"] = res.get("pitch_route")
    rec["enrichment"] = {
        "checked_on": res.get("checked_on"),
        "confidence": res.get("confidence"),
        "sources": res.get("sources") or [],
        "blocked": res.get("blocked") or [],
        "notes": res.get("notes"),
    }
    rec["last_checked"] = res.get("checked_on")
    # excluded records stay in the file for history; the import skips them
    rec["exclude"] = bool(res.get("exclude")) or res.get("active") is False
    rec["exclude_reason"] = res.get("exclude_reason") or ("Not investing any more" if res.get("active") is False else None)
    flags = [f for f in rec["needs_review"] if f not in ("no_portfolio",) or not rec["portfolio"]]
    if not rec.get("thesis"):
        flags.append("no_thesis_after_research")
    if res.get("active") is False:
        flags.append("inactive")
    if res.get("confidence") == "low":
        flags.append("low_confidence")
    rec["needs_review"] = sorted(set(flags))
    return set(changed)


def main():
    data = json.load(open(os.path.join(SEED, "investors.json"), encoding="utf-8"))
    by_id = {r["id"]: r for r in data["investors"]}
    queue = json.load(open(os.path.join(ENR, "queue.json"), encoding="utf-8"))
    results, bad = load_results()

    done, missing, field_counts, conf = [], [], Counter(), Counter()
    for u in queue:
        res = results.get(u["slug"])
        if not res:
            missing.append(u)
            continue
        done.append((u, res))
        conf[res.get("confidence")] += 1
        for rid in u["record_ids"]:
            field_counts.update(apply(by_id[rid], res))

    data["enriched_on"] = max((r.get("checked_on") or "" for _, r in done), default=None)
    with open(os.path.join(SEED, "investors_enriched.json"), "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    # report
    n = len(queue)
    has = lambda k: sum(1 for _, r in done if r.get(k))
    lines = [
        "# Enrichment report", "",
        f"Units researched: {len(done)} of {n}", f"Not yet researched: {len(missing)}",
        f"Confidence: high {conf['high']}, medium {conf['medium']}, low {conf['low']}", "",
        f"- Thesis found: {has('thesis')}",
        f"- Stages found: {has('stages')}",
        f"- Cheque size found: {sum(1 for _, r in done if r.get('cheque_max_inr_lakh') is not None)}",
        f"- Recent investments found: {has('recent_investments')}",
        f"- Pitch route found: {sum(1 for _, r in done if (r.get('pitch_route') or {}).get('type') not in (None, 'unknown'))}",
        f"- Marked inactive: {sum(1 for _, r in done if r.get('active') is False)}",
        f"- Sites blocked: {sum(1 for _, r in done if r.get('blocked'))}", "",
    ]
    if bad:
        lines += ["## Result files that failed to load", ""] + [f"- {b}" for b in bad] + [""]
    if missing:
        lines += ["## Not yet researched", ""] + [f"- {u['n']}. {u['firm'] or u['person_name']}" for u in missing[:200]] + [""]
    with open(os.path.join(ENR, "report.md"), "w", encoding="utf-8") as f:
        f.write("\n".join(lines))

    # spreadsheet sheets
    xlsx = os.path.join(SEED, "investors_clean.xlsx")
    wb = openpyxl.load_workbook(xlsx)
    for name in ("Enriched", "Spot check"):
        if name in wb.sheetnames:
            del wb[name]
    cols = [("n", 5), ("firm / angel", 28), ("confidence", 11), ("active", 8), ("thesis", 60), ("stages", 26),
            ("cheque ₹L", 12), ("recent investments", 40), ("pitch route", 32), ("notes", 30), ("sources", 50)]

    def row(u, r):
        ri = "; ".join(f"{x.get('company')} ({x.get('year')})" for x in r.get("recent_investments") or [])
        pr = r.get("pitch_route") or {}
        lo, hi = r.get("cheque_min_inr_lakh"), r.get("cheque_max_inr_lakh")
        return [u["n"], u["firm"] or u["person_name"], r.get("confidence"),
                {True: "yes", False: "no"}.get(r.get("active"), "?"), r.get("thesis"),
                ", ".join(r.get("stages") or []), f"{lo or ''}–{hi or ''}" if (lo or hi) else None, ri,
                f"{pr.get('type')}: {pr.get('value') or ''}" if pr else None, r.get("notes"),
                " ".join(s["url"] for s in r.get("sources") or [])]

    head_font, head_fill = Font(bold=True, color="FFFFFF"), PatternFill("solid", fgColor="1A1A1A")
    random.seed(9)
    sample = random.sample(done, min(15, len(done)))
    for name, items in (("Enriched", done), ("Spot check", sample)):
        ws = wb.create_sheet(name, 1)
        ws.append([c for c, _ in cols])
        for c in ws[1]:
            c.font, c.fill = head_font, head_fill
        for u, r in items:
            ws.append(row(u, r))
        for i, (_, w) in enumerate(cols, start=1):
            ws.column_dimensions[get_column_letter(i)].width = w
        ws.freeze_panes = "C2"
    wb.save(xlsx)

    print("\n".join(lines[:12]))
    print(f"\nWrote seed/investors_enriched.json, seed/enrichment/report.md, sheets in investors_clean.xlsx")


if __name__ == "__main__":
    main()
