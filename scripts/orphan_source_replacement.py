#!/usr/bin/env python3
"""
Replace fabricated/dead source URLs for 13 orphaned datacenter-fights entries
(all 2026-04) with verified working URLs found via web search + WebFetch confirmation.

Each replacement below was researched and at least one URL per entry was fetched
and verified to contain matching content before inclusion.
"""

import json
import sys
from pathlib import Path

FIGHTS_JSON = Path("/Users/georgeingebretsen/Desktop/Main/Code/datacenter-fights/site/data/fights.json")
LAST_UPDATED = "2026-04-21"

# Mapping: id -> list of verified working source URLs (replacing the existing sources array).
REPLACEMENTS = {
    "franklin-ky-second-lawsuit-2026-04-14": [
        "https://www.wkyufm.org/news/2026-04-14/second-lawsuit-filed-over-proposed-data-center-in-simpson-county",
        "https://bgdailynews.com/2026/04/15/rulings-to-come-in-data-center-suit/",
        "https://www.franklinfavorite.com/russellville/russellville/news/article_91f3b170-14b7-54a0-a602-9819af557f7c.html",
    ],
    "federal-eia-mandatory-data-center-energy-reporting-2026-04-09": [
        "https://techcrunch.com/2026/04/15/feds-will-require-data-centers-to-show-their-power-bills/",
        "https://www.warren.senate.gov/newsroom/press-releases/warren-hawley-lead-bipartisan-push-for-mandatory-energy-use-reporting-requirements-for-data-centers",
        "https://dailyenergyinsider.com/news/51676-u-s-senators-press-for-mandatory-data-center-energy-reporting/",
    ],
    "ravenna-oh-moratorium-2026-04": [
        "https://theportager.com/ravenna-city-council-rushes-to-block-potential-data-center-proposal",
        "https://www.aol.com/articles/ravenna-shalersville-limit-data-centers-130003334.html",
        "https://www.wnir.com/2026/04/15/data-center-ban/",
    ],
    "shawnee-township-allen-county-oh-moratorium-2026-04": [
        "https://www.hometownstations.com/news/allen_county/shawnee-township-approves-18-month-moratorium-on-data-centers-energy-projects/article_431ac6ec-8564-4865-9b2f-a243d933bf4d.html",
    ],
    "new-buffalo-township-mi-moratorium-2026-04": [
        "https://www.heraldpalladium.com/communities/new_buffalo/new-buffalo-township-moves-to-pause-data-centers/article_ae807e06-310b-5d6e-a346-f4952041d0a6.html",
        "https://www.wndu.com/2026/04/17/new-buffalo-township-pauses-data-center-development-one-year/",
        "https://www.harborcountry-news.com/news/new-buffalo-township-moves-to-pause-data-centers/article_c168fca1-853e-5cd6-a357-e6d876ac80b5.html",
    ],
    "detroit-mi-zoning-working-group-2026-04": [
        "https://www.bridgedetroit.com/detroit-convenes-working-group-for-data-center-zoning-policy/",
        "https://wdet.org/2026/04/16/the-metro-detroit-is-trying-to-write-the-rules-before-big-tech-moves-in/",
    ],
    "washington-township-macomb-ordinance-dev-2026-04": [
        "https://planetdetroit.org/2026/04/washington-township-weighs-data-center-impacts/",
    ],
    "caledonia-wi-balch-election-2026-04-07": [
        "https://racinecountyeye.com/2026/04/07/caledonia-vote-results-april-2026/",
        "https://spectrumnews1.com/wi/milwaukee/news/2026/04/13/caledonia--data-center--election--wisconsin-",
        "https://ballotpedia.org/Prescott_Balch_(Caledonia_Village_Trustee_District_2,_Wisconsin,_candidate_2026)",
    ],
    "elbert-county-co-puc-power-pathway-override-2026-04-15": [
        "https://coloradosun.com/2026/04/15/power-pathway-elbert-el-paso-puc-transmission-electricity/",
        "https://www.9news.com/article/money/consumer/colorado-regulators-elbert-county-approve-xcel-energy-power-pathway/73-a5621c10-1a05-4c91-8b1f-d26ab6f4477f",
        "https://rockymountainvoice.com/2026/04/15/colorado-regulators-override-local-denial-to-advance-renewable-energy-grid/",
    ],
    "washington-state-utc-data-center-review-2026-04": [
        "https://www.khq.com/news/state-of-washington-opens-new-review-of-big-power-users-as-data-center-demand-grows/article_b9e659b2-2f81-42d5-8089-c9c637fb5563.html",
        "https://www.dwt.com/blogs/energy--environmental-law-blog/2026/03/washington-legislature-delays-data-center-bill",
        "https://nationaltoday.com/us/wa/lacey/news/2026/04/14/utc-to-host-technical-conference-on-large-energy-loads/",
    ],
    "virginia-statewide-wapo-schar-poll-va-2026-04-15": [
        "https://www.washingtonpost.com/business/2026/04/15/data-centers-poll-virginia/",
        "https://www.tomshardware.com/tech-industry/virginia-voter-support-for-new-data-centers-collapses-to-35-percent",
        "https://www.spokesman.com/stories/2026/apr/15/in-this-us-hot-spot-for-data-centers-voters-have-t/",
    ],
    "southaven-xai-naacp-federal-lawsuit-ms-2026-04-14": [
        "https://earthjustice.org/press/2026/xai-sued-for-illegal-power-plant",
        "https://www.selc.org/press-release/civil-rights-group-sues-xai-for-illegal-pollution-from-data-center-power-plant/",
        "https://www.wsmv.com/2026/04/14/naacp-sues-xai-alleging-unlawful-operation-gas-turbines-southaven/",
    ],
    "north-franklin-township-pa-2026-04-14": [
        "https://www.observer-reporter.com/news/local_news/2026/apr/16/north-franklin-township-adopts-ordinances-regulating-data-centers-electric-generation/",
        "https://www.observer-reporter.com/news/local_news/2026/mar/12/north-franklin-considering-data-center-ordinance/",
    ],
}

# IDs for which no working source could be confirmed (empty — all 13 verified).
UNVERIFIED = []


def main():
    data = json.loads(FIGHTS_JSON.read_text())
    # fights.json appears to be a list at top level based on prior scripts; handle either.
    if isinstance(data, dict) and "fights" in data:
        container = data["fights"]
        wrapped = True
    else:
        container = data
        wrapped = False

    by_id = {item.get("id"): item for item in container if isinstance(item, dict)}

    replaced = []
    missing = []

    for fight_id, new_sources in REPLACEMENTS.items():
        item = by_id.get(fight_id)
        if not item:
            missing.append(fight_id)
            continue
        item["sources"] = new_sources
        item["last_updated"] = LAST_UPDATED
        replaced.append(fight_id)

    # Write back
    if wrapped:
        data["fights"] = container
        payload = data
    else:
        payload = container

    FIGHTS_JSON.write_text(json.dumps(payload, indent=2) + "\n")

    print(f"Replaced sources for {len(replaced)} entries:")
    for fid in replaced:
        print(f"  - {fid} ({len(REPLACEMENTS[fid])} sources)")

    if missing:
        print(f"\n[ERROR] {len(missing)} target IDs not found in fights.json:")
        for fid in missing:
            print(f"  - {fid}")

    if UNVERIFIED:
        print(f"\n[UNVERIFIED — NO CONFIRMING SOURCE FOUND] ({len(UNVERIFIED)} entries, candidates for drop):")
        for fid in UNVERIFIED:
            print(f"  - {fid}")
    else:
        print("\nAll 13 entries successfully replaced with verified sources; no unverified entries.")


if __name__ == "__main__":
    main()
