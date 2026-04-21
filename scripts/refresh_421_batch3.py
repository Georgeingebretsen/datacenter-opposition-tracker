#!/usr/bin/env python3
"""Refresh fights.json with April 21, 2026 Southeast findings (batch 3)."""
import json
from pathlib import Path

FIGHTS_PATH = Path(__file__).parent.parent / "site" / "data" / "fights.json"
TODAY = "2026-04-21"

# UPDATES: keyed by id -> dict of fields to merge (with special keys for append-to-summary)
UPDATES = {
    "coweta-county-ga-2025-05-01": {
        "_append_summary": " UPDATE 2026-04-21: Citizens for Rural Coweta have NOT yet filed a lawsuit but have signaled appeal grounds. Opposition petition exceeds 8,000 signatures.",
    },
    "richland-parish-la-2025-08-01": {
        "_append_summary": " UPDATE 2026-04-21: On April 15, 2026 the LPSC fast-tracked 7 ADDITIONAL gas plants for Meta — bringing the total to 10 plants. 4-1 vote with Commissioner Lewis dissenting. Final vote scheduled for November.",
    },
    "kentucky-statewide-hb-593-ky-2026-02-12": {
        "status": "defeated",
        "community_outcome": "win",
        "_append_summary": " UPDATE 2026-04-21: Bill died April 15-16, 2026 as the legislative session ended. HB 593 passed the House 90-8 but stalled in the Senate. An SB 197 revival attempt was stripped on the final day.",
    },
    "southaven-xai-naacp-federal-lawsuit-ms-2026-04-14": {
        "_append_summary": " UPDATE 2026-04-21: Filing details confirmed — Earthjustice and SELC serving as counsel. Plaintiffs allege 1,700+ tons/yr NOx, 180 tons PM2.5, 500 tons CO, and 19 tons formaldehyde emissions. Suit seeks BACT requirements and per-day penalties.",
    },
    "virginia-budget-tax-exemption-stalemate-2026-03": {
        "_append_summary": " UPDATE 2026-04-21: April 23 special session preview — Senate (Lucas) and House (Torian) remain deadlocked over the $1.6B/yr data center tax exemption.",
    },
    "apex-moratorium-nc-2026": {
        "status": "passed",
        "community_outcome": "win",
        "_append_summary": " UPDATE 2026-04-21: Apex Town Council unanimously approved the data center moratorium on April 21, 2026.",
    },
    "swain-county-nc-moratorium-2026-04-01": {
        "_append_summary": " UPDATE 2026-04-21: April 21 work session held; outcome pending.",
    },
    "south-carolina-statewide-moratorium-h-5526-sc-2026-04-14": {
        "_append_summary": " UPDATE 2026-04-21: H5526 was referred to the House Ways and Means Committee on April 14, 2026.",
    },
    "alabama-senate-sb-270-passed-al-2026-03-13": {
        "_append_summary": " UPDATE 2026-04-21: Alabama legislative session adjourned sine die on April 9, 2026.",
    },
    "fort-meade-polk-county-fl-2026-02-25": {
        "_append_summary": " UPDATE 2026-04-21: On April 18, 2026 Florida Commerce Secretary Alex Kelly (DeSantis administration) sent a letter calling the project 'fundamentally flawed.' SWFWMD permits are still required. Developer identified as Florida Ecopark LLC.",
    },
    "botetourt-county-va-google-2025-12-01": {
        "_append_summary": " UPDATE 2026-04-21: On April 17, 2026 the Botetourt County Chamber of Commerce formally endorsed the Google data center project.",
    },
    "hanover-county-mountain-road-va-2026": {
        "_append_summary": " UPDATE 2026-04-21: Planning Commission voted 6-1 (not 8-1 as previously reported) on April 16, 2026 to recommend approval of the rezoning. Board of Supervisors vote expected in May. Project details: 430 acres, Tract developer, 5 buildings, 900 MW, ~600,000 gal/day average water use (peak 2M gal/day), with $15M contribution toward booster pump infrastructure.",
    },
}

# NEW ENTRIES
NEW_ENTRIES = [
    {
        "id": "virginia-spanberger-amendments-sb253-hb1393-va-2026-04-16",
        "jurisdiction": "Virginia (statewide)",
        "state": "VA",
        "county": None,
        "lat": 37.5407,
        "lng": -77.4360,
        "action_type": ["legislation"],
        "date": "2026-04-16",
        "status": "pending",
        "company": None,
        "hyperscaler": None,
        "project_name": None,
        "investment_million_usd": None,
        "megawatts": None,
        "acreage": None,
        "building_sq_ft": None,
        "water_usage_gallons_per_day": None,
        "jobs_promised": None,
        "opposition_groups": None,
        "opposition_website": None,
        "opposition_facebook": None,
        "opposition_instagram": None,
        "opposition_twitter": None,
        "petition_url": None,
        "petition_signatures": None,
        "summary": "Gov. Spanberger amended SB 253 and HB 1393 on April 16, 2026 — bills designed to shift infrastructure costs to high-load data center customers. Amendments struck the explicit cost-shift, replaced with softer language directing SCC to be 'mindful' of cost pass-throughs, raised employee opt-out threshold from 200 to 10,000, limited application to existing customers only, and cut power-line-burial incremental rate cap from 4% to 2%. Critics including Dominion and lawmakers say amendments weaken the bills. Legislature returns April 22 to accept/reject.",
        "sources": [
            "https://virginiamercury.com/2026/04/16/lawmakers-dominion-say-spanbergers-amendments-weaken-bill-to-shift-costs-onto-data-centers/",
            "https://www.route-fifty.com/artificial-intelligence/2026/04/virginia-governor-amends-bills-shift-costs-data-centers-critics-say-her-tweaks-weaken-them/412929/",
        ],
        "data_source": "manual_research",
        "last_updated": TODAY,
        "scope": "statewide",
        "county_lean": None,
        "issue_category": ["ratepayer", "grid_energy"],
        "authority_level": "governor",
        "objective": "Shift data center infrastructure costs away from residential ratepayers",
        "community_outcome": "mixed",
    },
    {
        "id": "virginia-wapo-schar-poll-va-2026-04-15",
        "jurisdiction": "Virginia (statewide)",
        "state": "VA",
        "county": None,
        "lat": 37.5407,
        "lng": -77.4360,
        "action_type": ["study_or_report"],
        "date": "2026-04-15",
        "status": "passed",
        "company": None,
        "hyperscaler": None,
        "project_name": None,
        "investment_million_usd": None,
        "megawatts": None,
        "acreage": None,
        "building_sq_ft": None,
        "water_usage_gallons_per_day": None,
        "jobs_promised": None,
        "opposition_groups": None,
        "opposition_website": None,
        "opposition_facebook": None,
        "opposition_instagram": None,
        "opposition_twitter": None,
        "petition_url": None,
        "petition_signatures": None,
        "summary": "Washington Post-Schar School poll published April 15, 2026 shows Virginia voter support for new data centers collapsed from 69% in 2023 to 35% in 2026 — a major political signal heading into the April 23 budget special session and 2026 legislative battles.",
        "sources": [
            "https://www.washingtonpost.com/business/2026/04/15/data-centers-poll-virginia/",
            "https://www.tomshardware.com/tech-industry/virginia-voter-support-for-new-data-centers-collapses-to-35-percent",
        ],
        "data_source": "manual_research",
        "last_updated": TODAY,
        "scope": "statewide",
        "county_lean": None,
        "issue_category": ["community_impact"],
        "authority_level": None,
        "objective": None,
        "community_outcome": "win",
    },
    {
        "id": "sanford-nc-udo-draft-2026-04-21",
        "jurisdiction": "City of Sanford",
        "state": "NC",
        "county": "Lee County",
        "lat": 35.4799,
        "lng": -79.1803,
        "action_type": ["zoning_restriction"],
        "date": "2026-04-21",
        "status": "pending",
        "company": None,
        "hyperscaler": None,
        "project_name": None,
        "investment_million_usd": None,
        "megawatts": None,
        "acreage": None,
        "building_sq_ft": None,
        "water_usage_gallons_per_day": None,
        "jobs_promised": None,
        "opposition_groups": None,
        "opposition_website": None,
        "opposition_facebook": None,
        "opposition_instagram": None,
        "opposition_twitter": None,
        "petition_url": None,
        "petition_signatures": None,
        "summary": "Sanford City Council reviewing draft Unified Development Ordinance data center regulations: 500-ft residential setback, 100-ft landscape buffer, 75-ft height limit, 65-decibel noise cap with $10,000/violation fines, restricted to industrial zones, utility approval letter required. Public hearing April 21.",
        "sources": [
            "https://www.sanfordherald.com/news/hearing-set-for-including-data-center-requirements-in-udo/article_0a1cc03e-61d3-5901-9789-b59938aee7f9.html",
        ],
        "data_source": "manual_research",
        "last_updated": TODAY,
        "scope": "local",
        "county_lean": "R",
        "issue_category": ["zoning", "noise"],
        "authority_level": None,
        "objective": None,
        "community_outcome": "pending",
    },
    {
        "id": "horry-county-sc-zoning-draft-2026-04",
        "jurisdiction": "Horry County",
        "state": "SC",
        "county": "Horry County",
        "lat": 33.8860,
        "lng": -78.9829,
        "action_type": ["zoning_restriction"],
        "date": "2026-04-15",
        "status": "pending",
        "company": None,
        "hyperscaler": None,
        "project_name": None,
        "investment_million_usd": None,
        "megawatts": None,
        "acreage": None,
        "building_sq_ft": None,
        "water_usage_gallons_per_day": None,
        "jobs_promised": None,
        "opposition_groups": None,
        "opposition_website": None,
        "opposition_facebook": None,
        "opposition_instagram": None,
        "opposition_twitter": None,
        "petition_url": None,
        "petition_signatures": None,
        "summary": "Horry County advancing data center zoning standards proactively. Restricts facilities over 200,000 sq ft to general manufacturing and heavy industrial zones. Drafting phase; committee previously tabled.",
        "sources": [
            "https://www.postandcourier.com/myrtle-beach/news/horry-county-data-centers-regulate/article_048033ab-67df-41df-b6da-71d98e4edd1c.html",
        ],
        "data_source": "manual_research",
        "last_updated": TODAY,
        "scope": "local",
        "county_lean": "R",
        "issue_category": ["zoning"],
        "authority_level": None,
        "objective": None,
        "community_outcome": "pending",
    },
    {
        "id": "nassau-county-fl-moratorium-2026-04-13",
        "jurisdiction": "Nassau County",
        "state": "FL",
        "county": "Nassau County",
        "lat": 30.6100,
        "lng": -81.7787,
        "action_type": ["moratorium"],
        "date": "2026-04-13",
        "status": "pending",
        "company": "NextNRG",
        "hyperscaler": None,
        "project_name": None,
        "investment_million_usd": None,
        "megawatts": 200,
        "acreage": 1200,
        "building_sq_ft": None,
        "water_usage_gallons_per_day": None,
        "jobs_promised": None,
        "opposition_groups": None,
        "opposition_website": None,
        "opposition_facebook": None,
        "opposition_instagram": None,
        "opposition_twitter": None,
        "petition_url": None,
        "petition_signatures": None,
        "summary": "Nassau County BoCC directed County Attorney April 13, 2026 to draft a 12-month data center moratorium. Triggered by NextNRG's announced 200-MW microgrid + ~400-acre hyperscale-ready site on a 1,200-acre lease near Jacksonville airport. Two required public hearings scheduled May 11 and June 8.",
        "sources": [
            "https://www.jaxdailyrecord.com/news/2026/apr/14/nassau-county-pursuing-12-month-moratorium-on-data-center-development/",
            "https://jaxtoday.org/2026/04/15/data-center-development-nassau/",
        ],
        "data_source": "manual_research",
        "last_updated": TODAY,
        "scope": "local",
        "county_lean": "R",
        "issue_category": ["zoning", "grid_energy"],
        "authority_level": None,
        "objective": None,
        "community_outcome": "pending",
    },
    {
        "id": "nashville-davidson-zoning-tn-2026-04-17",
        "jurisdiction": "Nashville/Davidson County",
        "state": "TN",
        "county": "Davidson County",
        "lat": 36.1627,
        "lng": -86.7816,
        "action_type": ["ordinance", "zoning_restriction"],
        "date": "2026-04-17",
        "status": "passed",
        "company": None,
        "hyperscaler": None,
        "project_name": None,
        "investment_million_usd": None,
        "megawatts": None,
        "acreage": None,
        "building_sq_ft": None,
        "water_usage_gallons_per_day": None,
        "jobs_promised": None,
        "opposition_groups": None,
        "opposition_website": None,
        "opposition_facebook": None,
        "opposition_instagram": None,
        "opposition_twitter": None,
        "petition_url": None,
        "petition_signatures": None,
        "summary": "Nashville/Metro Davidson County Title 17 zoning amendments passed on third reading April 7, 2026 became effective April 17, 2026. Includes data-center-related zoning provisions establishing standards (not a ban).",
        "sources": [
            "https://www.multistate.us/resources/state-data-center-policy-101",
        ],
        "data_source": "manual_research",
        "last_updated": TODAY,
        "scope": "local",
        "county_lean": "D",
        "issue_category": ["zoning"],
        "authority_level": None,
        "objective": None,
        "community_outcome": "win",
    },
]


def main():
    with FIGHTS_PATH.open() as f:
        data = json.load(f)

    by_id = {e["id"]: e for e in data}

    updated = 0
    for entry_id, changes in UPDATES.items():
        if entry_id not in by_id:
            print(f"WARN: update target not found: {entry_id}")
            continue
        entry = by_id[entry_id]
        for k, v in changes.items():
            if k == "_append_summary":
                entry["summary"] = (entry.get("summary") or "") + v
            else:
                entry[k] = v
        entry["last_updated"] = TODAY
        updated += 1

    added = 0
    existing_ids = set(by_id.keys())
    for new_entry in NEW_ENTRIES:
        if new_entry["id"] in existing_ids:
            print(f"WARN: new entry id already exists, skipping: {new_entry['id']}")
            continue
        data.append(new_entry)
        added += 1

    with FIGHTS_PATH.open("w") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

    print(f"Updated: {updated}")
    print(f"Added: {added}")
    print(f"Total entries: {len(data)}")


if __name__ == "__main__":
    main()
