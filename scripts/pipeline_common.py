"""Shared helpers for the investor growth pipeline (see docs/DATA_PIPELINE.md).

Matching rules used everywhere a new name meets the existing list:
  1. same website domain (personal mail hosts and shared platforms don't count)
  2. same cleaned firm name, unless both have their own website and the sites differ
  3. same person name, and either the same firm or no firm on one side
"""

import hashlib
import json
import os
import re
from urllib.parse import urlparse

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SEED = os.path.join(ROOT, "seed")
ENR = os.path.join(SEED, "enrichment")
DISCOVERED = os.path.join(SEED, "discovered")

KINDS = ["vc", "angel", "angel_network", "accelerator", "corporate_vc", "family_office", "grant", "venture_debt", "other"]
SECTORS = ["ai", "climate", "deeptech", "b2b_saas", "fintech", "consumer", "health", "edtech", "agritech",
           "web3", "adtech", "impact", "sector_agnostic", "tech_general"]
STAGES = ["idea", "pre_seed", "seed", "pre_series_a", "series_a", "series_b_plus"]

# Domains many unrelated investors share; a match on these says nothing.
SHARED_DOMAINS = {
    "gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "yahoo.co.in", "rediffmail.com", "icloud.com",
    "linkedin.com", "angellist.com", "angel.co", "venture.angellist.com", "letsventure.com", "medium.com",
    "substack.com", "twitter.com", "x.com", "github.io", "google.com", "sites.google.com", "notion.site",
    "wordpress.com", "blogspot.com", "startupindia.gov.in", "sebi.gov.in", "aim.gov.in",
}

# An email printed on one of these counts as published by an official source.
OFFICIAL_SUFFIXES = (".gov.in", ".nic.in", ".ac.in", ".res.in", ".edu")


def domain(url_or_email):
    if not url_or_email:
        return None
    s = url_or_email.strip().lower()
    if "@" in s and "/" not in s:
        s = s.split("@", 1)[1]
    else:
        if not s.startswith("http"):
            s = "http://" + s
        s = urlparse(s).netloc or s
    s = s.split("/")[0].split(":")[0].strip(".").removeprefix("www.")
    return s if "." in s else None


def same_site(a, b):
    """True when one domain is the other or a subdomain of it (pitch.fund.vc vs fund.vc)."""
    if not a or not b:
        return False
    return a == b or a.endswith("." + b) or b.endswith("." + a)


def norm_firm(name):
    if not name:
        return None
    s = name.lower()
    s = re.split(r"\s[|–—-]\s|\s\(", s)[0]
    s = re.sub(r"\b(ventures?|capital|partners|fund|funds|vc|advisors|investments?|india|management|"
               r"llp|pvt|private|limited|ltd|the|trust|aif|scheme|foundation)\b", " ", s)
    return re.sub(r"[^a-z0-9]", "", s) or None


def norm_person(name):
    if not name:
        return None
    s = re.sub(r"\b(dr|mr|ms|mrs|shri)\b\.?", " ", name.lower())
    return re.sub(r"[^a-z]", "", s) or None


def slugify(s, n=50):
    return re.sub(r"[^a-z0-9]+", "-", (s or "").lower()).strip("-")[:n]


def stable_id(key):
    """New records get an id that survives rebuilds, so the Convex seedId never shifts."""
    return "g_" + hashlib.sha1(key.encode()).hexdigest()[:10]


def candidate_key(c):
    d = domain(c.get("website"))
    if c.get("firm"):
        if d and d not in SHARED_DOMAINS:
            return "firm:" + d
        return "firm:" + (norm_firm(c["firm"]) or slugify(c["firm"]))
    return "person:" + (norm_person(c.get("person_name")) or slugify(c.get("person_name")))


class Matcher:
    """Finds an existing record (or earlier candidate) for a name, by the rules at the top."""

    def __init__(self):
        self.by_domain, self.by_firm, self.by_person = {}, {}, {}

    def add(self, ref, firm=None, person=None, website=None, email=None):
        for d in (domain(website), domain(email) if firm else None):
            if d and d not in SHARED_DOMAINS:
                self.by_domain.setdefault(d, ref)
        f = norm_firm(firm)
        if f:
            d = domain(website)
            self.by_firm.setdefault(f, (ref, d if d and d not in SHARED_DOMAINS else None))
        p = norm_person(person)
        if p:
            self.by_person.setdefault(p, []).append((f, ref))

    def find(self, firm=None, person=None, website=None):
        d = domain(website)
        if d and d not in SHARED_DOMAINS:
            for known, ref in self.by_domain.items():
                if same_site(d, known):
                    return ref, "domain"
        f = norm_firm(firm)
        if f and f in self.by_firm and not person:
            ref, known = self.by_firm[f]
            if not (d and d not in SHARED_DOMAINS and known and not same_site(d, known)):
                return ref, "firm"
        p = norm_person(person)
        if p and p in self.by_person:
            for kf, ref in self.by_person[p]:
                if f is None or kf is None or kf == f:
                    return ref, "person"
        return None, None


def load_json(path, default=None):
    if not os.path.exists(path):
        return default
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def save_json(path, data):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def read_jsonl(path):
    rows, bad = [], []
    with open(path, encoding="utf-8") as f:
        for i, line in enumerate(f, start=1):
            line = line.strip()
            if not line:
                continue
            try:
                rows.append(json.loads(line))
            except json.JSONDecodeError as e:
                bad.append(f"{os.path.basename(path)} line {i}: {e}")
    return rows, bad


def matcher_for_records(records):
    m = Matcher()
    for r in records:
        m.add(("record", r["id"]), r.get("firm"), r.get("person_name"), r.get("website"), r.get("email"))
    return m
