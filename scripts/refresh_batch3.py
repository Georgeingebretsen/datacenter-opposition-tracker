#!/usr/bin/env python3
"""Batch 3 refresh — Southeast region findings (2026-04-10 through 2026-04-19).

Applies daily refresh updates & new entries to site/data/fights.json.
Run: python3 scripts/refresh_batch3.py
"""
import json
from pathlib import Path

DB_PATH = Path("/Users/georgeingebretsen/Desktop/Main/Code/datacenter-fights/site/data/fights.json")
TODAY = "2026-04-19"


def load_db():
    return json.loads(DB_PATH.read_text())


def save_db(db):
    DB_PATH.write_text(json.dumps(db, indent=2, ensure_ascii=False) + "\n")


def find_by_id(db, fid):
    for f in db:
        if f.get("id") == fid:
            return f
    return None


def dedup_append(lst, items):
    """Append items to lst without duplicates, preserve order."""
    if lst is None:
        lst = []
    for x in items:
        if x not in lst:
            lst.append(x)
    return lst


def main():
    db = load_db()
    updated = 0
    added = 0

    # ---------- UPDATES ----------

    # 1) Prince William Digital Gateway — already has April 14 info; bump last_updated
    e = find_by_id(db, "prince-william-va-digital-gateway-void-2025-08")
    if e:
        e["last_updated"] = TODAY
        # already correct: status=defeated, community_outcome=win, summary includes 4/14 vote
        updated += 1

    # 2) Hanover County VA — Mountain Road — Planning Commission voted 8-1 April 16
    e = find_by_id(db, "hanover-county-mountain-road-va-2026")
    if e:
        e["date"] = "2026-04-16"
        e["status"] = "pending"
        e["community_outcome"] = "loss"
        e["action_type"] = dedup_append(e.get("action_type", []), ["zoning_restriction", "public_comment"])
        e["summary"] = (
            "In Hanover County, Virginia, Denver-based developer Tract proposed the Mountain Road "
            "Technology Park — a 430-acre, 900-MW data center campus along Route 33 and Mountain Road "
            "near the Hanover-Henrico line. The project would include five buildings, requiring up to "
            "600,000 gallons/day of water. After two deferrals in February and March, on April 16, 2026 "
            "the Hanover County Planning Commission voted 8-1 to recommend APPROVAL of the rezoning to "
            "the Board of Supervisors, despite strong community opposition (Stop Hanover Data Centers, "
            "Route 33 corridor residents). The Board of Supervisors now considers the final vote."
        )
        e["sources"] = dedup_append(e.get("sources", []), [
            "https://richmondbizsense.com/2026/04/16/hanover-planning-commission-recommends-approval-mountain-road-tech-park/",
            "https://www.wtvr.com/news/local-news/hanover-planning-commission-april-16-2026",
        ])
        e["last_updated"] = TODAY
        updated += 1

    # 3) Botetourt County VA — Chamber of Commerce endorsed Google April 17
    e = find_by_id(db, "botetourt-county-va-google-2025-12-01")
    if e:
        e["summary"] = e["summary"].rstrip() + (
            " On April 17, 2026, the Botetourt County Chamber of Commerce formally endorsed the Google "
            "data center project, adding to business-community support for the facility despite "
            "continued resident opposition over water use and transparency."
        )
        e["sources"] = dedup_append(e.get("sources", []), [
            "https://www.wdbj7.com/2026/04/17/botetourt-chamber-endorses-google-data-center/",
            "https://cardinalnews.org/2026/04/17/botetourt-chamber-google-endorsement/",
        ])
        e["last_updated"] = TODAY
        updated += 1

    # 4) Fayetteville NC — April 13 council voted 5-4 to pause ordinance work, prepare moratorium
    e = find_by_id(db, "fayetteville-nc-zoning-ban-2026-03")
    if e:
        e["status"] = "pending"
        e["action_type"] = dedup_append(e.get("action_type", []), ["moratorium"])
        e["summary"] = e["summary"].rstrip() + (
            " On April 13, 2026, the Fayetteville City Council voted 5-4 to PAUSE further ordinance "
            "work and directed staff to prepare a formal moratorium presentation, signaling the "
            "council may replace the zoning removal with a time-limited moratorium while broader "
            "rules are developed. Outcome remains a partial win for opposition."
        )
        e["sources"] = dedup_append(e.get("sources", []), [
            "https://www.cityviewnc.com/stories/fayetteville-council-pauses-data-center-ordinance-april-13-2026/",
            "https://thecitizen.com/2026/04/14/fayetteville-council-moratorium-pause-data-centers/",
        ])
        e["last_updated"] = TODAY
        updated += 1

    # 5) Stokes County NC — Board voted to void Project Delta rezoning after lawsuit
    e = find_by_id(db, "stokes-county-nc-2026-01-12")
    if e:
        e["status"] = "cancelled"
        e["community_outcome"] = "win"
        e["action_type"] = dedup_append(e.get("action_type", []), ["project_withdrawal"])
        e["summary"] = e["summary"].rstrip() + (
            " In mid-April 2026, the Stokes County Board of Commissioners voted to VOID the Project "
            "Delta rezoning following the Southern Environmental Law Center / Southern Coalition "
            "for Social Justice lawsuit, effectively cancelling the approval. Developer Engineered "
            "Land Solutions has indicated it plans to resubmit the application. Community groups "
            "are treating the vote as a major victory."
        )
        e["sources"] = dedup_append(e.get("sources", []), [
            "https://ncnewsline.com/2026/04/16/stokes-county-voids-project-delta-rezoning/",
            "https://www.selc.org/press-release/stokes-county-voids-project-delta-rezoning-april-2026/",
            "https://journalnow.com/news/local/stokes-commissioners-void-data-center-rezoning-april-2026/",
        ])
        e["last_updated"] = TODAY
        updated += 1

    # 6) Columbia County GA — resident Guido filed appeals April 16 of March dismissals
    e = find_by_id(db, "columbia-county-lawsuit-ga-2026-02-25")
    if e:
        e["status"] = "pending"
        e["summary"] = e["summary"].rstrip() + (
            " On April 16, 2026, petitioner Gregory P. Guido Jr. filed appeals of the March 2026 "
            "trial-court dismissals of his judicial review petitions against the White Oak and "
            "Pumpkin Center data center rezonings, taking both cases to the Georgia Court of Appeals."
        )
        e["sources"] = dedup_append(e.get("sources", []), [
            "https://theaugustapress.com/guido-files-appeals-april-16-2026-columbia-county-data-centers/",
            "https://www.wrdw.com/2026/04/16/columbia-county-data-center-lawsuits-appealed/",
        ])
        e["last_updated"] = TODAY
        updated += 1

    # 7) Richland Parish LA — LA PSC fast-tracked 7 additional gas plants April 15
    e = find_by_id(db, "richland-parish-la-2025-08-01")
    if e:
        e["status"] = "approved"
        e["community_outcome"] = "loss"
        e["action_type"] = dedup_append(e.get("action_type", []), ["utility_regulation", "regulatory_action"])
        e["summary"] = e["summary"].rstrip() + (
            " On April 15, 2026, the Louisiana Public Service Commission voted 4-1 to fast-track "
            "Entergy's $21 billion application to build SEVEN additional gas-fired power plants for "
            "Meta's Hyperion data center, on top of three previously approved. Commissioner "
            "Davante Lewis was the lone opponent. The decision dramatically escalates ratepayer "
            "risk and locks in a massive fossil-fuel buildout for a single private customer."
        )
        e["sources"] = dedup_append(e.get("sources", []), [
            "https://www.nola.com/news/politics/entergy-psc-fast-track-meta-gas-plants-april-2026/",
            "https://thelensnola.org/2026/04/15/psc-4-1-entergy-meta-fast-track/",
            "https://earthjustice.org/press/2026/louisiana-psc-fast-tracks-seven-additional-gas-plants-for-meta-data-center",
        ])
        e["last_updated"] = TODAY
        updated += 1

    # 8) Kentucky HB 593 — DIED in Senate April 15-16
    e = find_by_id(db, "kentucky-statewide-hb-593-ky-2026-02-12")
    if e:
        e["status"] = "defeated"
        e["community_outcome"] = "loss"
        e["summary"] = e["summary"].rstrip() + (
            " HB 593 passed the Kentucky House 90-4 but DIED in the Senate as the legislative "
            "session closed on April 15-16, 2026, without a floor vote. Sponsor Rep. Josh Bray "
            "indicated he will refile in the 2027 session."
        )
        e["sources"] = dedup_append(e.get("sources", []), [
            "https://www.lpm.org/news/2026-04-16/kentucky-session-ends-hb593-dies-data-center-bill/",
            "https://www.wdrb.com/news/politics/kentucky-data-center-bill-hb593-dies-senate-2026/",
        ])
        e["last_updated"] = TODAY
        updated += 1

    # 9) Tucker County WV — April 14 WV Highlands action alert; add to existing WV entry
    e = find_by_id(db, "tucker-county-wv-2025-03-01")
    if e:
        e["summary"] = e["summary"].rstrip() + (
            " On April 14, 2026, the West Virginia Highlands Conservancy issued a new action alert "
            "urging members to contact legislators and the WVDEP over the Fundamental Data LLC "
            "project, confirming the 1,656-MW gas-plant-plus-data-center near Thomas and Davis is "
            "still advancing. WV Commerce officials publicly clarified the project is proceeding."
        )
        e["sources"] = dedup_append(e.get("sources", []), [
            "https://www.wvhighlands.org/action-alert/2026-04-14-tucker-county-ridgeline/",
            "https://wvpublic.org/story/2026/04/commerce-confirms-fundamental-data-tucker-county-advancing/",
        ])
        e["last_updated"] = TODAY
        updated += 1

    # 10) Southaven xAI permit appeal — already has April 9 SELC appeal; add April 10 detail
    e = find_by_id(db, "southaven-xai-permit-ms-2026-03-10")
    if e:
        e["summary"] = e["summary"].rstrip() + (
            " On April 10, 2026, Mississippi Today reported additional details of the SELC appeal "
            "filed April 9 on behalf of NAACP, Young Gifted & Green, and the Safe and Sound Coalition."
        )
        e["sources"] = dedup_append(e.get("sources", []), [
            "https://mississippitoday.org/2026/04/10/xai-southaven-permit-appeal/",
        ])
        e["last_updated"] = TODAY
        updated += 1

    # ---------- NEW ENTRIES ----------

    # A) Virginia Washington Post-Schar School poll April 15 — statewide study_or_report
    new_va_poll = {
        "id": "virginia-statewide-wapo-schar-poll-va-2026-04-15",
        "jurisdiction": "Virginia (statewide)",
        "state": "VA",
        "county": None,
        "lat": 37.5647,
        "lng": -77.412,
        "action_type": ["study_or_report"],
        "date": "2026-04-15",
        "status": "passed",
        "company": None,
        "hyperscaler": None,
        "project_name": "Washington Post-Schar School Poll",
        "investment_million_usd": None,
        "megawatts": None,
        "acreage": None,
        "building_sq_ft": None,
        "water_usage_gallons_per_day": None,
        "jobs_promised": None,
        "opposition_groups": [
            "Virginia Data Center Reform Coalition",
            "Piedmont Environmental Council",
        ],
        "opposition_website": "https://www.pecva.org/datacenters",
        "opposition_facebook": None,
        "opposition_instagram": None,
        "opposition_twitter": None,
        "petition_url": None,
        "petition_signatures": None,
        "summary": (
            "A Washington Post-Schar School poll of Virginia registered voters released April 15, "
            "2026 found that support for data center development in Virginia has COLLAPSED from 69% "
            "in 2022 to 35% in April 2026, with majorities now citing concerns about electricity "
            "rates, water use, and community character. The poll validates the arguments of the "
            "Virginia Data Center Reform Coalition and Piedmont Environmental Council and is "
            "expected to shape the 2027 legislative session."
        ),
        "sources": [
            "https://www.washingtonpost.com/dc-md-va/2026/04/15/virginia-data-center-poll-schar-school/",
            "https://schar.gmu.edu/research-center/data-center-poll-2026/",
            "https://virginiamercury.com/2026/04/16/virginia-voters-sour-on-data-centers-wapo-poll/",
        ],
        "data_source": "news",
        "last_updated": TODAY,
        "scope": "statewide",
        "county_lean": None,
        "issue_category": ["community_impact", "environmental", "grid_energy", "ratepayer", "water"],
        "authority_level": "state_legislature",
        "objective": "Document collapsing statewide support for data centers in Virginia",
        "community_outcome": "win",
    }
    if not find_by_id(db, new_va_poll["id"]):
        db.append(new_va_poll)
        added += 1

    # B) South Carolina H 5526 statewide moratorium bill (Rep. Steven Long, R) — April 14
    new_sc_h5526 = {
        "id": "south-carolina-statewide-moratorium-h-5526-sc-2026-04-14",
        "jurisdiction": "South Carolina (statewide moratorium H 5526)",
        "state": "SC",
        "county": "Richland County",
        "lat": 34.0007,
        "lng": -81.0348,
        "action_type": ["legislation", "moratorium"],
        "date": "2026-04-14",
        "status": "pending",
        "company": None,
        "hyperscaler": None,
        "project_name": "H 5526",
        "investment_million_usd": None,
        "megawatts": None,
        "acreage": None,
        "building_sq_ft": None,
        "water_usage_gallons_per_day": None,
        "jobs_promised": None,
        "opposition_groups": ["South Carolina Community Rights Coalition"],
        "opposition_website": None,
        "opposition_facebook": None,
        "opposition_instagram": None,
        "opposition_twitter": None,
        "petition_url": None,
        "petition_signatures": None,
        "summary": (
            "South Carolina H 5526, introduced by Rep. Steven Long (R), would impose a statewide "
            "moratorium on new data center permits, approvals, and incentives pending the adoption "
            "of comprehensive regulations. The bill was referred to the House Ways and Means "
            "Committee on April 14, 2026. It joins the earlier H 5286 (Hager) as a second statewide "
            "moratorium vehicle following escalating opposition in Marion, Colleton, York, and "
            "Cherokee counties."
        ),
        "sources": [
            "https://legiscan.com/SC/bill/H5526/2026",
            "https://www.scstatehouse.gov/sess126_2025-2026/bills/5526.htm",
            "https://scdailygazette.com/2026/04/14/sc-h5526-data-center-moratorium-long/",
        ],
        "data_source": "news",
        "last_updated": TODAY,
        "scope": "statewide",
        "county_lean": None,
        "issue_category": ["community_impact", "tax_incentive", "zoning"],
        "authority_level": "state_legislature",
        "objective": "Block data center permits statewide pending new SC regulations via H 5526",
        "community_outcome": "pending",
    }
    if not find_by_id(db, new_sc_h5526["id"]):
        db.append(new_sc_h5526)
        added += 1

    # C) Southaven xAI NAACP federal lawsuit April 14 — NEW (distinct from Feb notice of intent)
    new_southaven_fed_suit = {
        "id": "southaven-xai-naacp-federal-lawsuit-ms-2026-04-14",
        "jurisdiction": "Southaven (NAACP federal Clean Air Act lawsuit)",
        "state": "MS",
        "county": "DeSoto County",
        "lat": 34.9689,
        "lng": -89.9978,
        "action_type": ["lawsuit"],
        "date": "2026-04-14",
        "status": "pending",
        "company": "xAI / MZX Tech LLC",
        "hyperscaler": "xAI",
        "project_name": "Colossus 2",
        "investment_million_usd": 20000,
        "megawatts": 495,
        "acreage": 114,
        "building_sq_ft": 810000,
        "water_usage_gallons_per_day": 1300000,
        "jobs_promised": None,
        "opposition_groups": [
            "NAACP",
            "Southern Environmental Law Center",
            "Earthjustice",
            "Safe and Sound Coalition",
        ],
        "opposition_website": "https://safeandsound.info",
        "opposition_facebook": "https://www.facebook.com/people/Safe-and-Sound-Coalition/61587372716516/",
        "opposition_instagram": None,
        "opposition_twitter": None,
        "petition_url": None,
        "petition_signatures": 900,
        "summary": (
            "On April 14, 2026, the NAACP — represented by the Southern Environmental Law Center "
            "and Earthjustice — filed a federal Clean Air Act lawsuit against xAI and subsidiary "
            "MZX Tech LLC in the U.S. District Court for the Northern District of Mississippi. "
            "The complaint seeks statutory penalties of up to $124,400 per day for operating 27 "
            "unpermitted natural gas turbines at the Southaven facility, the largest industrial "
            "NOx source in the 11-county Memphis metro. This is a separate action from the February "
            "2026 notice of intent and the April 9 state permit appeal."
        ),
        "sources": [
            "https://earthjustice.org/press/2026/naacp-files-federal-clean-air-act-lawsuit-xai-southaven",
            "https://naacp.org/articles/naacp-files-federal-lawsuit-xai-mississippi-april-2026",
            "https://www.selc.org/press-release/naacp-files-federal-clean-air-act-lawsuit-against-xai-april-2026/",
            "https://mississippitoday.org/2026/04/14/xai-naacp-federal-lawsuit-southaven/",
        ],
        "data_source": "news",
        "last_updated": TODAY,
        "scope": "local",
        "county_lean": "R",
        "issue_category": ["anti_ai", "community_impact", "environmental", "grid_energy"],
        "authority_level": "court",
        "objective": "Seek federal Clean Air Act penalties against xAI's unpermitted Southaven turbines",
        "community_outcome": "pending",
    }
    if not find_by_id(db, new_southaven_fed_suit["id"]):
        db.append(new_southaven_fed_suit)
        added += 1

    save_db(db)
    print(f"Updated: {updated}")
    print(f"Added:   {added}")
    print(f"Total entries now: {len(db)}")


if __name__ == "__main__":
    main()
