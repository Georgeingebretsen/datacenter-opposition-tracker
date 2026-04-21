#!/usr/bin/env python3
"""Refresh fights.json with April 21, 2026 Northeast findings (batch 4)."""
import json
from pathlib import Path

FIGHTS_PATH = Path(__file__).parent.parent / "site" / "data" / "fights.json"
TODAY = "2026-04-21"

# UPDATES: keyed by id -> dict of fields to merge.
# Special keys:
#   _append_summary: appended to existing summary string
UPDATES = {
    # Phillipsburg NJ ban — confirm unanimous adoption April 14
    "phillipsburg-nj-ban-ordinance-2026-04": {
        "status": "passed",
        "community_outcome": "win",
        "_append_summary": " UPDATE 2026-04-21: Confirmed — Ordinance 2026-08 unanimously adopted April 14, 2026, banning data centers townwide. Residents cited a potential 300 MW facility and 3-5 million gallons/day water demand.",
    },
    # West Rockhill Township PA — unanimous adoption April 15
    "west-rockhill-township-bucks-county-pa-2026-02-24": {
        "status": "passed",
        "community_outcome": "mixed",
        "_append_summary": " UPDATE 2026-04-21: Board of Supervisors unanimously adopted the data center zoning ordinance on April 15, 2026 (25-acre minimum lot, 35-ft height cap, 150-ft parking setback from residential, on-site solar required, public water/sewer, underground utilities, limited to industrial zones). Mixed outcome — residents had pushed for stricter limits.",
    },
    # Monroe Township (Gloucester) — final vote April 22, still pending
    "monroe-township-gloucester-dc-ban-nj-2026-03-25": {
        "status": "pending",
        "_append_summary": " UPDATE 2026-04-21: Final adoption vote on Ordinance O:20-2026 scheduled for April 22, 2026 (just past this reporting window).",
    },
    # East Greenwich Township NJ — April 21 hearing scheduled tonight
    "east-greenwich-township-nj-2026-04": {
        "status": "pending",
        "_append_summary": " UPDATE 2026-04-21: April 21 hearing scheduled for 7 PM; outcome not yet reported. Organized opposition (Third Act, Action Network petition) mobilizing residents.",
    },
    # Maryland Utility RELIEF Act — signed by Gov Moore April 14
    "maryland-statewide-sb-596-md-2026-01-01": {
        "status": "passed",
        "community_outcome": "win",
        "_append_summary": " UPDATE 2026-04-21: Signed by Gov. Wes Moore on April 14, 2026. Delivers ~$150/year household utility relief, requires data centers to cover their own grid infrastructure, and taps $100M from the Strategic Energy Investment Fund. Food & Water Watch criticized the final bill as too weak.",
    },
    # NY S.9144 statewide moratorium — still in committee
    "new-york-statewide-moratorium-bill-ny-2026-02-06": {
        "status": "pending",
        "_append_summary": " UPDATE 2026-04-21: Still in Senate Environmental Conservation Committee. Danby, NY Town Board passed a resolution April 7, 2026 formally supporting the bill.",
    },
    # Smithfield RI — planning board positive recc April 13, council vote May 5
    "smithfield-ri-ban-2026-04": {
        "status": "pending",
        "_append_summary": " UPDATE 2026-04-21: Planning Board issued a positive recommendation on April 13, 2026. Town Council vote scheduled for May 5, 2026.",
    },
    # PA HB 1834 — still pending in Senate committee
    "pennsylvania-hb-1834-pa-2026-03-24": {
        "status": "pending",
        "_append_summary": " UPDATE 2026-04-21: Still pending in Senate Consumer Protection & Professional Licensure Committee.",
    },
}


# NEW ENTRIES
NEW_ENTRIES = [
    {
        "id": "pennsylvania-wellsboro-hearing-pa-2026-04-17",
        "jurisdiction": "Pennsylvania (Wellsboro hearing)",
        "state": "PA",
        "county": None,
        "lat": 41.7490,
        "lng": -77.3047,
        "action_type": ["study_or_report", "public_comment"],
        "date": "2026-04-17",
        "status": "active",
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
        "summary": "Center for Rural Pennsylvania held a contentious legislative hearing in Wellsboro on April 17, 2026. PJM's Stephen Bennett testified that data centers are 'predominant, by far' driver of load growth, contradicting the Data Center Coalition. Indiana County Commissioner Sherene Hess testified on local impacts. Another hearing planned for July. Feeds into HB 1834 and companion bills pending in Senate Consumer Protection & Professional Licensure Committee.",
        "sources": [
            "https://www.wccsradio.com/2026/04/19/hess-testifies-at-data-center-hearing/",
            "https://www.wesa.fm/politics-government/2026-04-20/pennsylvania-data-center-regulations-harrisburg",
            "https://www.cityandstatepa.com/policy/2026/04/power-plays-battle-over-data-centers-pa/412554/",
        ],
        "data_source": "manual_research",
        "last_updated": TODAY,
        "scope": "statewide",
        "county_lean": None,
        "issue_category": ["ratepayer", "grid_energy"],
        "authority_level": "state_legislature",
        "objective": None,
        "community_outcome": "pending",
    },
    {
        "id": "spanberger-multistate-pjm-letter-2026-04-13",
        "jurisdiction": "Multistate (PJM coalition)",
        "state": "VA",
        "county": None,
        "lat": 37.5407,
        "lng": -77.4360,
        "action_type": ["executive_action", "regulatory_action"],
        "date": "2026-04-13",
        "status": "active",
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
        "summary": "Gov. Abigail Spanberger (VA) joined a bipartisan coalition of governors on April 13, 2026 calling on PJM Interconnection to prioritize ratepayer protections and make data centers pay their fair share. Ratepayers across PJM's 13-state footprint face an additional $1.4B in capacity costs starting June 2026 largely from data center demand.",
        "sources": [
            "https://virginiamercury.com/briefs/spanberger-joins-other-governors-in-push-for-pjm-to-prioritize-ratepayer-protections/",
            "https://www.12onyourside.com/2026/04/13/spanberger-joins-other-governors-push-pjm-prioritize-ratepayer-protections/",
        ],
        "data_source": "manual_research",
        "last_updated": TODAY,
        "scope": "statewide",
        "county_lean": None,
        "issue_category": ["ratepayer", "grid_energy"],
        "authority_level": "governor",
        "objective": None,
        "community_outcome": "pending",
    },
    {
        "id": "upper-gwynedd-township-pa-ordinance-2026-04-13",
        "jurisdiction": "Upper Gwynedd Township",
        "state": "PA",
        "county": "Montgomery County",
        "lat": 40.2126,
        "lng": -75.2746,
        "action_type": ["ordinance"],
        "date": "2026-04-13",
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
        "summary": "Upper Gwynedd Township draft data center ordinance advanced April 13, 2026. Final adoption expected in May. Latest in the Montgomery County wave of preemptive zoning rules.",
        "sources": [
            "https://northpennnow.com/news/2026/apr/15/upper-gwynedd-becomes-latest-township-to-work-to-get-data-center-rules-on-the-books/",
        ],
        "data_source": "manual_research",
        "last_updated": TODAY,
        "scope": "local",
        "county_lean": "D",
        "issue_category": ["zoning"],
        "authority_level": None,
        "objective": None,
        "community_outcome": "pending",
    },
    {
        "id": "ypsilanti-ycua-water-moratorium-resolution-mi-2026-04-15",
        "jurisdiction": "Ypsilanti Township (YCUA water moratorium resolution)",
        "state": "MI",
        "county": "Washtenaw County",
        "lat": 42.2083,
        "lng": -83.6138,
        "action_type": ["utility_regulation", "infrastructure_opposition"],
        "date": "2026-04-15",
        "status": "pending",
        "company": "University of Michigan / Los Alamos National Laboratory",
        "hyperscaler": None,
        "project_name": None,
        "investment_million_usd": 1200,
        "megawatts": None,
        "acreage": None,
        "building_sq_ft": None,
        "water_usage_gallons_per_day": 500000,
        "jobs_promised": None,
        "opposition_groups": None,
        "opposition_website": None,
        "opposition_facebook": None,
        "opposition_instagram": None,
        "opposition_twitter": None,
        "petition_url": None,
        "petition_signatures": None,
        "summary": "Ypsilanti Township Board of Trustees passed a resolution April 15, 2026 urging YCUA to impose a 12-month moratorium on water/sewer commitments to data centers pending six analyses (financial, infrastructure, environmental). UM/Los Alamos proposed $1.2B facility could use 500,000 gallons/day. YCUA Board votes April 22 at 3 PM.",
        "sources": [
            "https://www.easternecho.com/article/2026/04/new-ypsilanti-township-data-center-resolution-requests-moratorium-on-local-resources",
            "https://www.wemu.org/wemu-news/2026-04-16/ypsilanti-township-asks-for-ycuas-help-to-slow-down-u-m-los-alamos-project",
            "https://planetdetroit.org/2026/04/ypsilanti-water-supply-data-centers/",
        ],
        "data_source": "manual_research",
        "last_updated": TODAY,
        "scope": "local",
        "county_lean": "D",
        "issue_category": ["water"],
        "authority_level": None,
        "objective": None,
        "community_outcome": "pending",
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
