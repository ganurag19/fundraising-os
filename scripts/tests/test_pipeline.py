"""Tests for the investor growth pipeline. Made-up investors only; runs in a temp folder.

Run: python3 -m unittest discover scripts/tests
"""

import datetime
import json
import os
import shutil
import sys
import tempfile
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(HERE))

import add_candidates  # noqa: E402
import build_import  # noqa: E402
import check_records  # noqa: E402
import merge_enrichment  # noqa: E402
import refresh_queue  # noqa: E402
from pipeline_common import Matcher, domain, stable_id  # noqa: E402

TODAY = datetime.date(2026, 10, 13)


def legacy(id_, **kw):
    r = merge_enrichment.new_record({"id": id_, "kind": "vc", "firm": None, "discovered": []})
    r.pop("origin")
    r.update({"email_status": "listed", "india_based": True, "country": "India",
              "sources": [{"file": "made_up.xlsx", "sheet": "Funds", "row": 2}]})
    r.update(kw)
    return r


def candidate(**kw):
    c = {"kind": "vc", "firm": None, "person_name": None, "website": None, "city": None, "sectors_hint": [],
         "found_via": "fund_site", "source_url": "https://example.test/list", "deal": None, "note": None}
    c.update(kw)
    return c


def result(slug, **kw):
    r = {"slug": slug, "checked_on": "2026-10-13", "website": None, "active": True, "thesis": None, "sectors": [],
         "stages": [], "cheque_min_inr_lakh": None, "cheque_max_inr_lakh": None, "recent_investments": [],
         "portfolio_add": [], "pitch_route": None, "public_email": None, "email_source_url": None, "sources": [],
         "identity_confirmed": None, "confidence": "high", "blocked": [], "notes": None}
    r.update(kw)
    return r


class Seed:
    def __init__(self, records):
        self.dir = tempfile.mkdtemp(prefix="fc-test-")
        os.makedirs(os.path.join(self.dir, "enrichment", "results"))
        os.makedirs(os.path.join(self.dir, "discovered"))
        data = {"investors": records}
        for name in ("investors.json", "investors_enriched.json"):
            json.dump(data, open(os.path.join(self.dir, name), "w"))

    def discover(self, name, rows):
        with open(os.path.join(self.dir, "discovered", name), "w") as f:
            f.write("\n".join(json.dumps(r) for r in rows) + "\n")

    def add_result(self, res):
        json.dump(res, open(os.path.join(self.dir, "enrichment", "results", res["slug"] + ".json"), "w"))

    def load(self, *parts):
        return json.load(open(os.path.join(self.dir, *parts)))

    def records(self):
        return {r["id"]: r for r in self.load("investors_enriched.json")["investors"]}

    def growth_slug(self, name):
        return next(u["slug"] for u in self.load("enrichment", "queue_growth.json") if (u["firm"] or u["person_name"]) == name)

    def pipeline(self, fetch=None):
        merge_enrichment.run(self.dir)
        check_records.run(self.dir, today=TODAY, fetch=fetch)

    def close(self):
        shutil.rmtree(self.dir)


class MatchingTest(unittest.TestCase):
    def test_domain_handles_urls_emails_and_www(self):
        self.assertEqual(domain("https://www.Example.test/about"), "example.test")
        self.assertEqual(domain("pitch@example.test"), "example.test")
        self.assertIsNone(domain(""))

    def test_subdomain_firm_name_and_person_match(self):
        m = Matcher()
        m.add("a", firm="Blue Kettle Ventures", website="https://bluekettle.test")
        m.add("b", person="Dr. Meera Testwala")
        self.assertEqual(m.find(website="https://apply.bluekettle.test")[0], "a")
        self.assertEqual(m.find(firm="Blue Kettle Capital")[0], "a")
        self.assertEqual(m.find(person="Meera Testwala")[0], "b")
        self.assertEqual(m.find(firm="Green Teapot Fund", website="https://greenteapot.test"), (None, None))

    def test_same_name_different_sites_is_not_a_match(self):
        m = Matcher()
        m.add("a", firm="Beyondish Venture Partners", website="https://beyondishvp.test")
        self.assertEqual(m.find(firm="Beyondish Capital Fund", website="https://beyondishcapital.test"), (None, None))
        self.assertEqual(m.find(firm="Beyondish Capital Fund")[0], "a")

    def test_programmes_and_grants_on_a_shared_site_stay_apart(self):
        m = Matcher()
        m.add("fund", firm="Made-up Partners", website="https://madeup.test", kind="vc")
        m.add("scheme", firm="Made-up Ministry Seed Grant", website="https://ministry.test/seed", kind="grant")
        self.assertEqual(m.find(firm="Made-up Surge", website="https://madeup.test/surge", kind="accelerator"), (None, None))
        self.assertEqual(m.find(firm="Made-up Fund II", website="https://madeup.test", kind="vc")[0], "fund")
        self.assertEqual(m.find(firm="Made-up Ministry Other Scheme", website="https://ministry.test/other", kind="grant"), (None, None))
        self.assertEqual(m.find(firm="Made-up Ministry Seed Grant", kind="grant")[0], "scheme")

    def test_shared_domains_never_match(self):
        m = Matcher()
        m.add("a", firm="One Fund", website="https://letsventure.com/one")
        self.assertEqual(m.find(firm="Two Fund", website="https://letsventure.com/two"), (None, None))

    def test_incubators_split_from_accelerators(self):
        from pipeline_common import refine_kind
        self.assertEqual(refine_kind("accelerator", "AIC Made-up Institute Foundation"), "incubator")
        self.assertEqual(refine_kind("accelerator", "Fictional Labs", "SISFS incubator"), "incubator")
        self.assertEqual(refine_kind("accelerator", "Made-up Cohort Program"), "accelerator")
        self.assertEqual(refine_kind("vc", "Made-up University Fund"), "vc")

    def test_stable_id_does_not_change(self):
        self.assertEqual(stable_id("firm:x.test"), stable_id("firm:x.test"))


class AddCandidatesTest(unittest.TestCase):
    def setUp(self):
        self.s = Seed([legacy("inv_0001", firm="Blue Kettle Ventures", website="https://bluekettle.test",
                              email="hello@bluekettle.test")])

    def tearDown(self):
        self.s.close()

    def test_new_known_and_bad_lines(self):
        self.s.discover("pilot.jsonl", [
            candidate(firm="Blue Kettle Capital", website="https://www.bluekettle.test",
                      deal={"company": "Madeup Grid", "year": 2026, "round": "seed", "sector": "climate",
                            "source_url": "https://news.test/a"}),
            candidate(firm="Green Teapot Fund", website="https://greenteapot.test", sectors_hint=["ai", "nonsense"]),
            candidate(kind="angel", person_name="Ravi Fictional"),
            candidate(kind="spaceship", firm="Bad Kind"),
            candidate(firm="No Source", source_url=None),
        ])
        s = add_candidates.run(self.s.dir)
        self.assertEqual((s["added"], s["matched"], s["deals"], s["rejected"]), (2, 1, 1, 2))
        q = self.s.load("enrichment", "queue_growth.json")
        self.assertEqual(q[0]["known_sectors"], ["ai"])
        self.assertEqual(self.s.load("enrichment", "deals.json")[0]["record_id"], "inv_0001")

    def test_two_schemes_on_one_site_get_two_ids(self):
        self.s.discover("g.jsonl", [candidate(kind="grant", firm="Made-up Scheme One", website="https://ministry.test/one"),
                                    candidate(kind="grant", firm="Made-up Scheme Two", website="https://ministry.test/two")])
        self.assertEqual(add_candidates.run(self.s.dir)["added"], 2)
        ids = [u["id"] for u in self.s.load("enrichment", "queue_growth.json")]
        self.assertEqual(len(set(ids)), 2)
        self.assertEqual(add_candidates.run(self.s.dir)["added"], 0)

    def test_rerun_adds_nothing_and_keeps_extra_sightings(self):
        self.s.discover("a.jsonl", [candidate(firm="Green Teapot Fund", website="https://greenteapot.test")])
        add_candidates.run(self.s.dir)
        self.s.discover("b.jsonl", [candidate(firm="Green Teapot", website="https://greenteapot.test",
                                              source_url="https://other.test/list")])
        s = add_candidates.run(self.s.dir)
        self.assertEqual(s["added"], 0)
        q = self.s.load("enrichment", "queue_growth.json")
        self.assertEqual(len(q), 1)
        self.assertEqual(len(q[0]["discovered"]), 2)


class MergeAndCheckTest(unittest.TestCase):
    def setUp(self):
        self.s = Seed([
            legacy("inv_0001", firm="Blue Kettle Ventures", website="https://bluekettle.test", email="hello@bluekettle.test"),
            legacy("inv_0002", kind="angel", person_name="Old Angel Example", email="old.angel@mail.test"),
        ])
        json.dump([{"slug": "old-angel-002", "record_ids": ["inv_0002"], "firm": None, "person_name": "Old Angel Example"}],
                  open(os.path.join(self.s.dir, "enrichment", "queue.json"), "w"))
        self.s.add_result(result("old-angel-002", identity_confirmed=False, confidence="low", active=None))
        self.s.discover("pilot.jsonl", [
            candidate(firm="Green Teapot Fund", website="https://greenteapot.test",
                      deal={"company": "Madeup Labs", "year": 2026, "round": "pre_seed", "sector": "ai",
                            "source_url": "https://news.test/b"}),
            candidate(firm="Copied Email Fund", website="https://copied.test"),
            candidate(kind="accelerator", firm="Campus Incubator Test", website="https://incubator.test"),
            candidate(kind="angel", person_name="Unsure Angel"),
            candidate(kind="grant", firm="Made-up Seed Scheme", website="https://scheme.test"),
        ])
        add_candidates.run(self.s.dir)
        s = self.s.growth_slug
        src = lambda url, *f: {"url": url, "supports": list(f)}
        self.s.add_result(result(s("Green Teapot Fund"), thesis="Backs AI founders.", stages=["seed", "pre_seed"],
                                 sectors=["ai"], india_based=True, public_email="pitch@greenteapot.test",
                                 email_source_url="https://greenteapot.test/contact",
                                 sources=[src("https://greenteapot.test/about", "thesis", "stages", "sectors", "india_based"),
                                          src("https://greenteapot.test/contact", "public_email")]))
        self.s.add_result(result(s("Copied Email Fund"), india_based=True, public_email="team@copied.test",
                                 email_source_url="https://directory.test/copied",
                                 sources=[src("https://copied.test", "india_based")]))
        self.s.add_result(result(s("Campus Incubator Test"), kind="accelerator", active=None, india_based=True,
                                 public_email="apply@incubator.ac.in", email_source_url="https://incubator.ac.in/contact",
                                 application={"url": "https://incubator.ac.in/apply", "deadline": None, "type": "rolling"},
                                 sources=[src("https://incubator.ac.in/contact", "public_email", "india_based", "application")]))
        self.s.add_result(result(s("Unsure Angel"), identity_confirmed=False, confidence="low", active=None))
        self.s.add_result(result(s("Made-up Seed Scheme"), kind="grant", india_based=True, public_email="seed@scheme.gov.in",
                                 email_source_url="https://scheme.gov.in/contact",
                                 sources=[src("https://scheme.gov.in/contact", "public_email", "india_based")]))
        self.s.pipeline()
        self.r = self.s.records()
        self.by_name = {(x.get("firm") or x.get("person_name")): x for x in self.r.values()}

    def tearDown(self):
        self.s.close()

    def test_new_investor_becomes_a_record_with_its_email_and_deal(self):
        g = self.by_name["Green Teapot Fund"]
        self.assertTrue(g["id"].startswith("g_"))
        self.assertEqual((g["email"], g["email_status"]), ("pitch@greenteapot.test", "listed"))
        self.assertEqual(g["stages"], ["pre_seed", "seed"])
        self.assertEqual(g["recent_investments"][0]["sector"], "ai")
        self.assertIn("Madeup Labs", g["portfolio"])
        self.assertEqual(g["check_failures"], [])
        self.assertFalse(g["import_blocked"])

    def test_email_from_a_third_party_page_is_blocked(self):
        c = self.by_name["Copied Email Fund"]
        self.assertIn("contact", c["check_failures"])
        self.assertEqual(c["checks"]["email"]["result"], "fail")
        self.assertTrue(c["import_blocked"])

    def test_accelerator_needs_no_deals_and_keeps_its_application_link(self):
        a = self.by_name["Campus Incubator Test"]
        self.assertEqual(a["kind"], "incubator")
        self.assertEqual(a["check_failures"], ["active"])
        self.assertFalse(a["import_blocked"])
        self.assertEqual(a["application"]["url"], "https://incubator.ac.in/apply")

    def test_unconfirmed_angel_new_is_excluded_old_is_kept(self):
        self.assertTrue(self.by_name["Unsure Angel"]["exclude"])
        old = self.r["inv_0002"]
        self.assertFalse(old["exclude"])
        self.assertFalse(old["import_blocked"])

    def test_email_seen_on_page_check(self):
        pages = {"https://greenteapot.test/contact": "Write to pitch [at] greenteapot [dot] test",
                 "https://incubator.ac.in/contact": "nothing here"}
        self.s.pipeline(fetch=lambda u: pages.get(u))
        r = {(x.get("firm") or x.get("person_name")): x for x in self.s.records().values()}
        self.assertEqual(r["Green Teapot Fund"]["checks"]["email"]["why"], "seen on page")
        self.assertTrue(r["Campus Incubator Test"]["import_blocked"])

    def test_spot_check_list_is_written(self):
        path = os.path.join(self.s.dir, "enrichment", "spot_check_2026-10-13.md")
        self.assertTrue(open(path).read().startswith("# Spot check, 2026-10-13"))

    def build(self, schema):
        out = os.path.join(self.s.dir, f"import{schema}.jsonl")
        build_import.SRC, build_import.OUT = os.path.join(self.s.dir, "investors_enriched.json"), out
        build_import.REGISTRY = os.path.join(self.s.dir, "enrichment", "exported_ids.json")
        build_import.main(schema)
        rows = list(map(json.loads, open(out)))
        self.retired = [d["seedId"] for d in rows if d.get("retired")]
        return {d["displayName"]: d for d in rows if not d.get("retired")}

    def test_dropped_investor_gets_a_retired_line_and_returns_cleanly(self):
        gid = self.by_name["Green Teapot Fund"]["id"]
        self.build(2)
        self.assertEqual(self.retired, [])
        self.s.add_result(result(self.s.growth_slug("Green Teapot Fund"), checked_on="2026-10-14", active=False))
        self.s.pipeline()
        self.assertNotIn("Green Teapot Fund", self.build(2))
        self.assertEqual(self.retired, [gid])
        line = [json.loads(l) for l in open(os.path.join(self.s.dir, "import2.jsonl")) if '"retired"' in l][0]
        self.assertEqual(line, {"seedId": gid, "retired": True})

    def test_shifted_ids_stop_the_build(self):
        self.build(2)
        recs = self.s.load("investors_enriched.json")
        for r in recs["investors"]:
            if r["id"] == "inv_0001":
                r["firm"], r["email"] = "Totally Other Fund", "hi@other.test"
        json.dump(recs, open(os.path.join(self.s.dir, "investors_enriched.json"), "w"))
        with self.assertRaises(SystemExit):
            self.build(2)

    def test_apply_link_counts_as_contact_only_on_schema_2(self):
        s = self.s.growth_slug
        self.s.add_result(result(s("Copied Email Fund"), india_based=True,
                                 pitch_route={"type": "form", "value": "https://copied.test/pitch"},
                                 sources=[{"url": "https://copied.test/pitch", "supports": ["india_based", "pitch_route"]}]))
        self.s.pipeline()
        one, two = self.build(1), self.build(2)
        self.assertNotIn("Copied Email Fund", one)
        self.assertEqual(two["Copied Email Fund"]["applyUrl"], "https://copied.test/pitch")
        self.assertNotIn("email", two["Copied Email Fund"])
        self.assertIn("Made-up Seed Scheme", two)
        self.assertNotIn("Made-up Seed Scheme", one)
        self.assertEqual(two["Campus Incubator Test"]["applyType"], "rolling")
        self.assertEqual(two["Green Teapot Fund"]["recent"][0]["sector"], "ai")
        self.assertNotIn("sector", one["Green Teapot Fund"]["recent"][0])

    def test_apply_link_on_another_site_does_not_count(self):
        s = self.s.growth_slug
        self.s.add_result(result(s("Copied Email Fund"), india_based=True,
                                 application={"url": "https://forms.example.test/x", "deadline": None, "type": None},
                                 sources=[{"url": "https://forms.example.test/x", "supports": ["india_based", "application"]}]))
        self.s.pipeline()
        self.assertTrue(self.s.records()[self.by_name["Copied Email Fund"]["id"]]["import_blocked"])

    def test_outside_form_counts_when_their_own_page_links_it(self):
        s = self.s.growth_slug
        form = "https://forms.example.test/x?usp=sf"
        self.s.add_result(result(s("Copied Email Fund"), india_based=True, pitch_route={"type": "form", "value": form},
                                 sources=[{"url": "https://copied.test/contact", "supports": ["india_based", "pitch_route"]}]))
        self.s.pipeline()
        rid = self.by_name["Copied Email Fund"]["id"]
        self.assertEqual(self.s.records()[rid]["checks"]["apply"]["why"], "form linked from own site")
        self.s.pipeline(fetch=lambda u: {"https://copied.test/contact": '<a href="https://forms.example.test/x">Pitch</a>',
                                         form: "form"}.get(u))
        self.assertFalse(self.s.records()[rid]["import_blocked"])
        self.s.pipeline(fetch=lambda u: {"https://copied.test/contact": "no link here", form: "form"}.get(u))
        self.assertTrue(self.s.records()[rid]["import_blocked"])

    def test_failed_email_is_never_exported_even_with_an_apply_link(self):
        s = self.s.growth_slug
        self.s.add_result(result(s("Copied Email Fund"), india_based=True, public_email="team@copied.test",
                                 email_source_url="https://directory.test/copied",
                                 pitch_route={"type": "form", "value": "https://copied.test/pitch"},
                                 sources=[{"url": "https://copied.test/pitch", "supports": ["india_based", "pitch_route"]}]))
        self.s.pipeline()
        self.assertNotIn("Copied Email Fund", self.build(1))
        row = self.build(2)["Copied Email Fund"]
        self.assertNotIn("email", row)
        self.assertEqual(row["applyUrl"], "https://copied.test/pitch")

    def test_cloudflare_hidden_email_is_seen(self):
        key, em = 0x5a, "pitch@greenteapot.test"
        hexed = "%02x" % key + "".join("%02x" % (ord(c) ^ key) for c in em)
        self.s.pipeline(fetch=lambda u: f'<a data-cfemail="{hexed}">[email protected]</a>')
        g = self.s.records()[self.by_name["Green Teapot Fund"]["id"]]
        self.assertEqual(g["checks"]["email"]["why"], "seen on page")

    def test_import_skips_blocked_and_grants(self):
        names = list(self.build(1))
        self.assertIn("Green Teapot Fund", names)
        self.assertIn("Campus Incubator Test", names)
        self.assertIn("Blue Kettle Ventures", names)
        for gone in ("Copied Email Fund", "Unsure Angel", "Made-up Seed Scheme"):
            self.assertNotIn(gone, names)

    def test_refresh_overwrites_and_known_investor_gets_the_deal(self):
        self.s.discover("deals_2026-10.jsonl", [candidate(firm="Blue Kettle Ventures", website="https://bluekettle.test",
                                                          found_via="funding_report",
                                                          deal={"company": "Fictional Foods", "year": 2026, "round": "seed",
                                                                "sector": "agritech", "source_url": "https://news.test/c"})])
        add_candidates.run(self.s.dir)
        q = refresh_queue.run(self.s.dir, months=6, today=datetime.date(2027, 6, 1))
        units = self.s.load("enrichment", os.path.basename(q["path"]))
        gt = next(u for u in units if u["firm"] == "Green Teapot Fund")
        self.s.add_result(result(gt["slug"], checked_on="2027-06-01", thesis="Now backs climate too.",
                                 sources=[{"url": "https://greenteapot.test/about", "supports": ["thesis"]}]))
        self.s.pipeline()
        r = self.s.records()
        self.assertEqual(self.by_name["Green Teapot Fund"]["id"] in r, True)
        self.assertEqual(r[self.by_name["Green Teapot Fund"]["id"]]["thesis"], "Now backs climate too.")
        self.assertEqual(r[self.by_name["Green Teapot Fund"]["id"]]["last_checked"], "2027-06-01")
        self.assertEqual(r["inv_0001"]["recent_investments"][0]["company"], "Fictional Foods")


class RefreshQueueTest(unittest.TestCase):
    def test_never_checked_first_and_recent_ones_left_out(self):
        s = Seed([legacy("inv_0001", firm="Checked Recently", last_checked="2026-09-01"),
                  legacy("inv_0002", firm="Checked Long Ago", last_checked="2026-01-01"),
                  legacy("inv_0003", firm="Never Checked"),
                  legacy("inv_0004", firm="Gone Quiet", exclude=True)])
        try:
            q = refresh_queue.run(s.dir, months=6, today=TODAY)
            units = s.load("enrichment", os.path.basename(q["path"]))
            self.assertEqual([u["firm"] for u in units], ["Never Checked", "Checked Long Ago"])
        finally:
            s.close()


if __name__ == "__main__":
    unittest.main()
