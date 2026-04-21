#!/usr/bin/env python3
"""
single_source_corroboration.py

Augments entries in site/data/fights.json that currently have only ONE source
with 1-2 additional corroborating sources researched via web search.

For each touched entry:
  - appends new URLs to the `sources` array (dedupe, preserves order)
  - sets `last_updated = "2026-04-21"`

Summary printed at the end distinguishes:
  - AUGMENTED (added N sources)
  - FLAGGED   (unverifiable / contradictory / dead existing URL -> replaced)

Run from repo root:
    python3 scripts/single_source_corroboration.py
"""

import json
import os
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
FIGHTS_FILE = REPO_ROOT / "site" / "data" / "fights.json"
LAST_UPDATED = "2026-04-21"

# ---------------------------------------------------------------------------
# Corroboration research results
#
# Keys are entry IDs. Each value is a dict with:
#   add_sources:  list of new URLs to append
#   remove_sources: list of URLs to remove (e.g. confirmed-dead / fabricated)
#   flag: optional string describing verdict. Prefix "[UNVERIFIED]" or
#         "[CONTRADICTION]" as appropriate.
#   note: free-form human note (kept in the console summary only, not written
#         into the JSON).
#
# URLs were selected preferring: local news, advocacy groups, government
# pages, and trade press (DCD/Bisnow/Utility Dive/govtech/etc).
# ---------------------------------------------------------------------------

CORROBORATION = {
    "prince-george-s-county-md-2025-09-01": {
        "add_sources": [
            "https://marylandmatters.org/2025/09/17/prince-georges-county-moves-to-put-data-center-development-on-pause/",
            "https://commercialobserver.com/2025/09/data-center-pause-prince-george-maryland/",
            "https://dbknews.com/2025/12/04/prince-georges-county-data-centers/",
        ],
    },
    "east-vincent-township-pennhurst-pa-2025-10-01": {
        "add_sources": [
            "https://www.datacenterdynamics.com/en/news/plan-to-convert-former-psychiatric-hospital-near-philadelphia-into-data-center-set-to-be-blocked/",
            "https://vista.today/2026/02/recommend-denial-pennhurst-data-center-project/",
        ],
    },
    "east-rockhill-township-bucks-county-pa-2026-02-24": {
        "add_sources": [
            "https://centralbucksnews.com/news/2026/mar/31/east-rockhill-supervisors-advance-data-center-ordinance/",
            "https://www.bucksindependence.com/east-rockhill-supervisors-advance-data-center-ordinance/",
        ],
    },
    "east-manchester-township-pa-2025-10-14": {
        "add_sources": [
            "https://nationaltoday.com/us/pa/york/news/2026/04/09/york-county-approves-ordinances-for-regulated-data-centers/",
            "https://emanchestertwp.com/overview-of-data-centers-rezoning-public-comments/",
        ],
    },
    "connecticut-statewide-byop-ct-2026": {
        "add_sources": [
            "https://hartfordbusiness.com/article/ct-considers-bring-your-own-power-model-for-data-center-development/",
            "https://www.govtech.com/analytics/connecticut-local-officials-hesitant-over-data-centers",
        ],
    },
    "nj-s680-clean-energy-requirement-2026-01-13": {
        "add_sources": [
            "https://legiscan.com/NJ/text/S680/id/3311832",
            "https://www.njsendems.org/m/newsflash/home/detail/897",
        ],
    },
    "hanover-township-washington-county-pa-2026-03-31": {
        "add_sources": [
            "https://writing.strisker.com/data-centers-weekly-briefing-march-30-april-3-2026/",
            "https://www.pennfuture.org/Publication-Data-Center-Model-Ordinance",
        ],
    },
    "montgomery-township-pa-curative-2026-03-23": {
        # Existing northpennnow URL in data has a typo in the slug; the real
        # article lives at the same slug with a slightly different path. Add
        # the canonical URL and a secondary confirmation.
        "add_sources": [
            "https://northpennnow.com/news/2026/mar/25/montgomery-township-moves-to-fix-zoning-gap-on-data-centers/",
            "https://www.montgomerytwp.org/department/index.php?structureid=11",
        ],
    },
    "carver-mn-moratorium-2026-04-06": {
        "add_sources": [
            "https://bringmethenews.com/minnesota-news/carver-becomes-latest-city-to-impose-moratorium-on-data-centers",
            "https://www.govtech.com/artificial-intelligence/data-center-debate-settles-into-minnesota-city-halls",
        ],
    },
    "illinois-statewide-tax-freeze-2026-04": {
        "add_sources": [
            "https://www.nbcnews.com/politics/politics-news/gov-jb-pritzker-suspending-tax-incentives-data-centers-illinois-rcna259297",
            "https://www.datacenterdynamics.com/en/news/illinois-governor-pritzker-to-call-for-two-year-suspension-of-data-center-tax-incentives-report/",
            "https://www.axios.com/local/chicago/2026/02/18/illinois-freezes-data-center-tax-incentives-pritzker-trump-energy",
        ],
    },
    "brentwood-mo-zoning-2026-04-06": {
        "add_sources": [
            "https://writing.strisker.com/data-centers-daily-notes-april-7-2026/",
            "https://www.brentwoodmo.org/DocumentCenter/View/14462/Bill-No-6034-CUP-SP-2590-Brentwood-Ord",
        ],
    },
    "northfield-mn-regulatory-model-2026-04-08": {
        "add_sources": [
            "https://kymnradio.net/2024/12/10/city-allows-data-centers-in-the-northwest-industrial-area-highest-efficency-standards-in-mn-implemented/",
            "https://northfieldorg.substack.com/p/will-new-hyperscale-data-centers-shock-your-electric-bill",
        ],
    },
    "pike-county-oh-data-center-2026-04-13": {
        "add_sources": [
            "https://sciotovalleyguardian.com/2026/03/20/piketon-set-to-become-ground-zero-for-new-energy-megasite/",
            "https://www.datacenterdynamics.com/en/news/softbank-eyes-10gw-data-center-at-former-doe-nuclear-enrichment-site-in-ohio/",
            "https://www.10tv.com/article/news/local/boomtown-ohio/federal-officials-announce-data-center-power-plant-pike-county/530-e1c1c245-48f2-4512-82c0-234349b73705",
        ],
    },
    "oklahoma-hb-299-nda-ok-2026-03": {
        "add_sources": [
            "https://www.okenergytoday.com/2026/01/data-center-non-disclosure-agreements-target-of-legislators-transparency-bill/",
            "https://www.okenergytoday.com/2026/04/data-center-bill-awaits-state-senate-vote/",
            "https://www.readfrontier.org/stories/from-limiting-tax-breaks-to-moratoriums-oklahoma-legislators-eye-new-rules-for-data-centers/",
        ],
    },
    "arkansas-statewide-regulation-bills-2026-04-08": {
        "add_sources": [
            "https://arkansasadvocate.com/2026/04/13/crypto-mining-regulations-school-voucher-changes-could-be-debated-during-fiscal-session/",
            "https://trackingarkansas.substack.com/p/policy-briefing-the-rest-of-kings-89d",
        ],
    },
    "lowhill-township-lehigh-county-pa-2026-04-08": {
        "add_sources": [
            "https://www.lehighvalleynews.com/local-news/lehigh-valley-lining-up-to-regulate-data-centers-with-proposals-rolling-in",
            "https://pennfuture.org/post/DATA-CENTER-2026-LEGISLATION-DEBRIEF",
        ],
    },
    "montgomery-county-ordinance-guide-pa-2026-04": {
        "add_sources": [
            "https://chestercountyengineers.org/news/events/planning-for-the-digital-backbone-a-practical-guide-to-data-center-ordinances-for-engineers/",
            "https://www.chescoplanning.org/UandI/DataCenters/",
        ],
    },
    "botkins-oh-ban-2026-04": {
        "add_sources": [
            "https://writing.strisker.com/data-centers-daily-notes-april-16-2026/",
            "https://farmoffice.osu.edu/blog/mon-04062026-1124am/data-center-controversies-continue-ohio",
        ],
    },
    "dekalb-county-in-auburn-moratorium-2026-04": {
        "add_sources": [
            "https://www.kpcnews.com/thestar/article_a68d5dcb-09aa-46bf-9158-a17661e990e6.html",
            "https://www.fwbusiness.com/news/article_d485f49a-350b-5590-b151-7bb11f8d0e46.html",
        ],
    },
    "otoe-county-ne-moratorium-2026-04": {
        "add_sources": [
            "https://www.1011now.com/2026/04/17/otoe-county-planning-commission-recommends-data-center-moratorium/",
            "https://goodjobsfirst.org/data-center-moratorium-bills-are-spreading-in-2026/",
        ],
    },
    "rowan-county-nc-moratorium-2026-04-21": {
        "add_sources": [
            "https://www.wfae.org/politics/2026-04-21/rowan-county-approves-one-year-moratorium-on-new-data-centers",
            "https://www.wbtv.com/2026/04/21/rowan-county-commission-passes-data-center-moratorium/",
            "https://www.wcnc.com/article/news/local/data-center-debate-in-rowan-county-hits-a-boiling-point-with-a-vote-a-missing-commissioner-and-protests/275-d52cf75a-a25e-4364-85e8-1f1257721d17",
        ],
    },
    "clay-township-highland-county-oh-moratorium-2026-04-20": {
        "add_sources": [
            "https://www.registerherald.com/2026/04/20/trustees-place-moratorium-on-data-centers/",
            "https://farmoffice.osu.edu/blog/mon-04062026-1124am/data-center-controversies-continue-ohio",
        ],
    },
    "shreveport-la-mooringsport-lawsuit-2026-04-21": {
        "add_sources": [
            "https://www.ksla.com/2026/04/21/shreveport-data-center-lawsuit-city-shreveport-wins/",
            "https://www.ktbs.com/news/louisiana/judge-clears-path-for-amazon-data-center-in-west-shreveport/article_d38fb72d-978f-5fad-be41-4c93ff7224d2.html",
        ],
    },
    # Existing FERC URL is fabricated (404 on ferc.gov).  Replace with working
    # sources that describe the same April 16, 2026 decision.
    "federal-ferc-sunenergy1-waiver-denial-2026-04-16": {
        "remove_sources": [
            "https://www.ferc.gov/news-events/news/ferc-denies-sunenergy1-waiver-2026-04-16",
        ],
        "add_sources": [
            "https://www.ferc.gov/news-events/news/summaries-april-2026-commission-meeting",
            "https://www.whitecase.com/insight-alert/summary-ferc-meeting-agenda-april-2026",
            "https://www.utilitydive.com/news/ferc-doe-data-center-interconnection-pjm-backstop-auction/817804/",
        ],
        "flag": "[URL_REPLACED] Original ferc.gov URL was fabricated / 404; replaced with canonical FERC April 2026 meeting summary + trade press coverage confirming Murphy/Bells/SunEnergy1 waiver denial.",
    },
    # Existing EPA URL is fabricated (404 on epa.gov).  Replace with working
    # sources including the actual EPA press release.
    "federal-epa-title-v-streamlining-memo-2026-04-16": {
        "remove_sources": [
            "https://www.epa.gov/newsreleases/epa-streamlines-title-v-permit-renewals-2026-04-16",
        ],
        "add_sources": [
            "https://www.epa.gov/newsreleases/epa-issues-title-v-permitting-guidance-ensure-certainty-american-businesses-and",
            "https://www.epa.gov/system/files/documents/2026-04/guidance-on-streamlining-clean-air-act-title-v-operating-permit-renewals.pdf",
            "https://www.gibsondunn.com/epa-issues-guidance-on-streamlining-clean-air-act-title-v-permit-renewals/",
        ],
        "flag": "[URL_REPLACED] Original epa.gov URL was fabricated / 404; replaced with the actual EPA press release, the guidance PDF, and Gibson Dunn legal analysis.",
    },
    "centralia-mo-ordinance-2026-04-20": {
        "add_sources": [
            "https://krcgtv.com/news/local/centralia-leaders-consider-zoning-changes-to-regulate-data-centers",
            "https://www.centraliamo.gov/media/1826",
        ],
    },
    "sanford-nc-udo-draft-2026-04-21": {
        "add_sources": [
            "https://rantnc.com/2026/04/08/commissioners-hear-proposed-data-center-standards/",
            "https://sandhills.news/2026/03/18/sanford-releases-faq-document-on-data-centers/",
        ],
    },
    "horry-county-sc-zoning-draft-2026-04": {
        "add_sources": [
            "https://www.wbtw.com/news/grand-strand/horry-county/horry-county-committee-tables-discussion-on-data-center-regulation-ordinance/",
            "https://www.wbtw.com/growthtracker/horry-county-looking-at-local-data-center-control-policy-amid-state-level-talks/",
        ],
    },
    # Nashville: existing source is multistate.us policy roundup, which is
    # weak/questionable for the claim that Title 17 amendments passed on
    # third reading April 7 and became effective April 17. Targeted searches
    # did not surface confirming local-news coverage of a Metro Nashville
    # Title 17 data-center amendment on those specific dates. Flag for
    # review rather than inventing corroborating sources.
    "nashville-davidson-zoning-tn-2026-04-17": {
        "add_sources": [
            "https://library.municode.com/tn/metro_government_of_nashville_and_davidson_county/codes/code_of_ordinances?nodeId=CD_TIT17ZO",
        ],
        "flag": "[UNVERIFIED] No local Nashville news coverage found confirming the April 7 third-reading / April 17 effective date for Title 17 data-center amendments. Only the MultiState policy roundup references this. Added Municode Title 17 link as a canonical reference, but the specific claim needs manual verification.",
    },
    "upper-gwynedd-township-pa-ordinance-2026-04-13": {
        "add_sources": [
            "https://www.uppergwynedd.org/code-enforcementbuilding-zoning/pages/permits-ordinances",
            "https://writing.strisker.com/data-centers-weekly-briefing-april-13-17-2026/",
        ],
    },
}


def dedupe_preserve_order(seq):
    seen = set()
    out = []
    for x in seq:
        if x and x not in seen:
            seen.add(x)
            out.append(x)
    return out


def main():
    if not FIGHTS_FILE.exists():
        sys.exit(f"fights.json not found at {FIGHTS_FILE}")

    with open(FIGHTS_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)

    ids_to_entry = {e["id"]: e for e in data}

    # Sanity check: all corroboration targets must currently have exactly one
    # source in the dataset. Warn if assumption violated.
    single_ids = {
        e["id"]
        for e in data
        if isinstance(e.get("sources"), list) and len(e["sources"]) == 1
    }
    missing_from_data = [k for k in CORROBORATION if k not in ids_to_entry]
    not_single_anymore = [k for k in CORROBORATION if k in ids_to_entry and k not in single_ids]
    if missing_from_data:
        print("WARN: IDs not found in fights.json:", missing_from_data)
    if not_single_anymore:
        print(
            "WARN: IDs no longer have exactly 1 source (may already be augmented):",
            not_single_anymore,
        )

    augmented = []
    flagged = []

    for entry_id, info in CORROBORATION.items():
        entry = ids_to_entry.get(entry_id)
        if entry is None:
            continue

        original_sources = list(entry.get("sources") or [])
        remove = set(info.get("remove_sources") or [])
        add = info.get("add_sources") or []

        new_sources = [s for s in original_sources if s not in remove]
        new_sources.extend(add)
        new_sources = dedupe_preserve_order(new_sources)

        added_count = len(new_sources) - len(
            [s for s in original_sources if s not in remove]
        )

        entry["sources"] = new_sources
        entry["last_updated"] = LAST_UPDATED

        record = {
            "id": entry_id,
            "added": added_count,
            "removed": len(remove & set(original_sources)),
            "flag": info.get("flag"),
            "final_sources": new_sources,
        }
        if info.get("flag"):
            flagged.append(record)
        else:
            augmented.append(record)

    with open(FIGHTS_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
        f.write("\n")

    print()
    print("=" * 72)
    print(f"Single-source corroboration complete")
    print("=" * 72)
    print(f"Total entries touched : {len(augmented) + len(flagged)}")
    print(f"  AUGMENTED           : {len(augmented)}")
    print(f"  FLAGGED             : {len(flagged)}")
    print()

    print("--- AUGMENTED ---")
    for r in augmented:
        print(f"\nID: {r['id']}")
        print(f"VERDICT: AUGMENTED (added {r['added']} sources"
              + (f", removed {r['removed']}" if r['removed'] else "") + ")")
        print("Added sources:")
        for s in r["final_sources"]:
            print(f"  - {s}")

    if flagged:
        print("\n--- FLAGGED ---")
        for r in flagged:
            print(f"\nID: {r['id']}")
            print(f"VERDICT: FLAGGED (added {r['added']}"
                  + (f", removed {r['removed']}" if r['removed'] else "") + ")")
            print(f"Reason: {r['flag']}")
            print("Final sources:")
            for s in r["final_sources"]:
                print(f"  - {s}")


if __name__ == "__main__":
    main()
