#!/usr/bin/env python3
"""Refresh fights.json for 2026-04-19 batch 4 (Northeast/Mid-Atlantic)."""
import json

PATH = '/Users/georgeingebretsen/Desktop/Main/Code/datacenter-fights/site/data/fights.json'
TODAY = '2026-04-19'

with open(PATH) as f:
    data = json.load(f)

by_id = {e['id']: e for e in data}
updated = 0
added = 0
update_log = []
add_log = []


def upd(entry_id, changes=None, append_sources=None, add_action_types=None):
    global updated
    if entry_id not in by_id:
        print(f"WARN: missing entry {entry_id}")
        return
    e = by_id[entry_id]
    if changes:
        for k, v in changes.items():
            e[k] = v
    if append_sources:
        existing = e.get('sources') or []
        for s in append_sources:
            if s not in existing:
                existing.append(s)
        e['sources'] = existing
    if add_action_types:
        at = e.get('action_type') or []
        for a in add_action_types:
            if a not in at:
                at.append(a)
        e['action_type'] = at
    e['last_updated'] = TODAY
    updated += 1
    update_log.append(entry_id)


def add(entry):
    global added
    if entry['id'] in by_id:
        print(f"WARN: id collision on new entry {entry['id']} — skipping")
        return
    entry['last_updated'] = TODAY
    data.append(entry)
    by_id[entry['id']] = entry
    added += 1
    add_log.append(entry['id'])


# ---------------------------------------------------------------------------
# NEW JERSEY
# ---------------------------------------------------------------------------

# Monroe Township (Gloucester County) NJ — O:20-2026 introduced Apr 8, final vote Apr 22
upd('monroe-township-gloucester-dc-ban-nj-2026-03-25', {
    'status': 'pending',
    'community_outcome': 'pending',
    'summary': "Monroe Township (Gloucester County) introduced Ordinance O:20-2026 on April 8, 2026 to ban data centers from the Hexa Redevelopment Plan on Black Horse Pike. Final adoption vote scheduled for April 22, 2026. Follows January 8 planning board approval and continued community pushback. Trending toward a community win.",
}, append_sources=[
    "https://www.nj.com/gloucester-county/2026/04/monroe-township-advances-ordinance-banning-data-centers-from-hexa-redevelopment.html"
])

# Phillipsburg NJ — Ordinance 2026-08 UNANIMOUSLY adopted April 14
# Two existing entries — consolidate primary fact update on the ordinance entry; refresh the other too.
upd('phillipsburg-nj-ban-ordinance-2026-04', {
    'status': 'passed',
    'community_outcome': 'win',
    'summary': "Phillipsburg, NJ Town Council UNANIMOUSLY adopted Ordinance 2026-08 on April 14, 2026, banning data centers in all zoning districts townwide. Residents cited concerns about a potential 300MW data center consuming 3-5 million gallons of water per day. First municipal townwide data center ban in NJ.",
}, append_sources=[
    "https://www.nj.com/warren/2026/04/phillipsburg-unanimously-bans-data-centers-townwide.html",
    "https://www.lehighvalleylive.com/warren-county/2026/04/phillipsburg-council-adopts-data-center-ban-ordinance-2026-08.html"
], add_action_types=['ordinance'])

upd('phillipsburg-nj-2026-02-25', {
    'status': 'passed',
    'community_outcome': 'win',
    'summary': "Phillipsburg, NJ Town Council unanimously adopted Ordinance 2026-08 on April 14, 2026 banning data centers in all zoning districts. The final vote followed a February 24 first reading. Concerns about 300MW power demand and 3-5 million gallons/day water usage drove the action.",
}, append_sources=[
    "https://www.nj.com/warren/2026/04/phillipsburg-unanimously-bans-data-centers-townwide.html"
], add_action_types=['ordinance'])

# ---------------------------------------------------------------------------
# MARYLAND
# ---------------------------------------------------------------------------

# Maryland Utility RELIEF Act — PASSED Sine Die April 13-14
upd('maryland-statewide-sb-596-md-2026-01-01', {
    'status': 'passed',
    'community_outcome': 'win',
    'summary': "Maryland's Utility RELIEF Act PASSED at Sine Die on April 13-14, 2026. The final bill requires data centers to cover their own grid infrastructure costs, prevents cost-shifting to residential ratepayers, and mandates electricity and water usage disclosure. Expected to save average Maryland families ~$150/year on utility bills. A major legislative win for Maryland ratepayers.",
}, append_sources=[
    "https://marylandmatters.org/2026/04/14/utility-relief-act-passes-sine-die-data-center-cost-shift/",
    "https://www.baltimoresun.com/2026/04/14/maryland-utility-relief-act-passes-general-assembly-data-centers/"
])

# ---------------------------------------------------------------------------
# PENNSYLVANIA (April 14 wave)
# ---------------------------------------------------------------------------

# Olyphant — rejected weak zoning April 14; opened 180-day curative amendment window
upd('olyphant-borough-pa-2026-03-31', {
    'status': 'mixed',
    'community_outcome': 'win',
    'summary': "Olyphant Borough Council on April 14, 2026 rejected a weak draft data center zoning ordinance after resident pushback and opened a 180-day curative amendment window. Residents are now actively drafting a stronger replacement ordinance. A procedural win for the community in advance of Sansone Group's proposed 12-data-center Triboro Industrial Park project.",
}, append_sources=[
    "https://www.thetimes-tribune.com/2026/04/15/olyphant-council-rejects-data-center-zoning-opens-curative-amendment-window/"
])

# North Franklin Township PA (Washington County) — NEW
add({
    "id": "north-franklin-township-pa-2026-04-14",
    "jurisdiction": "North Franklin Township",
    "state": "PA",
    "county": "Washington County",
    "lat": 40.1773,
    "lng": -80.2442,
    "action_type": ["ordinance"],
    "date": "2026-04-14",
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
    "opposition_groups": [],
    "opposition_website": None,
    "opposition_facebook": None,
    "opposition_instagram": None,
    "opposition_twitter": None,
    "petition_url": None,
    "petition_signatures": None,
    "summary": "North Franklin Township (Washington County) adopted a proactive ordinance on April 14-16, 2026 regulating cryptocurrency mining and data center operations. No developer has filed a project yet — supervisors called the move 'extremely proactive.' The ordinance includes setbacks, noise limits, and siting requirements designed to protect residential areas before any developer interest emerges.",
    "sources": [
        "https://observer-reporter.com/news/2026/04/north-franklin-township-adopts-data-center-crypto-mining-ordinance/",
        "https://www.post-gazette.com/local/washington/2026/04/16/north-franklin-township-data-center-ordinance-proactive/"
    ],
    "data_source": "news",
    "scope": "local",
    "county_lean": "R",
    "issue_category": ["zoning", "community_impact"],
    "authority_level": "township_board",
    "objective": "Proactive data center and crypto mining regulation ordinance",
    "community_outcome": "win",
})

# Montour County PA — commissioners approved notice of intent Apr 14 for 26-page zoning amendment
# (existing montour-county-pa-2026-02-10 is a DIFFERENT action — Talen rezoning denial.
# Add a NEW entry for the April 14 zoning amendment.)
add({
    "id": "montour-county-zoning-amendment-pa-2026-04-14",
    "jurisdiction": "Montour County (zoning amendment)",
    "state": "PA",
    "county": "Montour County",
    "lat": 41.0319,
    "lng": -76.6592,
    "action_type": ["ordinance"],
    "date": "2026-04-14",
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
    "opposition_groups": [],
    "opposition_website": None,
    "opposition_facebook": None,
    "opposition_instagram": None,
    "opposition_twitter": None,
    "petition_url": None,
    "petition_signatures": None,
    "summary": "Montour County Commissioners approved a notice of intent on April 14, 2026 to adopt a 26-page zoning amendment covering cryptocurrency mining, AI data centers, and hyperscaler facilities. The amendment follows the commissioners' February 2026 unanimous denial of a Talen Energy rezoning request and establishes comprehensive siting standards for high-density compute operations countywide.",
    "sources": [
        "https://www.standardjournal.com/news/local/article_montour-county-zoning-amendment-data-center-april-2026.html",
        "https://www.pressenterpriseonline.com/2026/04/15/montour-county-advances-data-center-zoning-amendment/"
    ],
    "data_source": "news",
    "scope": "local",
    "county_lean": "R",
    "issue_category": ["zoning"],
    "authority_level": "county_commission",
    "objective": "26-page zoning amendment covering crypto, AI, and hyperscaler data centers",
    "community_outcome": "pending",
})

# West Rockhill Township PA — April 15 hearing on zoning amendment
upd('west-rockhill-township-bucks-county-pa-2026-02-24', {
    'status': 'pending',
    'community_outcome': 'pending',
    'summary': "West Rockhill Township (Bucks County) held a public hearing on April 15, 2026 on a preemptive zoning amendment restricting data centers to the Planned Industrial district. Approximately 150 residents attended the hearing. The Board of Supervisors continues to advance the amendment adjacent to existing industrial uses in the township.",
}, append_sources=[
    "https://www.buckscountyherald.com/news/2026/04/west-rockhill-data-center-zoning-hearing-april-15/"
])

# Lower Mt. Bethel Township PA — town hall April 9-10; 6,000+ petition signatures
upd('lower-mt-bethel-township-pa-2025-10-01', {
    'status': 'active',
    'community_outcome': 'pending',
    'petition_signatures': 6195,
    'summary': "Peron Development / J.G. Petrucci Company are proposing a 1.2GW, 450-acre data center campus in Lower Mt. Bethel Township (Northampton County) near Martins Creek and the Delaware River. An April 9-10, 2026 town hall drew significant opposition. The Change.org petition now exceeds 6,000 signatures. Community group 'No Data Center In LMBT' continues organizing against the project.",
}, append_sources=[
    "https://www.mcall.com/2026/04/10/lower-mount-bethel-data-center-town-hall-peron-petrucci-1-2-gigawatt/"
], add_action_types=['public_comment'])

# Archbald PA — Wildcat Ridge hearing April 14. $2.1B, 17.2M sq ft, 14 DCs, 1.6GW
upd('archbald-pa-2025-11-01', {
    'status': 'active',
    'community_outcome': 'pending',
    'summary': "Wildcat Ridge's $2.1 billion, 17.2 million sq ft, 14-data-center, 1.6GW campus in Archbald Borough had a hearing on April 14, 2026. Archbald Borough Council previously approved a zoning amendment expanding data center eligibility from 4 to 9 districts; residents filed lawsuits and continue to push back. The April 14 hearing is part of the ongoing development review process.",
    'megawatts': 1600,
    'building_sq_ft': 17200000,
    'investment_million_usd': 2100,
}, append_sources=[
    "https://www.thetimes-tribune.com/2026/04/15/archbald-wildcat-ridge-data-center-hearing-2-1-billion/"
])

# PA State House — April 14 passed two more oversight bills (annual reporting + model zoning)
upd('pennsylvania-hb-1834-pa-2026-03-24', {
    'status': 'passed',
    'community_outcome': 'pending',
    'summary': "Pennsylvania's first-ever data center regulatory framework (HB 1834) passed the House 104-95 on March 24, 2026. On April 14, 2026, the House passed TWO additional data center oversight bills: one requiring annual reporting from data center operators and one creating a model zoning template for municipalities. HB 1834 requires data centers to cover full grid upgrade costs, mandates clean energy sourcing starting 2028, and establishes transparency requirements. All three bills now head to the Senate.",
}, append_sources=[
    "https://www.penncapital-star.com/briefs/pa-house-passes-two-additional-data-center-oversight-bills-april-14/"
])

# East Whiteland Township PA — April 15 curative amendment process + 887K sq ft expanded plan hearing
upd('east-whiteland-curative-pa-2026-04-01', {
    'status': 'active',
    'community_outcome': 'pending',
    'summary': "East Whiteland Township (Chester County) held an April 15, 2026 hearing on the developer's expanded 887,000 sq ft data center plan as the township advances its curative amendment process to revise zoning. Residents continue pushing back after the original proposal was expanded 60%. The curative amendment window allows the township to rewrite its zoning ordinance to better regulate data center development.",
    'building_sq_ft': 887000,
}, append_sources=[
    "https://www.dailylocal.com/2026/04/15/east-whiteland-data-center-hearing-887000-sq-ft-curative-amendment/"
])

# ---------------------------------------------------------------------------
# MASSACHUSETTS
# ---------------------------------------------------------------------------

# Lowell MA — 10-0 moratorium March 10 (already captured — just refresh last_updated with a source note)
upd('lowell-ma-moratorium-2026-03', {
    'status': 'passed',
    'community_outcome': 'win',
    'summary': "Lowell City Council voted 10-0 on March 10, 2026 to enact a one-year moratorium on data center development — the first such municipal moratorium in Massachusetts. Championed by community group 'Honest Future for Lowell.' Gives the city time to develop zoning and regulatory framework before any developer proposals advance.",
})

# Everett MA — Planning Board endorsed April 6 ordinance capping DCs at 20K sq ft / 5MW
upd('everett-ma-2026-02-24', {
    'status': 'pending',
    'community_outcome': 'pending',
    'summary': "Everett Planning Board voted unanimously on April 6, 2026 to endorse an ordinance restricting data centers in the Docklands Innovation District (EDID). The ordinance caps facilities at 20,000 sq ft or 5 MW (whichever is smaller) and requires special permits. Now advances to the City Council for final action.",
}, append_sources=[
    "https://www.bostonglobe.com/2026/04/07/metro/everett-planning-board-data-center-zoning-ordinance/"
])

# ---------------------------------------------------------------------------
# NEW YORK
# ---------------------------------------------------------------------------

# STAMP / Genesee County NY — third-party analysis challenged STREAM US claims
upd('genesee-county-alabama-ny-2026-03-20', {
    'status': 'active',
    'community_outcome': 'pending',
    'summary': "Proposed $19.46 billion, 2.2 million sq ft STREAM US data center at the Genesee County STAMP industrial park faces continued opposition. On April 14-17, 2026, third-party economic analysis challenged STREAM US's $19.5 billion economic benefit claims, finding the figures significantly overstated. Rep. Jen Gies spoke out against the project on April 17. The Town of Alabama public comment period remains open.",
}, append_sources=[
    "https://www.wbta1490.com/2026/04/17/rep-jen-gies-speaks-out-stamp-stream-data-center/",
    "https://www.batavianews.com/2026/04/15/third-party-analysis-stream-us-stamp-economic-claims-challenged/"
])

# ---------------------------------------------------------------------------
# RHODE ISLAND
# ---------------------------------------------------------------------------

# Smithfield RI — Planning Board advanced ban April 13; Town Council vote May 5
upd('smithfield-ri-ban-2026-04', {
    'status': 'pending',
    'community_outcome': 'pending',
    'summary': "Smithfield Planning Board voted on April 13, 2026 to advance a data center ban, giving a positive recommendation to the Town Council. The Town Council vote is scheduled for May 5, 2026. Target of the ban is Revity Energy's proposed data center business park on several hundred acres behind the Fidelity campus. Smithfield currently lacks any data center ordinance, meaning uses not explicitly allowed are prohibited.",
}, append_sources=[
    "https://rhodeislandcurrent.com/2026/04/14/smithfield-planning-board-advances-data-center-ban-town-council-may-5/"
])

# ---------------------------------------------------------------------------
# Write back
# ---------------------------------------------------------------------------

with open(PATH, 'w') as f:
    json.dump(data, f, indent=2, ensure_ascii=False)

print(f"\n=== Batch 4 (Northeast/Mid-Atlantic) complete ===")
print(f"Updated: {updated}")
print(f"Added:   {added}")
print(f"Total entries now: {len(data)}")
print(f"\nUpdated IDs:")
for i in update_log:
    print(f"  - {i}")
print(f"\nAdded IDs:")
for i in add_log:
    print(f"  + {i}")
