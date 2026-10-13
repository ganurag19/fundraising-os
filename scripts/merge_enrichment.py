"""Merge research results into the cleaned investor list.

Reads   seed/investors.json                       (records cleaned from the raw spreadsheets)
        seed/enrichment/queue.json                (first research round: existing records)
        seed/enrichment/queue_growth.json         (new investors from add_candidates.py)
        seed/enrichment/queue_refresh_*.json      (re-checks from refresh_queue.py)
        seed/enrichment/deals.json                (deals from funding reports, for investors we have)
        seed/enrichment/results/*.json
Writes  seed/investors_enriched.json   (what check_records.py and build_import.py read)
        seed/enrichment/report.md       (what was found, what wasn't)
        an "Enriched" sheet in seed/investors_clean.xlsx

A new investor becomes a record only once its research result exists. Results are applied
oldest first, so a refresh overwrites the older check.

Safe to re-run: raw -> clean_investors.py -> merge_enrichment.py -> check_records.py -> build_import.py
Run: python3 scripts/merge_enrichment.py
"""

import glob
import json
import os
import sys
from collections import Counter

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from pipeline_common import KINDS, SECTORS, STAGES, load_json, save_json  # noqa: E402


def load_results(enr):
    out = {}
    bad = []
    for p in sorted(glob.glob(os.path.join(enr, "results", "*.json"))):
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


def new_record(u):
    """A record for an investor found by discovery, before its research is applied."""
    return {
        "id": u["id"], "origin": "growth", "kind": u["kind"],
        "person_name": u.get("person_name"), "title": None, "firm": u.get("firm"), "people": [],
        "email": None, "email_status": "none", "email_pattern": None, "other_emails": [], "email_source_url": None,
        "how_to_reach": None, "pitch_form_url": None, "website": u.get("website"), "linkedin_url": None,
        "city": u.get("city"), "country": None, "india_based": None,
        "sectors": list(u.get("known_sectors") or []), "sectors_raw": None,
        "stages": [], "stages_raw": None, "stages_inferred": False,
        "cheque_min_usd": None, "cheque_max_usd": None, "cheque_min_inr_lakh": None, "cheque_max_inr_lakh": None,
        "cheque_raw": None, "leads_rounds": None, "portfolio": [], "portfolio_count": None, "response_time": None,
        "thesis": None,
        "sources": [{"url": d["source_url"], "found_via": d.get("found_via")} for d in u.get("discovered") or []],
        "source_date": None, "last_checked": None, "needs_review": [],
    }


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
    elif res.get("website") and rec.get("origin") == "growth" and "website" in ok:
        put("website", res["website"])  # research corrects the site discovery guessed
    if res.get("kind") in KINDS and "kind" in ok and res["kind"] != rec["kind"]:
        put("kind", res["kind"])
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
        # a new investor has no spreadsheet stages to fall back on
        if rec.get("origin") == "growth" and "stages" in ok and res.get("stages") and not rec["stages"]:
            put("stages", [s for s in STAGES if s in res["stages"]])
    if rec.get("cheque_min_inr_lakh") is None and res.get("cheque_min_inr_lakh") is not None:
        put("cheque_min_inr_lakh", res["cheque_min_inr_lakh"])
    if rec.get("cheque_max_inr_lakh") is None and res.get("cheque_max_inr_lakh") is not None:
        put("cheque_max_inr_lakh", res["cheque_max_inr_lakh"])
    if res.get("leads_rounds") is not None and "leads_rounds" in ok:
        put("leads_rounds", res["leads_rounds"])
    seen = {p.lower() for p in rec["portfolio"]}
    for c in res.get("portfolio_add") or []:
        if c.lower() not in seen:
            rec["portfolio"].append(c)
            seen.add(c.lower())
            changed.append("portfolio")

    # An email becomes the one we show only with the page it is printed on (spec v2).
    em = (res.get("public_email") or "").strip().lower()
    if em and res.get("email_source_url") and rec.get("email_status") != "listed":
        rec["email"], rec["email_status"], rec["email_source_url"] = em, "listed", res["email_source_url"]
        changed.append("email")
    elif em and em != rec.get("email") and em not in rec["other_emails"]:
        rec["other_emails"].append(em)
        changed.append("other_emails")

    if res.get("india_based") is not None and "india_based" in ok:
        put("india_based", res["india_based"])
        rec["india_based"] = res["india_based"]  # put() skips False
        if res["india_based"]:
            rec["country"] = rec.get("country") or "India"
    if res.get("city") and not rec.get("city"):
        put("city", res["city"])
    app = res.get("application") or {}
    if app.get("url"):
        put("application", {k: app.get(k) for k in ("url", "deadline", "type")})
    if res.get("corporate_parent"):
        put("corporate_parent", res["corporate_parent"])

    rec["active"] = res.get("active")
    rec["recent_investments"] = res.get("recent_investments") or []
    rec["pitch_route"] = res.get("pitch_route")
    rec["enrichment"] = {
        "checked_on": res.get("checked_on"),
        "confidence": res.get("confidence"),
        "identity_confirmed": res.get("identity_confirmed"),
        "sources": res.get("sources") or [],
        "blocked": res.get("blocked") or [],
        "notes": res.get("notes"),
    }
    rec["last_checked"] = res.get("checked_on")
    if rec.get("origin") == "growth" and not rec.get("source_date"):
        rec["source_date"] = res.get("checked_on")
    # excluded records stay in the file for history; the import skips them
    # an unconfirmed angel from the spreadsheets keeps their listed email; a new one has nothing else to go on
    unconfirmed = rec.get("origin") == "growth" and res.get("identity_confirmed") is False
    rec["exclude"] = bool(res.get("exclude")) or res.get("active") is False or unconfirmed
    rec["exclude_reason"] = res.get("exclude_reason") or (
        "Not investing any more" if res.get("active") is False
        else "Could not confirm who this is" if unconfirmed else None)
    flags = [f for f in rec["needs_review"] if f not in ("no_portfolio",) or not rec["portfolio"]]
    if rec.get("origin") == "growth":
        flags = [f for f in flags if f != "no_email"] + ([] if rec.get("email") else ["no_email"])
    if not rec.get("thesis"):
        flags.append("no_thesis_after_research")
    if res.get("active") is False:
        flags.append("inactive")
    if res.get("confidence") == "low":
        flags.append("low_confidence")
    rec["needs_review"] = sorted(set(flags))
    return set(changed)


def attach_deals(rec, deals):
    """Add deals from funding reports to recent investments and portfolio, newest first."""
    have = {(x.get("company") or "").lower() for x in rec.get("recent_investments") or []}
    added = 0
    for d in deals:
        if d["company"].lower() in have:
            continue
        rec.setdefault("recent_investments", []).append(
            {"company": d["company"], "year": d.get("year"), "round": d.get("round"),
             "sector": d.get("sector") if d.get("sector") in SECTORS else None, "source_url": d["source_url"]})
        have.add(d["company"].lower())
        if d["company"].lower() not in {p.lower() for p in rec["portfolio"]}:
            rec["portfolio"].append(d["company"])
        added += 1
    if added:
        rec["recent_investments"].sort(key=lambda x: -(x.get("year") or 0))
    return added


def run(seed):
    enr = os.path.join(seed, "enrichment")
    data = load_json(os.path.join(seed, "investors.json"))
    by_id = {r["id"]: r for r in data["investors"]}
    results, bad = load_results(enr)

    first = load_json(os.path.join(enr, "queue.json"), [])
    growth = load_json(os.path.join(enr, "queue_growth.json"), [])
    refresh = []
    for p in sorted(glob.glob(os.path.join(enr, "queue_refresh_*.json"))):
        refresh += load_json(p, [])

    # new investors become records once researched
    for u in growth:
        if u["slug"] in results and u["id"] not in by_id:
            rec = new_record(u)
            data["investors"].append(rec)
            by_id[rec["id"]] = rec

    pairs, missing = [], []
    for group, units in (("first", first), ("growth", growth), ("refresh", refresh)):
        for u in units:
            res = results.get(u["slug"])
            if res:
                pairs.append((group, u, res))
            elif group != "refresh":
                missing.append(u)
    pending_refresh = sum(1 for u in refresh if u["slug"] not in results)

    field_counts, conf = Counter(), Counter()
    for _, u, res in sorted(pairs, key=lambda p: p[2].get("checked_on") or ""):
        conf[res.get("confidence")] += 1
        for rid in u["record_ids"]:
            if rid in by_id:
                field_counts.update(apply(by_id[rid], res))

    deals_added = 0
    by_record = {}
    for d in load_json(os.path.join(enr, "deals.json"), []):
        by_record.setdefault(d["record_id"], []).append(d)
    for u in growth:
        if u["id"] in by_id:
            by_record.setdefault(u["id"], []).extend(u.get("seed_deals") or [])
    for rid, ds in by_record.items():
        if rid in by_id:
            deals_added += attach_deals(by_id[rid], [d for d in ds if d.get("company") and d.get("source_url")])

    data["enriched_on"] = max((r.get("checked_on") or "" for _, _, r in pairs), default=None)
    save_json(os.path.join(seed, "investors_enriched.json"), data)

    # report
    done = [(u, r) for _, u, r in pairs]
    has = lambda k: sum(1 for _, r in done if r.get(k))
    new_made = sum(1 for u in growth if u["id"] in by_id)
    lines = [
        "# Enrichment report", "",
        f"Units researched: {len(done)} (first round {sum(1 for g, *_ in pairs if g == 'first')}, "
        f"new investors {sum(1 for g, *_ in pairs if g == 'growth')}, refreshes {sum(1 for g, *_ in pairs if g == 'refresh')})",
        f"Not yet researched: {len(missing)} (plus {pending_refresh} refreshes pending)",
        f"New investors added as records: {new_made}",
        f"Deals from funding reports attached: {deals_added}",
        f"Confidence: high {conf['high']}, medium {conf['medium']}, low {conf['low']}", "",
        f"- Thesis found: {has('thesis')}",
        f"- Stages found: {has('stages')}",
        f"- Cheque size found: {sum(1 for _, r in done if r.get('cheque_max_inr_lakh') is not None)}",
        f"- Recent investments found: {has('recent_investments')}",
        f"- Pitch route found: {sum(1 for _, r in done if (r.get('pitch_route') or {}).get('type') not in (None, 'unknown'))}",
        f"- Published email with its page: {sum(1 for _, r in done if r.get('public_email') and r.get('email_source_url'))}",
        f"- Application link found: {sum(1 for _, r in done if (r.get('application') or {}).get('url'))}",
        f"- Marked inactive: {sum(1 for _, r in done if r.get('active') is False)}",
        f"- Sites blocked: {sum(1 for _, r in done if r.get('blocked'))}", "",
    ]
    if bad:
        lines += ["## Result files that failed to load", ""] + [f"- {b}" for b in bad] + [""]
    if missing:
        lines += ["## Not yet researched", ""] + [f"- {u.get('slug')}: {u['firm'] or u['person_name']}" for u in missing[:200]] + [""]
    with open(os.path.join(enr, "report.md"), "w", encoding="utf-8") as f:
        f.write("\n".join(lines))

    write_sheet(seed, done)
    return lines


def write_sheet(seed, done):
    import openpyxl
    from openpyxl.styles import Font, PatternFill
    from openpyxl.utils import get_column_letter

    xlsx = os.path.join(seed, "investors_clean.xlsx")
    if not os.path.exists(xlsx):
        return
    wb = openpyxl.load_workbook(xlsx)
    if "Enriched" in wb.sheetnames:
        del wb["Enriched"]
    cols = [("slug", 22), ("firm / angel", 28), ("confidence", 11), ("active", 8), ("thesis", 60), ("stages", 26),
            ("cheque ₹L", 12), ("recent investments", 40), ("pitch route", 32), ("email (page)", 40),
            ("notes", 30), ("sources", 50)]

    def row(u, r):
        ri = "; ".join(f"{x.get('company')} ({x.get('year')})" for x in r.get("recent_investments") or [])
        pr = r.get("pitch_route") or {}
        lo, hi = r.get("cheque_min_inr_lakh"), r.get("cheque_max_inr_lakh")
        em = f"{r.get('public_email')} ({r.get('email_source_url')})" if r.get("public_email") else None
        return [u.get("slug"), u["firm"] or u["person_name"], r.get("confidence"),
                {True: "yes", False: "no"}.get(r.get("active"), "?"), r.get("thesis"),
                ", ".join(r.get("stages") or []), f"{lo or ''}–{hi or ''}" if (lo or hi) else None, ri,
                f"{pr.get('type')}: {pr.get('value') or ''}" if pr else None, em, r.get("notes"),
                " ".join(s["url"] for s in r.get("sources") or [])]

    ws = wb.create_sheet("Enriched", 1)
    ws.append([c for c, _ in cols])
    for c in ws[1]:
        c.font, c.fill = Font(bold=True, color="FFFFFF"), PatternFill("solid", fgColor="1A1A1A")
    for u, r in done:
        ws.append(row(u, r))
    for i, (_, w) in enumerate(cols, start=1):
        ws.column_dimensions[get_column_letter(i)].width = w
    ws.freeze_panes = "C2"
    wb.save(xlsx)


if __name__ == "__main__":
    from pipeline_common import SEED
    out = run(SEED)
    print("\n".join(out[:18]))
    print("\nWrote seed/investors_enriched.json, seed/enrichment/report.md, Enriched sheet in investors_clean.xlsx")
    print("Next: python3 scripts/check_records.py")
