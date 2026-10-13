"""Automatic checks on every investor, plus a 1-in-10 list for Anurag to check by hand.

Reads   seed/investors_enriched.json
Writes  seed/investors_enriched.json          (adds "checks", "check_failures", "import_blocked" to each record)
        seed/enrichment/checks_report.md
        seed/enrichment/spot_check_<date>.md  (1 in 10 of the records checked since --since, at least 3)
        a "Spot check" sheet in seed/investors_clean.xlsx

Checks
  contact   passes when "email" or "apply" passes (an apply link reaches the app with --schema 2 imports).
  email     the email is printed on the investor's own site or an official source (.gov.in, .ac.in ...),
            and that page is recorded. Records from the original spreadsheets pass as "spreadsheet".
            With --verify-emails, the page is opened once and must contain the address.
  apply     an application or pitch-form link on the investor's own site or an official source;
            with --verify-emails it must also open.
  sources   every researched fact (thesis, stages, sectors, cheque, deals, pitch route) has a URL.
  india     india_based is true.
  active    marked active, or a deal dated this year or last year.

A new investor (origin "growth") that fails contact, sources or india is blocked from the import.
Failing "active" blocks too, unless it is an accelerator, incubator or grant (they run cohorts, not deals).
Records from the spreadsheets are never blocked here; their failures are listed in the report.

Run: python3 scripts/check_records.py [--since 2026-10-13] [--verify-emails]
"""

import argparse
import datetime
import os
import random
import re
import sys
import urllib.request

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from pipeline_common import OFFICIAL_SUFFIXES, domain, load_json, same_site, save_json  # noqa: E402

BLOCKING = {"contact", "sources", "india", "active"}
NO_DEALS_KINDS = {"accelerator", "incubator", "grant"}
FACT_FIELDS = {  # record field -> the "supports" name a source must carry
    "thesis": "thesis", "stages": "stages", "cheque_max_inr_lakh": "cheque", "pitch_route": "pitch_route",
}


def supports(rec):
    s = set()
    for src in (rec.get("enrichment") or {}).get("sources") or []:
        for x in src.get("supports") or []:
            s.add(x)
            if x.startswith("cheque"):
                s.add("cheque")
    return s


def cf_decode(h):
    """Cloudflare hides printed emails as data-cfemail hex; the first byte is the XOR key."""
    try:
        key = int(h[:2], 16)
        return "".join(chr(int(h[i:i + 2], 16) ^ key) for i in range(2, len(h), 2))
    except ValueError:
        return ""


def email_check(rec, fetch=None):
    if rec.get("email_status") != "listed" or not rec.get("email"):
        return "fail", "no listed email"
    if rec.get("origin") != "growth" and not rec.get("email_source_url"):
        return "pass", "spreadsheet"
    page = rec.get("email_source_url")
    if not page:
        return "fail", "no page recorded for the email"
    pd = domain(page)
    own = same_site(pd, domain(rec.get("website")))
    official = bool(pd) and pd.endswith(OFFICIAL_SUFFIXES)
    if not (own or official):
        return "fail", f"email page {pd} is not the investor's site or an official source"
    if fetch:
        text = fetch(page)
        if text is None:
            return "fail", "could not open the email page"
        text = text + " " + " ".join(cf_decode(h) for h in re.findall(r'data-cfemail="([0-9a-fA-F]+)"', text))
        flat = re.sub(r"\s*(\[at\]|\(at\)| at )\s*", "@", text.lower())
        flat = re.sub(r"\s*(\[dot\]|\(dot\)| dot )\s*", ".", flat)
        if rec["email"].lower() not in flat:
            return "fail", "email not found on its page"
        return "pass", "seen on page"
    return "pass", "own site" if own else "official source"


def apply_url(rec):
    """The link a founder would apply or pitch through, if there is no email to write to."""
    if (rec.get("application") or {}).get("url"):
        return rec["application"]["url"]
    pr = rec.get("pitch_route") or {}
    return pr.get("value") if pr.get("type") == "form" and str(pr.get("value") or "").startswith("http") else None


def apply_check(rec, fetch=None):
    url = apply_url(rec)
    if not url:
        return "fail", "no application or pitch-form link"
    d, site = domain(url), domain(rec.get("website"))
    own = same_site(d, site) or (d or "").endswith(OFFICIAL_SUFFIXES)
    # a form hosted elsewhere (Google Forms, Typeform) counts when the investor's own page links to it
    linked_from = [src["url"] for src in (rec.get("enrichment") or {}).get("sources") or []
                   if set(src.get("supports") or []) & {"pitch_route", "application"}
                   and same_site(domain(src.get("url")), site) and src.get("url") != url]
    if not own and not linked_from:
        return "fail", f"link on {d}, not the investor's site or an official source"
    if fetch:
        if fetch(url) is None:
            return "fail", "link does not open"
        if not own and url.split("?")[0].rstrip("/") not in (fetch(linked_from[0]) or ""):
            return "fail", "form not linked from their own page"
    return "pass", "own site" if same_site(d, site) else "official source" if own else "form linked from own site"


def sources_check(rec):
    if not rec.get("enrichment"):
        return ("pass", "not researched yet") if rec.get("origin") != "growth" else ("fail", "no research")
    have = supports(rec)
    if any(s.get("file") for s in rec.get("sources") or []):  # stages and cheque from the raw spreadsheets
        have |= {"stages", "cheque", "sectors"}
    if any(s.get("found_via") for s in rec.get("sources") or []):  # sector hint from the page we found them on
        have.add("sectors")
    missing = [f for f, tag in FACT_FIELDS.items()
               if rec.get(f) not in (None, [], "") and tag not in have
               and not (f == "pitch_route" and (rec[f] or {}).get("type") in (None, "unknown"))]
    if rec.get("origin") == "growth" and rec.get("sectors") and "sectors" not in have:
        missing.append("sectors")
    deals_no_url = [d.get("company") for d in rec.get("recent_investments") or [] if not d.get("source_url")]
    if deals_no_url:
        missing.append("deal urls (" + ", ".join(str(c) for c in deals_no_url[:3]) + ")")
    if not (rec.get("enrichment") or {}).get("sources"):
        missing.append("any source")
    return ("fail", "no source for " + ", ".join(missing)) if missing else ("pass", "")


def india_check(rec):
    return ("pass", "") if rec.get("india_based") else ("fail", "not shown to invest in India")


def active_check(rec, today):
    if rec.get("active") is True:
        return "pass", "marked active"
    years = [d.get("year") for d in rec.get("recent_investments") or [] if isinstance(d.get("year"), int)]
    if years and max(years) >= today.year - 1:
        return "pass", f"deal in {max(years)}"
    if rec.get("active") is False:
        return "fail", "stopped investing"
    return "fail", "no deal or news from the last two years"


def check(rec, today, fetch=None):
    em, ap = email_check(rec, fetch), apply_check(rec, fetch)
    res = {
        "contact": ("pass", "email") if em[0] == "pass" else ("pass", "apply link") if ap[0] == "pass" else ("fail", "no email or apply link"),
        "email": em,
        "apply": ap,
        "sources": sources_check(rec),
        "india": india_check(rec),
        "active": active_check(rec, today),
    }
    rec["checks"] = {k: {"result": r, "why": w} for k, (r, w) in res.items()}
    # email and apply are the two halves of contact; only contact counts as a failure
    rec["check_failures"] = sorted(k for k, (r, _) in res.items() if r == "fail" and k not in ("email", "apply"))
    blocking = set(rec["check_failures"]) & BLOCKING
    if rec.get("kind") in NO_DEALS_KINDS:
        blocking.discard("active")
    rec["import_blocked"] = rec.get("origin") == "growth" and bool(blocking)
    return rec


def make_fetch():
    cache = {}

    def fetch(url):
        if url not in cache:
            try:
                req = urllib.request.Request(url, headers={"User-Agent": "FirstCheq-check/1.0 (one page per investor)"})
                with urllib.request.urlopen(req, timeout=15) as r:
                    cache[url] = r.read(2_000_000).decode("utf-8", "ignore")
            except Exception:
                cache[url] = None
        return cache[url]
    return fetch


def spot_check_sample(records, since, seed_text):
    pool = [r for r in records if (r.get("last_checked") or "") >= since and not r.get("exclude")]
    if not pool:
        return []
    n = max(3, round(len(pool) / 10)) if len(pool) >= 3 else len(pool)
    return random.Random(seed_text).sample(sorted(pool, key=lambda r: r["id"]), min(n, len(pool)))


def spot_lines(r):
    name = r.get("firm") or r.get("person_name")
    deal = next(iter(r.get("recent_investments") or []), None)
    out = [f"### {name} ({r['kind']}, {r['id']})", "",
           f"- [ ] Email: {r.get('email') or 'none'}" + (f" — on {r['email_source_url']}" if r.get("email_source_url") else ""),
           f"- [ ] Website: {r.get('website') or 'none'}",
           f"- [ ] Thesis: {r.get('thesis') or 'none'}",
           f"- [ ] Stages: {', '.join(r.get('stages') or []) or 'none'} · Sectors: {', '.join(r.get('sectors') or []) or 'none'}",
           f"- [ ] Cheque ₹ lakh: {r.get('cheque_min_inr_lakh')}–{r.get('cheque_max_inr_lakh')}"]
    if deal:
        out.append(f"- [ ] Deal: {deal.get('company')} {deal.get('year')} {deal.get('round') or ''} — {deal.get('source_url') or 'no link'}")
    if (r.get("application") or {}).get("url"):
        out.append(f"- [ ] Apply: {r['application']['url']}")
    out.append(f"- Checks: {', '.join(r['check_failures']) or 'all pass'}" + (" · BLOCKED from import" if r.get("import_blocked") else ""))
    return out + [""]


def write_sheet(seed, sample):
    xlsx = os.path.join(seed, "investors_clean.xlsx")
    if not os.path.exists(xlsx):
        return
    import openpyxl
    from openpyxl.styles import Font, PatternFill
    wb = openpyxl.load_workbook(xlsx)
    if "Spot check" in wb.sheetnames:
        del wb["Spot check"]
    ws = wb.create_sheet("Spot check", 1)
    ws.append(["id", "firm / angel", "kind", "email", "email page", "thesis", "stages", "cheque ₹L", "deal", "deal link",
               "checks failed", "right? (y/n)", "what's wrong"])
    for c in ws[1]:
        c.font, c.fill = Font(bold=True, color="FFFFFF"), PatternFill("solid", fgColor="1A1A1A")
    for r in sample:
        d = next(iter(r.get("recent_investments") or []), {})
        ws.append([r["id"], r.get("firm") or r.get("person_name"), r["kind"], r.get("email"), r.get("email_source_url"),
                   r.get("thesis"), ", ".join(r.get("stages") or []),
                   f"{r.get('cheque_min_inr_lakh') or ''}–{r.get('cheque_max_inr_lakh') or ''}",
                   f"{d.get('company') or ''} {d.get('year') or ''}", d.get("source_url"), ", ".join(r["check_failures"])])
    wb.save(xlsx)


def run(seed, since=None, today=None, fetch=None):
    today = today or datetime.date.today()
    path = os.path.join(seed, "investors_enriched.json")
    data = load_json(path)
    records = data["investors"]
    for r in records:
        check(r, today, fetch)
    save_json(path, data)

    since = since or max((r.get("last_checked") or "" for r in records), default="")
    sample = spot_check_sample(records, since, f"{since}-{today.isoformat()}")
    enr = os.path.join(seed, "enrichment")
    os.makedirs(enr, exist_ok=True)
    spot_path = os.path.join(enr, f"spot_check_{today.isoformat()}.md")
    with open(spot_path, "w", encoding="utf-8") as f:
        f.write(f"# Spot check, {today.isoformat()}\n\nRecords checked since {since}: 1 in 10, picked at random. "
                "Open each link and tick what is right. Tell Claude what is wrong.\n\n")
        for r in sample:
            f.write("\n".join(spot_lines(r)) + "\n")
    write_sheet(seed, sample)

    growth = [r for r in records if r.get("origin") == "growth"]
    legacy = [r for r in records if r.get("origin") != "growth" and r.get("india_based")
              and r.get("email_status") == "listed" and not r.get("exclude")]
    fails = lambda rs, k: sum(1 for r in rs if k in r["check_failures"])
    lines = ["# Checks report", "", f"Run on {today.isoformat()}", "",
             f"New investors: {len(growth)}, ready to import {sum(1 for r in growth if not r['import_blocked'] and not r.get('exclude'))}, "
             f"blocked {sum(1 for r in growth if r['import_blocked'] and not r.get('exclude'))}, excluded {sum(1 for r in growth if r.get('exclude'))}"]
    for k in ("contact", "sources", "india", "active"):
        lines.append(f"- failing {k}: {fails(growth, k)}")
    lines.append(f"- reachable only by apply link (need --schema 2): "
                 f"{sum(1 for r in growth if not r['import_blocked'] and not r.get('exclude') and r['checks']['contact']['why'] == 'apply link')}")
    lines += ["", f"Investors from the spreadsheets in the app today: {len(legacy)} (never blocked here)"]
    for k in ("sources", "active"):
        lines.append(f"- failing {k}: {fails(legacy, k)}")
    lines += ["", "## New investors blocked from import", ""]
    for r in growth:
        if r["import_blocked"] and not r.get("exclude"):
            whys = "; ".join(f"{k}: {r['checks'][k]['why']}" for k in r["check_failures"] if k not in ("email", "apply"))
            lines.append(f"- {r.get('firm') or r.get('person_name')} ({r['id']}): {whys}")
    with open(os.path.join(enr, "checks_report.md"), "w", encoding="utf-8") as f:
        f.write("\n".join(lines) + "\n")
    return lines, spot_path, sample


if __name__ == "__main__":
    from pipeline_common import SEED
    ap = argparse.ArgumentParser()
    ap.add_argument("--since", help="spot-check records checked on or after this date (default: the latest check date)")
    ap.add_argument("--verify-emails", action="store_true", help="open each new investor's email page once")
    a = ap.parse_args()
    lines, spot, sample = run(SEED, a.since, fetch=make_fetch() if a.verify_emails else None)
    print("\n".join(lines[:16]))
    print(f"\nSpot check ({len(sample)} records): {os.path.relpath(spot)}")
    print("Next: python3 scripts/build_import.py")
