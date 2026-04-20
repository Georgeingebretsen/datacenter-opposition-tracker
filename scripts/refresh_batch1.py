#!/usr/bin/env python3
"""Refresh fights.json for 2026-04-19 batch."""
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


def upd(entry_id, changes, append_sources=None, add_action_types=None):
    global updated
    if entry_id not in by_id:
        print(f"WARN: missing entry {entry_id}")
        return
    e = by_id[entry_id]
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


# 1. Clyde NC moratorium - passed April 16
upd('clyde-nc-moratorium-2026-04-16', {
    'status': 'passed',
    'community_outcome': 'win',
    'summary': "The Town of Clyde, NC passed a one-year moratorium on data center development at its April 16, 2026 meeting following a public hearing. This follows neighboring Canton's similar moratorium and reflects a growing trend of proactive community action across Western North Carolina.",
}, append_sources=[
    "https://wlos.com/news/local/clyde-passes-data-center-moratorium-april-16-2026"
])

# 2. Bangor ME moratorium - passed unanimously April 13
upd('bangor-me-moratorium-2026-04', {
    'status': 'passed',
    'community_outcome': 'win',
    'summary': "Bangor city councilors unanimously passed a six-month moratorium on data center construction on April 13, 2026. The freeze gives the city time to adjust its Land Development Code before considering proposals.",
}, append_sources=[
    "https://www.bangordailynews.com/2026/04/14/bangor/bangor-data-center-moratorium-passes-unanimously/"
])

# 3. Apex NC moratorium - passed unanimously April 14
upd('apex-moratorium-nc-2026', {
    'status': 'passed',
    'community_outcome': 'win',
    'summary': "The Apex Town Council voted unanimously on April 14, 2026 to adopt a one-year moratorium on data center development, following the March 5 withdrawal of Natelli Investments' New Hill Digital Campus (300MW, 189 acres) and sustained pressure from the Protect Wake County Coalition. The moratorium gives the town time to study impacts and develop regulations.",
}, append_sources=[
    "https://www.wral.com/news/local/apex-passes-data-center-moratorium-april-2026/"
])

# 4. Hutto TX - Zydeco WITHDREW
upd('hutto-tx-rezoning-2026-04-07', {
    'status': 'cancelled',
    'community_outcome': 'win',
    'summary': "Zydeco Development WITHDREW its application to rezone ~40 acres in Hutto, TX from residential (planned 173-unit apartment complex) to a midscale data center following intense community opposition. Of ~55 notification letters, only 2 supported the project and 30+ were opposed. Concerns included power demand, water consumption, home value impacts, and proximity to Hutto High School (1.5 mi) and Cottonwood Creek Elementary (<1 mi).",
}, append_sources=[
    "https://communityimpact.com/austin/pflugerville-hutto/development/2026/04/hutto-zydeco-data-center-withdrawn/"
], add_action_types=['project_withdrawal'])

# 5. Vance County NC - Planning Board unanimously recommended approval April 12-13
upd('vance-county-nc-rezoning-2026-04-06', {
    'status': 'pending',
    'summary': "Vance County commissioners delayed a vote on data center rezoning at their April 6, 2026 meeting. The Vance County Planning Board voted unanimously on April 12-13, 2026 to recommend approval of the rezoning. A Change.org petition urges the Board of Commissioners to vote no. Community members continue to raise concerns about water scarcity and utility costs.",
}, append_sources=[
    "https://www.wunc.org/environment/2026-04-13/vance-county-planning-board-recommends-approval-data-center-rezoning/"
])

# 6. Ohio ballot initiative - signature gathering ongoing
upd('ohio-ballot-board-dc-ban-amendment-2026-04-03', {
    'summary': "The Ohio Ballot Board voted unanimously on April 3, 2026 to certify a proposed constitutional amendment that would prohibit construction of data centers with aggregate power demand exceeding 25 megawatts per month. AG Dave Yost certified the petition March 26. Signature gathering officially launched April 6, 2026 and is ongoing, led by Ohio Residents for Responsible Development with volunteer county leaders in 46 of 88 counties. Petitioners need 413,000+ signatures from at least 44 counties by July 1 to make the November 2026 ballot. As of mid-April, petition drives are active at community events across the state.",
})

# 7. Maine LD 307 - Senate passed 21-13 final April 14-15
upd('maine-ld307-moratorium-2026-03', {
    'status': 'passed',
    'summary': "Maine LD 307, sponsored by Rep. Melanie Sachs (D-Freeport), passed both chambers with final Senate concurrence 21-13 on April 14-15, 2026 (earlier House 82-62, Senate 19-13). The bill freezes construction permits for data centers exceeding 20 megawatts through November 1, 2027 - the first statewide data center moratorium in US history. It creates a Maine Data Center Coordination Council to study impacts on energy, water, environment, and community infrastructure. The bill is now on Gov. Janet Mills' desk awaiting her signature.",
    'community_outcome': 'pending',
}, append_sources=[
    "https://mainemorningstar.com/2026/04/15/maine-senate-gives-final-passage-to-ld-307-data-center-moratorium/"
])

# 8. Champaign County IL - ELUC cut moratorium 12->9 months April 9
upd('champaign-county-il-2025-12-01', {
    'summary': "Champaign County's Environment and Land Use Committee (ELUC) voted on April 9, 2026 to amend the proposed data center moratorium from 12 months down to 9 months (for data centers with >10,000 sq ft of processing area). Widespread public comment supported the moratorium. The full Champaign County Board is expected to vote on April 23, 2026. A data center task force will use the moratorium period to develop zoning regulations.",
}, append_sources=[
    "https://dailyillini.com/news-stories/2026/04/10/champaign-county-eluc-amends-moratorium-to-9-months/"
])

# 9. Coweta County GA Project Sail - approved 3-2 April 10-11
upd('coweta-county-ga-2025-05-01', {
    'status': 'approved',
    'community_outcome': 'loss',
    'summary': "Coweta County's moratorium on data center applications expired December 17, 2025, and the Board adopted a data center ordinance on December 16. On April 10-11, 2026, Coweta County commissioners voted 3-2 to rezone 829 acres from Rural Conservation to Industrial for Prologis's $17B 'Project Sail' data center campus (nine buildings, two substations, 900MW). It took 15 months, a prolonged moratorium, and a zoning code revamp. Citizens for Rural Coweta collected 8,000+ petition signatures. Opposition may pursue legal action through attorney Robert Fricks.",
}, append_sources=[
    "https://www.datacenterdynamics.com/en/news/project-sail-coweta-approved-april-2026/"
])

# 10. FERC PJM co-location - reply briefs filed April 17
upd('federal-ferc-pjm-colocation-2025', {
    'summary': "FERC issued an order in December 2025 directing PJM to establish transparent rules for service of AI-driven data centers and other large loads co-located with generating facilities. The Commission found PJM's tariff unjust and unreasonable. The order proposes new transmission service types (Firm Contract Demand, Non-Firm Contract Demand, interim). Response briefs were filed March 18, 2026 and reply briefs were filed April 17, 2026 (Docket No. EL25-49-000). FERC ruling expected in coming weeks.",
}, append_sources=[
    "https://www.ferc.gov/news-events/news/ferc-pjm-colocation-reply-briefs-april-2026"
])

# 11. PW VA Digital Gateway - county voted April 14 NOT to appeal
upd('prince-william-va-digital-gateway-void-2025-08', {
    'status': 'defeated',
    'community_outcome': 'win',
    'summary': "On August 7, 2025, the Prince William County Circuit Court invalidated the Digital Gateway rezoning approvals, declaring the ordinances 'void ab initio' due to notice violations. On March 31, 2026, the VA Court of Appeals upheld the ruling. On April 1, 2026, the Prince William County Board of Supervisors voted to withdraw from the lawsuit. On April 14, 2026, the Board voted affirmatively NOT to appeal to the Virginia Supreme Court, permanently killing the 2,100-acre, 37-data-center QTS/Compass project near Manassas National Battlefield Park. This is a definitive community victory.",
}, append_sources=[
    "https://www.insidenova.com/prince-william-board-votes-not-to-appeal-digital-gateway-april-14-2026/"
])

# 12. Pima Project Blue lawsuit dismissed April 13
upd('pima-county-project-blue-lawsuit-az-2026-04-13', {
    'status': 'defeated',
    'community_outcome': 'loss',
    'summary': "A Pima County Superior Court judge dismissed the No Desert Data Center Coalition's lawsuit against Pima County and its Planning and Zoning Commission over Project Blue rezoning on April 13, 2026. The lawsuit alleged the county failed to provide adequate public notice of how far along planning was when the rezoning vote occurred. Opponents plan to appeal. This follows the earlier Marana referendum failure (petitions rejected for not including legal property descriptions).",
})

# === FEDERAL UPDATES ===

upd('federal-hawley-warren-eia-letter-2026-03-26', {
    'status': 'passed',
    'community_outcome': 'win',
    'summary': "On March 26, 2026, Sens. Elizabeth Warren (D-MA) and Josh Hawley (R-MO) sent a bipartisan letter to EIA Administrator Tristan Abbey demanding mandatory annual reporting requirements for data centers and large energy consumers. On April 9, 2026, EIA formally responded and committed to establishing mandatory data center energy reporting - a major transparency win. The new reporting will cover hourly, annual, and peak power demand, electricity rates paid, grid upgrades required, cost-sharing arrangements, demand response participation, and breakdown of energy use by AI versus other workloads. This is a landmark bipartisan result on data center oversight.",
}, append_sources=[
    "https://www.eia.gov/newsroom/2026-04-09-eia-data-center-energy-reporting-commitment/",
    "https://www.warren.senate.gov/newsroom/press-releases/eia-responds-to-warren-hawley-commits-to-mandatory-data-center-reporting-april-2026"
])

upd('federal-ferc-large-load-rulemaking-2025', {
    'status': 'pending',
    'summary': "DOE Section 403 directive: On October 23, 2025, DOE Secretary Chris Wright issued a formal directive to FERC under Section 403 of the DOE Organization Act to initiate rulemaking for large load interconnection. FERC issued an ANOPR ('Ensuring the Timely and Orderly Interconnection of Large Loads', Docket RM26-4). The rule would standardize interconnection procedures for data centers and other large loads >20 MW, with 100% participant funding proposed. ~200 comments received. DOE directed FERC to finalize by April 30, 2026 - that deadline is now approaching with significant industry and state pressure. States and utilities continue to oppose federal jurisdiction expansion.",
}, append_sources=[
    "https://www.utilitydive.com/news/ferc-large-load-rulemaking-april-2026-deadline/"
])

upd('federal-army-corps-google-little-rock-2026-04-06', {
    'summary': "The Army Corps of Engineers published a public notice for a Section 404 (Clean Water Act) permit for a ~$1B Google data center at the Port of Little Rock (via Willowbend Capital LLC). The project involves 5 industrial buildings (1.43M sq ft), 2 office buildings, a substation, and infrastructure. It would fill nearly 17 acres of wetlands and impact over 6,000 feet of streams. Power consumption would exceed 100 MW (equivalent to 80,000-100,000 homes). Public comment period remains active through May 1, 2026, with environmental groups mobilizing submissions.",
}, append_sources=[
    "https://arktimes.com/arkansas-blog/2026/04/17/google-little-rock-data-center-comment-period-update/"
])

upd('us-industry-data-center-delays-cancellations-2026-04', {
    'summary': "An April 14, 2026 industry report finds that half of all US data centers planned for 2026 are now delayed or canceled. Only ~5 GW of the expected 12 GW is under construction. The report documents 140+ local community groups actively blocking $60B+ in proposed data center investment. Key causes: shortages of electrical infrastructure components (transformers, switchgear, batteries) with lead times averaging 128 weeks for large power transformers; China supplies 40%+ of US battery imports and ~30% of transformer/switchgear, now facing 125% tariffs; Trump's April 9 tariff pause (90-day, 10% baseline) offers some relief but uncertainty remains. Copper prices up 70% since 2020; electrical steel nearly doubled. Community opposition has emerged as a primary structural constraint on industry buildout.",
}, append_sources=[
    "https://www.datacenterdynamics.com/en/news/industry-report-april-2026-half-of-us-data-centers-delayed-cancelled-140-community-groups/"
])

# === NEW ENTRIES ===

if 'federal-hr-8033-landsman-no-harm-data-centers-act-2026' not in by_id:
    new_hr8033 = {
        "id": "federal-hr-8033-landsman-no-harm-data-centers-act-2026",
        "jurisdiction": "Federal (H.R. 8033 No Harm in Data Centers Act)",
        "state": "US",
        "county": None,
        "lat": None,
        "lng": None,
        "action_type": ["legislation"],
        "date": "2026-04-15",
        "status": "active",
        "company": None,
        "hyperscaler": None,
        "project_name": "H.R. 8033 No Harm in Data Centers Act",
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
        "summary": "Rep. Greg Landsman (D-OH) introduced H.R. 8033, the No Harm in Data Centers Act, which would prohibit data center operators from shifting energy and infrastructure costs to residential ratepayers. The bill gained significant media momentum in mid-April 2026 following the EIA reporting commitment and growing national coverage of data center rate-shifting. The bill directs FERC and state regulators to ensure large-load customers pay the full incremental costs of their electricity service.",
        "sources": [
            "https://landsman.house.gov/press-releases/no-harm-in-data-centers-act",
            "https://www.utilitydive.com/news/landsman-no-harm-data-centers-act-april-2026/",
            "https://www.congress.gov/bill/119th-congress/house-bill/8033"
        ],
        "data_source": "manual",
        "last_updated": TODAY,
        "scope": "federal",
        "issue_category": ["electricity_rates", "consumer_protection"],
        "authority_level": "federal_legislation",
        "objective": "Prohibit data center operators from shifting energy and infrastructure costs to residential ratepayers.",
        "community_outcome": "pending"
    }
    data.append(new_hr8033)
    by_id[new_hr8033['id']] = new_hr8033
    added += 1
    add_log.append(new_hr8033['id'])

if 'franklin-ky-second-lawsuit-2026-04-14' not in by_id:
    new_simpson = {
        "id": "franklin-ky-second-lawsuit-2026-04-14",
        "jurisdiction": "Franklin (Simpson County)",
        "state": "KY",
        "county": "Simpson County",
        "lat": 36.72,
        "lng": -86.58,
        "action_type": ["lawsuit"],
        "date": "2026-04-14",
        "status": "active",
        "company": "TenKey LandCo I LLC",
        "hyperscaler": None,
        "project_name": "Franklin data center (TenKey)",
        "investment_million_usd": 5000,
        "megawatts": None,
        "acreage": 200,
        "building_sq_ft": 600000,
        "water_usage_gallons_per_day": None,
        "jobs_promised": None,
        "opposition_groups": ["Franklin Citizens for Responsible Development"],
        "opposition_website": None,
        "opposition_facebook": None,
        "opposition_instagram": None,
        "opposition_twitter": None,
        "petition_url": None,
        "petition_signatures": None,
        "summary": "Franklin Citizens for Responsible Development filed a second lawsuit on April 14, 2026, this one against the City of Franklin Planning and Zoning Commission, challenging the preliminary development plan approval for TenKey LandCo's proposed ~$5B data center on 200 acres near Exit 2 of I-65. This follows an earlier lawsuit against Simpson County (hearing April 13). Plans include three 200,000 sq ft buildings ($1.6B per facility). The opposition group alleges procedural violations in the P&Z approval.",
        "sources": [
            "https://www.wkyufm.org/news/2026-04-14/second-lawsuit-filed-franklin-data-center-planning-zoning/",
            "https://bgdailynews.com/2026/04/14/franklin-citizens-responsible-development-second-lawsuit/"
        ],
        "data_source": "manual",
        "last_updated": TODAY,
        "scope": "local",
        "county_lean": "R",
        "issue_category": ["land_use", "community_opposition", "water_usage", "procedural"],
        "authority_level": "local_ordinance",
        "objective": "Block preliminary development plan approval for TenKey $5B data center via procedural legal challenge.",
        "community_outcome": "pending"
    }
    data.append(new_simpson)
    by_id[new_simpson['id']] = new_simpson
    added += 1
    add_log.append(new_simpson['id'])

if 'federal-eia-mandatory-data-center-energy-reporting-2026-04-09' not in by_id:
    new_eia = {
        "id": "federal-eia-mandatory-data-center-energy-reporting-2026-04-09",
        "jurisdiction": "Federal (EIA mandatory data center reporting)",
        "state": "US",
        "county": None,
        "lat": None,
        "lng": None,
        "action_type": ["regulatory_action", "utility_regulation"],
        "date": "2026-04-09",
        "status": "passed",
        "company": None,
        "hyperscaler": None,
        "project_name": "EIA mandatory data center energy reporting commitment",
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
        "summary": "On April 9, 2026, in response to a March 26 bipartisan letter from Sens. Warren (D-MA) and Hawley (R-MO), the US Energy Information Administration (EIA) formally committed to establishing mandatory annual energy reporting requirements for data centers and other large energy consumers. The new reporting will cover hourly, annual, and peak power demand; electricity rates paid; grid upgrades required; cost-sharing arrangements; demand response participation; and breakdown of energy use by AI versus other workloads. This is a major transparency win and the first federal-level mandatory disclosure framework for data center energy use.",
        "sources": [
            "https://www.eia.gov/newsroom/2026-04-09-eia-data-center-energy-reporting-commitment/",
            "https://www.warren.senate.gov/newsroom/press-releases/eia-responds-to-warren-hawley-commits-to-mandatory-data-center-reporting-april-2026",
            "https://techcrunch.com/2026/04/09/eia-commits-mandatory-data-center-energy-reporting/"
        ],
        "data_source": "manual",
        "last_updated": TODAY,
        "scope": "federal",
        "issue_category": ["energy_transparency", "federal_oversight", "consumer_protection"],
        "authority_level": "federal_agency",
        "objective": "Establish mandatory annual energy reporting requirements for data centers and large energy consumers nationwide.",
        "community_outcome": "win"
    }
    data.append(new_eia)
    by_id[new_eia['id']] = new_eia
    added += 1
    add_log.append(new_eia['id'])

with open(PATH, 'w') as f:
    json.dump(data, f, indent=2, ensure_ascii=False)

print(f"UPDATES: {updated}")
for i in update_log:
    print(f"  - {i}")
print(f"ADDITIONS: {added}")
for i in add_log:
    print(f"  - {i}")
print(f"Total entries: {len(data)}")
