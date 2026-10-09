"""Clean and merge the raw investor spreadsheets into one seed file.

Reads   seed/raw/*.xlsx              (private, gitignored)
Writes  seed/investors.json          (input for the Convex import, later)
        seed/investors_clean.xlsx    (same data, formatted for a human to review)

Rules:
- Nothing is invented. A field missing in every source stays empty.
- An email is "listed" only if a source gives the actual address. A fund that
  only gives a pattern (firstname@fund.com) gets email_status "pattern_only"
  and no email.
- Stages and sectors keep their raw text next to the normalised values, so the
  mapping can be checked. The mapping is documented in docs/SEED_FORMAT.md.

Run: python3 scripts/clean_investors.py
"""

import json
import os
import re
from datetime import date, datetime
from urllib.parse import urlparse

import openpyxl
from openpyxl.styles import Alignment, Font, PatternFill
from openpyxl.utils import get_column_letter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW = os.path.join(ROOT, "seed", "raw")
OUT_JSON = os.path.join(ROOT, "seed", "investors.json")
OUT_XLSX = os.path.join(ROOT, "seed", "investors_clean.xlsx")

USD_TO_INR = 88  # fixed rate used to show cheque sizes in ₹ lakh; review before launch
SEED_FORMAT_VERSION = 1

# Order matters only for display. Keys are what the app filters on.
SECTOR_RULES = [
    ("ai", r"\bai\b|artificial intelligence|machine learning|\bml\b|gen ?ai"),
    ("climate", r"climate|clean ?tech|environment|sustainab|\bev\b|electric vehicle|energy|mobility|carbon"),
    ("deeptech", r"deep ?tech|space ?tech|quantum|robotic|semiconductor|hardware|science|frontier|infratech"),
    ("b2b_saas", r"saas|b2b|enterprise|entrerprise"),
    ("fintech", r"fintech|financial technology"),
    ("consumer", r"consumer|d2c|brand|marketplace|retail"),
    ("health", r"health|medtech|pharma"),
    ("edtech", r"educat|edtech"),
    ("agritech", r"agri|agtech"),
    ("web3", r"blockchain|crypto|web3"),
    ("adtech", r"adtech"),
    ("impact", r"impact|women"),
    ("sector_agnostic", r"agnostic|multi[- ]?sector|multiple sectors|\bothers\b"),
    ("tech_general", r"^tech$|^technology$|\btech\b"),
]

STAGE_LADDER = ["idea", "pre_seed", "seed", "pre_series_a", "series_a", "series_b_plus"]
STAGE_RULES = {
    # ImpactVerse angel sheet
    "idea": ["idea"],
    "mvp": ["pre_seed"],
    "customer traction": ["seed"],
    "revenue traction": ["pre_series_a"],
    # ImpactVerse fund sheet
    "early stage": ["pre_seed", "seed", "pre_series_a"],
    "growth stage": ["series_a", "series_b_plus"],
    "late stage": ["series_b_plus"],
    "accelarator": ["idea", "pre_seed"],
}

CHEQUE_RULES = [
    # (raw text pattern, min USD, max USD)
    (r"less than \$?10,000", 0, 10_000),
    (r"10,000 ?- ?\$?40,000", 10_000, 40_000),
    (r"10,000 ?- ?\$?50,000", 10_000, 50_000),
    (r"40,000 ?- ?\$?100,000", 40_000, 100_000),
    (r"50,000 ?- ?\$?100,000", 50_000, 100_000),
    (r"100,000 ?- ?\$?300,000", 100_000, 300_000),
    (r"300,000\+", 300_000, None),
]

INDIAN_CITY_FIX = {"gurgaon": "Gurugram", "bangalore": "Bengaluru", "delhi": "New Delhi", "bombay": "Mumbai"}


# ---------- helpers ----------

def clean(v):
    if v is None:
        return None
    s = re.sub(r"\s+", " ", str(v)).strip().strip(",").strip()
    return s or None


def read_rows(path, sheet=None):
    wb = openpyxl.load_workbook(path, data_only=True)
    ws = wb[sheet] if sheet else wb.worksheets[0]
    rows = []
    for i, r in enumerate(ws.iter_rows(values_only=True), start=1):
        if any(clean(c) for c in r):
            rows.append((i, [clean(c) for c in r]))
    return rows


def file_date(path):
    return datetime.fromtimestamp(os.path.getmtime(path)).date().isoformat()


def domain_of(url_or_email):
    if not url_or_email:
        return None
    s = url_or_email.strip().lower()
    if "@" in s:
        s = s.split("@", 1)[1]
    else:
        if not s.startswith("http"):
            s = "http://" + s
        s = urlparse(s).netloc or s
    s = s.split("/")[0].strip(".").lower().removeprefix("www.")
    return s if "." in s else None


def norm_url(u):
    if not u:
        return None
    u = u.strip()
    if "@" in u and " " not in u and "/" not in u:
        return None  # an email sitting in a URL column
    if not u.lower().startswith("http"):
        u = "https://" + u
    return u.rstrip("/")


def norm_firm(name):
    if not name:
        return None
    s = name.lower()
    s = re.sub(r"\b(ventures?|capital|partners|fund|vc|advisors|investments?|india|management|llp|pvt|ltd|the)\b", " ", s)
    return re.sub(r"[^a-z0-9]", "", s) or name.lower()


def emails_in(text):
    if not text:
        return []
    found = re.findall(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}", text)
    return [e.lower().rstrip(".") for e in found]


def sectors_from(raw):
    if not raw:
        return []
    out = []
    parts = [p.strip().lower() for p in re.split(r"[,/;()]| and |&", raw) if p.strip()]
    for key, pat in SECTOR_RULES:
        if any(re.search(pat, p) for p in parts) and key not in out:
            out.append(key)
    # "Tech (Fintech)" style: drop tech_general when something more specific exists
    if "tech_general" in out and len(out) > 1:
        out.remove("tech_general")
    return out


def stages_from(raw):
    if not raw:
        return []
    got = set()
    for part in re.split(r",", raw.lower()):
        got.update(STAGE_RULES.get(part.strip(), []))
    return [s for s in STAGE_LADDER if s in got]


def cheque_from(raw):
    if not raw:
        return None, None
    for pat, lo, hi in CHEQUE_RULES:
        if re.search(pat, raw.lower().replace(" ", " ")):
            return lo, hi
    return None, None


def to_lakh(usd):
    return None if usd is None else round(usd * USD_TO_INR / 100_000, 1)


def split_list(raw):
    if not raw:
        return []
    raw = re.sub(r"&\s*more$", "", raw, flags=re.I)
    items = [clean(x) for x in re.split(r",|\n", raw)]
    out, seen = [], set()
    for x in items:
        if x and not x.lower().startswith("http") and x.lower() != "more" and x.lower() not in seen:
            out.append(x)
            seen.add(x.lower())
    return out


def city_fix(c):
    if not c:
        return None
    first = c.split(",")[0].strip()
    return INDIAN_CITY_FIX.get(first.lower(), first)


def blank_record():
    return {
        "id": None,
        "kind": None,              # angel | vc | corporate_vc | venture_debt | angel_network | accelerator | other
        "person_name": None,
        "title": None,
        "firm": None,
        "people": [],              # for fund rows with partner names but no personal email
        "email": None,
        "email_status": "none",    # listed | pattern_only | none
        "email_pattern": None,
        "other_emails": [],
        "how_to_reach": None,
        "pitch_form_url": None,
        "website": None,
        "linkedin_url": None,
        "city": None,
        "country": None,
        "india_based": None,
        "sectors": [],
        "sectors_raw": None,
        "stages": [],
        "stages_raw": None,
        "stages_inferred": False,  # true when stage comes only from investor type
        "cheque_min_usd": None,
        "cheque_max_usd": None,
        "cheque_min_inr_lakh": None,
        "cheque_max_inr_lakh": None,
        "cheque_raw": None,
        "leads_rounds": None,
        "portfolio": [],
        "portfolio_count": None,
        "response_time": None,
        "thesis": None,            # no source has this yet; filled by enrichment later
        "sources": [],
        "source_date": None,       # date of the oldest source file; not a verification date
        "last_checked": None,      # set only when a person checks the record by hand
        "needs_review": [],
    }


# ---------- readers, one per source sheet ----------

def read_impactverse_angels(path):
    out = []
    for rownum, r in read_rows(path, "Angels")[1:]:
        rec = blank_record()
        rec.update(kind="angel", person_name=r[1], city=city_fix(r[2]), country="India", india_based=True,
                   linkedin_url=norm_url(r[3]), website=norm_url(r[4]),
                   stages_raw=r[5], stages=stages_from(r[5]),
                   sectors_raw=r[6], sectors=sectors_from(r[6]),
                   cheque_raw=r[7], leads_rounds={"Yes": True, "No": False}.get(r[8]),
                   portfolio=split_list(r[10]), response_time=r[12])
        rec["portfolio_count"] = int(r[9]) if r[9] and r[9].isdigit() else None
        rec["cheque_min_usd"], rec["cheque_max_usd"] = cheque_from(r[7])
        em = emails_in(r[11])
        if em:
            rec["email"], rec["email_status"], rec["other_emails"] = em[0], "listed", em[1:]
        rec["sources"].append({"file": "impactverse_investor_list.xlsx", "sheet": "Angels", "row": rownum})
        out.append(rec)
    return out


def read_impactverse_funds(path):
    out = []
    kind_map = {"venture fund": "vc", "corporate vc": "corporate_vc", "venture debt": "venture_debt", "micro vc fund": "vc"}
    for rownum, r in read_rows(path, "Early Stage Investors")[1:]:
        rec = blank_record()
        t = (r[2] or "").lower()
        rec.update(kind=next((v for k, v in kind_map.items() if k in t), "vc"),
                   firm=r[1], city=city_fix(r[4]), country="India", india_based=True,
                   people=split_list(r[5]),
                   stages_raw=r[3], stages=stages_from(r[3]),
                   sectors_raw=r[7], sectors=sectors_from(r[7]))
        pattern, form = r[6], r[8]
        if pattern and "@" in pattern:
            local = pattern.split("@")[0].lower()
            if re.search(r"first|last|name", local):
                rec["email_pattern"], rec["email_status"] = pattern.lower().rstrip("."), "pattern_only"
            else:
                rec["email"], rec["email_status"] = pattern.lower().rstrip("."), "listed"
        if form:
            if "@" in form and "/" not in form:
                rec["other_emails"].append(form.lower())
            else:
                rec["pitch_form_url"] = norm_url(form)
        dom = domain_of(rec["email"] or rec["email_pattern"])
        rec["website"] = f"https://{dom}" if dom else None
        rec["sources"].append({"file": "impactverse_investor_list.xlsx", "sheet": "Early Stage Investors", "row": rownum})
        out.append(rec)
    return out


def read_impactverse_networks(path):
    out = []
    for rownum, r in read_rows(path, "AcceleratorAngel Network")[1:]:
        rec = blank_record()
        is_acc = (r[2] or "").lower().startswith("accel")
        rec.update(kind="accelerator" if is_acc else "angel_network", firm=r[1], website=norm_url(r[3]),
                   city=city_fix(r[4]), country="India", india_based=True,
                   cheque_raw=r[5], sectors_raw=r[6], sectors=sectors_from(r[6]), people=split_list(r[7]))
        rec["cheque_min_usd"], rec["cheque_max_usd"] = cheque_from(r[5])
        rec["stages"] = ["idea", "pre_seed"] if is_acc else ["pre_seed", "seed"]
        rec["stages_inferred"] = True
        pattern = r[8]
        if pattern and "@" in pattern:
            if re.search(r"first|last|name", pattern.split("@")[0].lower()):
                rec["email_pattern"], rec["email_status"] = pattern.lower().rstrip("."), "pattern_only"
            else:
                rec["email"], rec["email_status"] = pattern.lower().rstrip("."), "listed"
        if len(r) > 9 and r[9]:
            rec["pitch_form_url"] = norm_url(r[9])
        rec["sources"].append({"file": "impactverse_investor_list.xlsx", "sheet": "AcceleratorAngel Network", "row": rownum})
        out.append(rec)
    return out


def read_vc_access(path):
    out = []
    for rownum, r in read_rows(path)[1:]:
        if not r[2]:
            continue
        rec = blank_record()
        rec.update(kind="vc", person_name=r[1], firm=r[2], website=norm_url(r[3]),
                   how_to_reach=r[6], sectors_raw=r[7], sectors=sectors_from(r[7]),
                   portfolio=split_list(r[8]), country="India", india_based=True)
        em = emails_in(r[5])
        if em:
            rec["email"], rec["email_status"], rec["other_emails"] = em[0], "listed", em[1:]
        rec["sources"].append({"file": "vc_access_file.xlsx", "sheet": "Sheet1", "row": rownum})
        out.append(rec)
    return out


def read_jumbo(path):
    out = []
    for rownum, r in read_rows(path)[1:]:
        rec = blank_record()
        name = " ".join(x for x in (r[0], r[1]) if x)
        industry = (r[7] or "").lower()
        country = r[14]
        rec.update(kind="vc" if "venture capital" in industry else "other",
                   person_name=name or None, title=r[2], firm=r[3] or r[4],
                   website=norm_url(r[9]), linkedin_url=norm_url(r[8]),
                   city=city_fix(r[12]), country=country,
                   india_based=(country == "India") if country else None)
        em = emails_in(r[5])
        if em:
            rec["email"], rec["email_status"] = em[0], "listed"
        rec["sources"].append({"file": "jumbo_pack.xlsx", "sheet": "Sheet1", "row": rownum})
        out.append(rec)
    return out


# ---------- merge ----------

def merge_into(a, b):
    """Fold record b into record a. a keeps its values; b fills gaps and adds to lists."""
    for k, v in b.items():
        if k in ("id", "needs_review"):
            continue
        if isinstance(v, list):
            seen = {str(x).lower() for x in a[k]}
            for x in v:
                if str(x).lower() not in seen:
                    a[k].append(x)
                    seen.add(str(x).lower())
        elif k.endswith("_raw") and a[k] and v and v.lower() not in a[k].lower():
            a[k] = f"{a[k]} | {v}"  # keep every source's wording visible
        elif a.get(k) in (None, "", "none") and v not in (None, ""):
            a[k] = v
    if a["email_status"] == "pattern_only" and a["email"]:
        a["email_status"] = "listed"
    a["sectors"] = [s for s, _ in SECTOR_RULES if s in a["sectors"]]
    a["stages"] = [s for s in STAGE_LADDER if s in a["stages"]]


def build():
    iv = os.path.join(RAW, "impactverse_investor_list.xlsx")
    va = os.path.join(RAW, "vc_access_file.xlsx")
    jp = os.path.join(RAW, "jumbo_pack.xlsx")
    dates = {"impactverse_investor_list.xlsx": file_date(iv), "vc_access_file.xlsx": file_date(va), "jumbo_pack.xlsx": file_date(jp)}

    angels = read_impactverse_angels(iv)
    firm_rows = read_impactverse_funds(iv) + read_impactverse_networks(iv) + read_vc_access(va)
    people_rows = read_jumbo(jp)
    raw_count = len(angels) + len(firm_rows) + len(people_rows)

    # 1. Firm-level facts, keyed by website domain and by normalised name.
    firms, by_dom, by_name = [], {}, {}
    for rec in firm_rows:
        dom, nm = domain_of(rec["website"]), norm_firm(rec["firm"])
        hit = by_dom.get(dom) if dom else None
        hit = hit or (by_name.get(nm) if nm else None)
        if hit:
            merge_into(hit, rec)
        else:
            firms.append(rec)
            hit = rec
        if dom:
            by_dom.setdefault(dom, hit)
        if nm:
            by_name.setdefault(nm, hit)

    # 2. People from the Jumbo pack inherit their firm's sector, stage and portfolio.
    firm_fields = ["sectors", "sectors_raw", "stages", "stages_raw", "stages_inferred", "portfolio",
                   "how_to_reach", "pitch_form_url", "cheque_min_usd", "cheque_max_usd", "cheque_raw"]
    people, matched_firms = [], set()
    for p in people_rows:
        dom = domain_of(p["website"]) or domain_of(p["email"])
        firm = (by_dom.get(dom) if dom else None) or by_name.get(norm_firm(p["firm"]))
        if firm:
            for f in firm_fields:
                v = firm[f]
                if isinstance(v, list):
                    p[f] = list(v)
                elif p[f] in (None, False):
                    p[f] = v
            p["kind"] = firm["kind"] if p["kind"] == "other" else p["kind"]
            p["sources"] += firm["sources"]
            matched_firms.add(id(firm))
        people.append(p)

    # 3. A firm stays as its own record unless a named person with a listed
    #    email now carries its facts and the firm itself has no email.
    kept_firms = [f for f in firms if not (id(f) in matched_firms and f["email_status"] != "listed")]

    # 4. Dedupe everything by email.
    records, by_email = [], {}
    for rec in angels + people + kept_firms:
        e = rec["email"]
        if e and e in by_email:
            merge_into(by_email[e], rec)
            continue
        records.append(rec)
        if e:
            by_email[e] = rec

    # 5. Derived fields and review flags.
    for i, rec in enumerate(records, start=1):
        rec["id"] = f"inv_{i:04d}"
        rec["cheque_min_inr_lakh"] = to_lakh(rec["cheque_min_usd"])
        rec["cheque_max_inr_lakh"] = to_lakh(rec["cheque_max_usd"])
        rec["source_date"] = min(dates[s["file"]] for s in rec["sources"])
        flags = []
        if rec["email_status"] != "listed":
            flags.append("no_email" if rec["email_status"] == "none" else "email_pattern_only")
        if not rec["sectors"]:
            flags.append("no_sector")
        if not rec["stages"]:
            flags.append("no_stage")
        elif rec["stages_inferred"]:
            flags.append("stage_inferred")
        if rec["cheque_min_usd"] is None and rec["cheque_max_usd"] is None:
            flags.append("no_cheque_size")
        if rec["india_based"] is False:
            flags.append("not_india_based")
        if rec["kind"] == "other":
            flags.append("may_not_be_investor")
        if not rec["portfolio"]:
            flags.append("no_portfolio")
        rec["needs_review"] = flags

    return records, raw_count, dates


# ---------- outputs ----------

def summary(records, raw_count):
    def count(fn):
        return sum(1 for r in records if fn(r))
    focus = ["ai", "climate", "deeptech"]
    rows = [
        ("Raw rows read", raw_count),
        ("Records after merge", len(records)),
        ("With a listed email", count(lambda r: r["email_status"] == "listed")),
        ("Email pattern only", count(lambda r: r["email_status"] == "pattern_only")),
        ("No email at all", count(lambda r: r["email_status"] == "none")),
        ("India based", count(lambda r: r["india_based"])),
        ("With stage", count(lambda r: r["stages"])),
        ("With cheque size", count(lambda r: r["cheque_min_usd"] is not None or r["cheque_max_usd"] is not None)),
        ("With portfolio", count(lambda r: r["portfolio"])),
        ("With thesis", count(lambda r: r["thesis"])),
        ("Sector agnostic", count(lambda r: "sector_agnostic" in r["sectors"])),
    ]
    for s in focus:
        rows.append((f"Tagged {s}", count(lambda r, s=s: s in r["sectors"])))
        rows.append((f"Tagged {s} + listed email", count(lambda r, s=s: s in r["sectors"] and r["email_status"] == "listed")))
    rows.append(("Usable for AI/Climate/Deeptech (tagged or agnostic, listed email, India)",
                 count(lambda r: (set(focus) & set(r["sectors"]) or "sector_agnostic" in r["sectors"])
                       and r["email_status"] == "listed" and r["india_based"])))
    return rows


XLSX_COLUMNS = [
    ("id", 10), ("kind", 13), ("person_name", 22), ("title", 20), ("firm", 26), ("email", 30),
    ("email_status", 13), ("email_pattern", 24), ("city", 12), ("country", 12),
    ("sectors", 26), ("sectors_raw", 34), ("stages", 30), ("stages_raw", 28),
    ("cheque_min_inr_lakh", 11), ("cheque_max_inr_lakh", 11), ("cheque_raw", 18),
    ("leads_rounds", 8), ("portfolio", 40), ("how_to_reach", 20), ("pitch_form_url", 26),
    ("website", 26), ("linkedin_url", 30), ("response_time", 10), ("source_date", 11),
    ("last_checked", 11), ("needs_review", 34), ("sources", 30),
]


def cell_value(rec, key):
    v = rec[key]
    if key == "sources":
        return "; ".join(f"{s['file']}:{s['sheet']}:{s['row']}" for s in v)
    if isinstance(v, list):
        return ", ".join(v)
    if isinstance(v, bool):
        return "yes" if v else "no"
    return v


def write_xlsx(records, rows, dates):
    wb = openpyxl.Workbook()
    head_font = Font(bold=True, color="FFFFFF")
    head_fill = PatternFill("solid", fgColor="1A1A1A")
    warn_fill = PatternFill("solid", fgColor="FBE9E4")

    def sheet(ws, recs):
        ws.append([c for c, _ in XLSX_COLUMNS])
        for c in ws[1]:
            c.font, c.fill = head_font, head_fill
        for rec in recs:
            ws.append([cell_value(rec, c) for c, _ in XLSX_COLUMNS])
        for i, (_, w) in enumerate(XLSX_COLUMNS, start=1):
            ws.column_dimensions[get_column_letter(i)].width = w
        ws.freeze_panes = "C2"
        ws.auto_filter.ref = ws.dimensions
        status_col = [c for c, _ in XLSX_COLUMNS].index("email_status") + 1
        for row in ws.iter_rows(min_row=2):
            if row[status_col - 1].value != "listed":
                row[status_col - 1].fill = warn_fill
            for c in row:
                c.alignment = Alignment(vertical="top")

    ws = wb.active
    ws.title = "Investors"
    sheet(ws, records)

    focus = {"ai", "climate", "deeptech"}
    sheet(wb.create_sheet("AI-Climate-Deeptech"),
          [r for r in records if focus & set(r["sectors"])])
    sheet(wb.create_sheet("Needs review"),
          [r for r in records if {"no_email", "email_pattern_only", "not_india_based", "may_not_be_investor"} & set(r["needs_review"])])

    ss = wb.create_sheet("Summary")
    ss.append(["Measure", "Count"])
    for c in ss[1]:
        c.font, c.fill = head_font, head_fill
    for r in rows:
        ss.append(list(r))
    ss.append([])
    ss.append(["Built on", date.today().isoformat()])
    ss.append(["USD to INR rate used", USD_TO_INR])
    for f, d in dates.items():
        ss.append([f"Source file date: {f}", d])
    ss.column_dimensions["A"].width = 70
    ss.column_dimensions["B"].width = 14

    wb.move_sheet("Summary", offset=-3)
    wb.active = 0
    wb.save(OUT_XLSX)


def main():
    records, raw_count, dates = build()
    rows = summary(records, raw_count)
    with open(OUT_JSON, "w", encoding="utf-8") as f:
        json.dump({"format_version": SEED_FORMAT_VERSION, "built_on": date.today().isoformat(),
                   "usd_to_inr": USD_TO_INR, "source_dates": dates, "investors": records},
                  f, ensure_ascii=False, indent=2)
    write_xlsx(records, rows, dates)
    for k, v in rows:
        print(f"{k:75} {v}")
    print(f"\nWrote {OUT_JSON}\nWrote {OUT_XLSX}")


if __name__ == "__main__":
    main()
