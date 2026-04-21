#!/usr/bin/env python3
"""Refresh fights.json for 2026-04-21 batch 1 (status updates + federal)."""
import json

PATH = '/Users/georgeingebretsen/Desktop/Main/Code/datacenter-fights/site/data/fights.json'
TODAY = '2026-04-21'

with open(PATH) as f:
    data = json.load(f)

by_id = {e['id']: e for e in data}
updated = 0
added = 0
update_log = []
add_log = []


def upd(entry_id, changes=None, append_sources=None, add_action_types=None, add_issue_categories=None, add_opposition_groups=None):
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
    if add_issue_categories:
        ic = e.get('issue_category') or []
        for a in add_issue_categories:
            if a not in ic:
                ic.append(a)
        e['issue_category'] = ic
    if add_opposition_groups:
        og = e.get('opposition_groups') or []
        for a in add_opposition_groups:
            if a not in og:
                og.append(a)
        e['opposition_groups'] = og
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
# STATUS UPDATES
# ---------------------------------------------------------------------------

# Nobles County MN — Board voted 3-2 April 21 to block Geronimo rezoning
upd('nobles-county-mn-opposition-2026-02', {
    'status': 'defeated',
    'community_outcome': 'win',
    'summary': "Nobles County (MN) Board of Commissioners voted 3-2 on April 21, 2026 to block a rezoning application from Geronimo Power that would have enabled a data center on land designated for agricultural preservation. The denial caps months of community opposition and protects the ag-preservation designation.",
}, add_action_types=['zoning_restriction'])

# Hutto TX — formal withdrawal April 18, April 20 P&Z meeting cancelled
upd('hutto-tx-rezoning-2026-04-07', {
    'summary': "Hutto, TX: Developer formally withdrew the rezoning application on April 18, 2026, and the April 20 Planning & Zoning meeting was cancelled. The 'Stop the Hutto Data Center' Facebook group organized protests leading up to the withdrawal. Data center rezoning proposal is cancelled; community win.",
}, add_opposition_groups=["Stop the Hutto Data Center"])

# Rowan County NC — NEW: 1-year moratorium April 21
add({
    'id': 'rowan-county-nc-moratorium-2026-04-21',
    'jurisdiction': 'Rowan County',
    'state': 'NC',
    'county': 'Rowan County',
    'lat': 35.6407,
    'lng': -80.4834,
    'action_type': ['moratorium'],
    'date': '2026-04-21',
    'status': 'passed',
    'company': None,
    'hyperscaler': None,
    'project_name': None,
    'investment_million_usd': None,
    'megawatts': None,
    'acreage': None,
    'building_sq_ft': None,
    'water_usage_gallons_per_day': None,
    'jobs_promised': None,
    'opposition_groups': [],
    'opposition_website': None,
    'opposition_facebook': None,
    'opposition_instagram': None,
    'opposition_twitter': None,
    'petition_url': None,
    'petition_signatures': None,
    'summary': "Rowan County (NC) Board of Commissioners approved a 1-year data center moratorium 4-0 on April 21, 2026, effective May 4, 2026. The Long Ferry Road project (EDC Charlotte LLC) is exempted per NC state law which prevents moratoria from applying to already-submitted applications. Commissioner Craig Pierce walked out of the meeting before the vote. The moratorium gives the county time to develop zoning standards for future data center projects.",
    'sources': [
        "https://www.salisburypost.com/2026/04/21/rowan-county-commissioners-approve-data-center-moratorium/"
    ],
    'data_source': 'agent_research',
    'scope': 'local',
    'county_lean': 'R',
    'issue_category': ['community_impact', 'grid_energy'],
    'authority_level': 'county_commission',
    'objective': 'Temporary pause on new data center approvals in Rowan County',
    'community_outcome': 'win',
})

# Cheyenne WY — Public Services Committee voted AGAINST annexation April 20
upd('cheyenne-wy-annexation-2026-04-03', {
    'status': 'defeated',
    'community_outcome': 'win',
    'summary': "Cheyenne, WY City Council Public Services Committee voted against the proposed annexation of land slated for a data center component on April 20, 2026. The committee's rejection is a significant setback for the annexation/data center proposal and a win for residents who organized against it.",
}, append_sources=[
    "https://www.wyomingnewsnow.tv/2026/04/20/cheyenne-committee-rejects-data-center-annexation/"
])

# Prince William VA Digital Gateway — April 15 BoS unanimously voted NOT to appeal
upd('prince-william-va-digital-gateway-void-2025-08', {
    'summary': "Prince William County (VA) Digital Gateway rezoning was voided by court order in August 2025. On April 15, 2026, the Board of Supervisors unanimously voted NOT to appeal the ruling to the Virginia Supreme Court. The county spent over $2 million on outside counsel defending the rezoning. The decision finalizes the community win on the 2,139-acre Digital Gateway.",
}, append_sources=[
    "https://www.insidenova.com/news/prince_william/digital-gateway-appeal-rejected/article.html"
])

# Rocky Top TN — Ordinance 620 second reading moved to May (was April 16)
upd('rocky-top-tn-zoning-2026-04', {
    'summary': "Rocky Top, TN: Ordinance 620 (data center zoning restrictions) second reading was NOT held on April 16, 2026 as previously scheduled. Mayor Templin confirmed the vote has been moved to May 2026. The ordinance remains pending. The delay provides additional time for community comment and council deliberation.",
})

# Maine LD 307 — Gov. Mills has not yet signed/vetoed; Franklin County urging veto
upd('maine-statewide-me-2026-02-12', {
    'summary': "Maine LD 307 (statewide data center regulation bill): As of April 21, 2026, Governor Janet Mills has neither signed nor vetoed the bill. Her deadline is approximately April 24-25, 2026. On April 21, Franklin County leaders publicly urged Gov. Mills to veto the bill. The bill's fate remains uncertain heading into the deadline.",
}, append_sources=[
    "https://www.dailybulldog.com/db/news/franklin-county-leaders-urge-mills-to-veto-ld-307/"
])

# Ravenna OH — special council meeting April 20 advanced 12-month moratorium
upd('ravenna-oh-moratorium-2026-04', {
    'status': 'pending',
    'community_outcome': 'pending',
    'summary': "Ravenna, OH City Council held a special meeting on April 20, 2026 that advanced a 12-month data center moratorium. The second reading and public hearing are scheduled for May 18, 2026. The moratorium would pause new data center applications for one year to allow the city to develop zoning and permitting standards.",
}, append_sources=[
    "https://www.recordpub.com/2026/04/20/ravenna-council-advances-data-center-moratorium/"
])

# Clay Township (Highland County) OH — NEW: 12-month moratorium April 20
add({
    'id': 'clay-township-highland-county-oh-moratorium-2026-04-20',
    'jurisdiction': 'Clay Township (Highland County)',
    'state': 'OH',
    'county': 'Highland County',
    'lat': 39.1873,
    'lng': -83.6024,
    'action_type': ['moratorium'],
    'date': '2026-04-20',
    'status': 'passed',
    'company': None,
    'hyperscaler': None,
    'project_name': None,
    'investment_million_usd': None,
    'megawatts': None,
    'acreage': None,
    'building_sq_ft': None,
    'water_usage_gallons_per_day': None,
    'jobs_promised': None,
    'opposition_groups': [],
    'opposition_website': None,
    'opposition_facebook': None,
    'opposition_instagram': None,
    'opposition_twitter': None,
    'petition_url': None,
    'petition_signatures': None,
    'summary': "Clay Township (Highland County, OH) trustees adopted a 12-month data center moratorium on April 20, 2026. Board Chair Angela Howell cited concerns that rural communities are becoming hot spots for data center development. The moratorium gives the township time to consider zoning and land-use protections before receiving any proposals.",
    'sources': [
        "https://www.timesgazette.com/2026/04/20/clay-township-trustees-adopt-data-center-moratorium/"
    ],
    'data_source': 'agent_research',
    'scope': 'local',
    'county_lean': 'R',
    'issue_category': ['community_impact', 'grid_energy'],
    'authority_level': 'township_trustees',
    'objective': 'Preemptive 12-month moratorium on data center development in rural Clay Township',
    'community_outcome': 'win',
})

# Pine Island MN — second summary judgment hearing April 20 held, ruling pending
upd('pine-island-mn-2025-10-16', {
    'summary': "Pine Island, MN: The second summary judgment hearing in the data center lawsuit was held on April 20, 2026. A ruling is pending. The lawsuit challenges city approval of the data center project and has drawn organized community opposition.",
})

# Port Washington WI — MMAC scheduling conference April 16 at Ozaukee County Justice Center
upd('port-washington-wi-2025-08-01', {
    'summary': "Port Washington, WI: The Midwest Municipal Advocacy Coalition (MMAC) scheduling conference was held April 16, 2026 at the Ozaukee County Justice Center, advancing the legal challenge to the data center approval. The litigation remains active.",
})

# Decatur Township IN — 7 residents filed judicial review April 17
upd('decatur-township-indianapolis-in-2025-12-01', {
    'status': 'active',
    'community_outcome': 'pending',
    'summary': "Decatur Township (Indianapolis, IN): On April 17, 2026, seven residents filed a petition for judicial review challenging the Sabey Data Center approval, alleging the approval was a 'disguised rezoning'. Plaintiffs include members of Protect Decatur Township and the Decatur Township Civic Council. The petition seeks an injunction against project progress. The filing reopens the legal fight over the project.",
}, add_action_types=['lawsuit'], add_opposition_groups=["Protect Decatur Township", "Decatur Township Civic Council"],
   append_sources=[
    "https://www.indystar.com/story/news/local/2026/04/17/decatur-township-residents-file-judicial-review-sabey-data-center/"
])

# Saline Township MI — AG Nessel filed Court of Appeals challenge April 17
upd('saline-township-mi-2025-10-01', {
    'status': 'active',
    'community_outcome': 'pending',
    'summary': "Saline Township, MI: On April 17, 2026, Michigan Attorney General Dana Nessel filed a Michigan Court of Appeals challenge to the Michigan Public Service Commission's (MPSC) ex parte approval of DTE Energy contracts for the 1.4 GW Oracle data center. Nessel's filing seeks to invalidate the MPSC approvals and remand the matter for a contested case hearing. The AG's intervention is a major escalation in the legal fight over DTE's utility contracts for the data center load.",
}, add_action_types=['lawsuit', 'regulatory_action'],
   append_sources=[
    "https://www.michigan.gov/ag/news/press-releases/2026/04/17/nessel-appeals-mpsc-dte-data-center-contracts"
])

# Shreveport LA — NEW: City won lawsuit brought by Mooringsport mayor April 21
add({
    'id': 'shreveport-la-mooringsport-lawsuit-2026-04-21',
    'jurisdiction': 'Shreveport (vs. Mooringsport)',
    'state': 'LA',
    'county': 'Caddo Parish',
    'lat': 32.5252,
    'lng': -93.7502,
    'action_type': ['lawsuit'],
    'date': '2026-04-21',
    'status': 'passed',
    'company': None,
    'hyperscaler': None,
    'project_name': None,
    'investment_million_usd': None,
    'megawatts': None,
    'acreage': None,
    'building_sq_ft': None,
    'water_usage_gallons_per_day': None,
    'jobs_promised': None,
    'opposition_groups': [],
    'opposition_website': None,
    'opposition_facebook': None,
    'opposition_instagram': None,
    'opposition_twitter': None,
    'petition_url': None,
    'petition_signatures': None,
    'summary': "The City of Shreveport won a lawsuit brought by the mayor of Mooringsport on April 21, 2026, over the Shreveport-area data center project. The ruling is a legal victory for the pro-data-center side of the dispute, but community members in Mooringsport continue to oppose the project. Outcome classified as mixed given ongoing community concerns.",
    'sources': [
        "https://www.shreveporttimes.com/story/news/local/2026/04/21/shreveport-wins-mooringsport-data-center-lawsuit/"
    ],
    'data_source': 'agent_research',
    'scope': 'local',
    'county_lean': 'R',
    'issue_category': ['community_impact'],
    'authority_level': 'state_court',
    'objective': 'Legal challenge to Shreveport-area data center project',
    'community_outcome': 'mixed',
})

# Maricopa County AZ Project Baccara — UPDATE existing (P&Z unanimous SUP approval April 9)
upd('surprise-maricopa-county-az-2025-11-01', {
    'status': 'approved',
    'community_outcome': 'loss',
    'petition_signatures': 5000,
    'summary': "Takanock LLC (DigitalBridge-backed) Project Baccara: The Maricopa County Planning & Zoning Commission unanimously approved a military Special Use Permit on April 9, 2026 for the 2 million sq ft data center campus with a 700 MW gas plant, despite 225 opposition letters submitted to the commission. The 'Stop Project Baccara' coalition has collected approximately 5,000 petition signatures. The Board of Supervisors vote on the SUP is still pending and community groups continue to organize against it.",
}, add_action_types=['zoning_restriction'],
   add_opposition_groups=["Stop Project Baccara Coalition"],
   append_sources=[
    "https://www.azcentral.com/story/news/local/arizona/2026/04/09/maricopa-county-planning-zoning-approves-project-baccara-data-center/"
])

# Oakley CA — NEW: 45-day urgency moratorium April 14-15 (first Bay Area city)
add({
    'id': 'oakley-ca-moratorium-2026-04-15',
    'jurisdiction': 'City of Oakley',
    'state': 'CA',
    'county': 'Contra Costa County',
    'lat': 37.9974,
    'lng': -121.7125,
    'action_type': ['moratorium'],
    'date': '2026-04-15',
    'status': 'passed',
    'company': None,
    'hyperscaler': None,
    'project_name': None,
    'investment_million_usd': None,
    'megawatts': None,
    'acreage': None,
    'building_sq_ft': None,
    'water_usage_gallons_per_day': None,
    'jobs_promised': None,
    'opposition_groups': ["Oakley Community Alliance"],
    'opposition_website': None,
    'opposition_facebook': None,
    'opposition_instagram': None,
    'opposition_twitter': None,
    'petition_url': None,
    'petition_signatures': None,
    'summary': "Oakley, CA (Contra Costa County) became the first Bay Area city to pass a data center moratorium, with City Council unanimously adopting a 45-day urgency ordinance on April 14-15, 2026. The moratorium is extensible by the council up to 2 years total and pauses new data center applications while staff develop permanent zoning standards. Builds on prior community organizing that removed data centers from the Bridgehead Industrial Project in March 2026.",
    'sources': [
        "https://www.kqed.org/news/2026/04/15/oakley-first-bay-area-city-data-center-moratorium/",
        "https://contracosta.news/2026/04/15/oakley-passes-45-day-data-center-moratorium/"
    ],
    'data_source': 'agent_research',
    'scope': 'local',
    'county_lean': 'D',
    'issue_category': ['community_impact', 'grid_energy', 'water', 'environmental'],
    'authority_level': 'city_council',
    'objective': '45-day urgency moratorium (extensible up to 2 years) on new data center approvals',
    'community_outcome': 'win',
})

# ---------------------------------------------------------------------------
# FEDERAL
# ---------------------------------------------------------------------------

# FERC Large Load Interconnection Rulemaking — April 16 Order Regarding Intent to Act, deferred to end of June 2026
upd('federal-ferc-large-load-rulemaking-2025', {
    'summary': "FERC Large Load Interconnection Rulemaking: On April 16, 2026, FERC issued an Order Regarding Intent to Act, deferring action to the end of June 2026 — past the April 30 DOE deadline that had been requested. Chair Laura Swett's accompanying statement emphasized the ongoing FERC-vs-state jurisdictional tension over large-load (data center) interconnection. The rulemaking remains pending with substantive order expected by end of June 2026.",
}, append_sources=[
    "https://www.ferc.gov/news-events/news/order-regarding-intent-act-large-load-interconnection-2026-04-16"
])

# FERC PJM Co-Location — April 17 reply brief deadline closed the record
upd('federal-ferc-pjm-colocation-2025', {
    'summary': "FERC PJM Co-Location proceeding: The April 17, 2026 reply brief deadline closed the record. FERC is now awaiting a substantive order on co-location of data centers with existing generation in PJM. The outcome will shape how data centers can directly contract with power plants without going through the full interconnection queue.",
}, append_sources=[
    "https://www.ferc.gov/news-events/news/pjm-colocation-record-closed-2026-04-17"
])

# FERC rejected SunEnergy1 $44.1M waiver — NEW
add({
    'id': 'federal-ferc-sunenergy1-waiver-denial-2026-04-16',
    'jurisdiction': 'United States (FERC)',
    'state': 'US',
    'county': None,
    'lat': None,
    'lng': None,
    'action_type': ['regulatory_action'],
    'date': '2026-04-16',
    'status': 'defeated',
    'company': 'SunEnergy1',
    'hyperscaler': None,
    'project_name': None,
    'investment_million_usd': 44.1,
    'megawatts': None,
    'acreage': None,
    'building_sq_ft': None,
    'water_usage_gallons_per_day': None,
    'jobs_promised': None,
    'opposition_groups': [],
    'opposition_website': None,
    'opposition_facebook': None,
    'opposition_instagram': None,
    'opposition_twitter': None,
    'petition_url': None,
    'petition_signatures': None,
    'summary': "FERC on April 16, 2026 rejected SunEnergy1's request for a $44.1 million waiver of interconnection deposit requirements. The denial signals that FERC will not allow developers (including data center sponsors using large generation-interconnection positions) to dodge required deposits. Ratepayer-advocacy win: prevents cost-shifting from speculative interconnection requests onto captive ratepayers.",
    'sources': [
        "https://www.ferc.gov/news-events/news/ferc-denies-sunenergy1-waiver-2026-04-16"
    ],
    'data_source': 'agent_research',
    'scope': 'federal',
    'county_lean': None,
    'issue_category': ['grid_energy', 'community_impact'],
    'authority_level': 'federal_agency',
    'objective': 'FERC denial of interconnection-deposit waiver; prevents developer cost-shifting to ratepayers',
    'community_outcome': 'win',
})

# EPA Title V streamlining memo April 16 — NEW
add({
    'id': 'federal-epa-title-v-streamlining-memo-2026-04-16',
    'jurisdiction': 'United States (EPA)',
    'state': 'US',
    'county': None,
    'lat': None,
    'lng': None,
    'action_type': ['regulatory_action'],
    'date': '2026-04-16',
    'status': 'passed',
    'company': None,
    'hyperscaler': None,
    'project_name': None,
    'investment_million_usd': None,
    'megawatts': None,
    'acreage': None,
    'building_sq_ft': None,
    'water_usage_gallons_per_day': None,
    'jobs_promised': None,
    'opposition_groups': [],
    'opposition_website': None,
    'opposition_facebook': None,
    'opposition_instagram': None,
    'opposition_twitter': None,
    'petition_url': None,
    'petition_signatures': None,
    'summary': "EPA on April 16, 2026 issued a memorandum streamlining Clean Air Act Title V permit renewals. The memo expedites renewals for major air-pollution sources, including diesel backup generators and gas turbines serving data centers. Air-quality and environmental justice advocates view the streamlining as a loss for pollution oversight of data center on-site combustion sources.",
    'sources': [
        "https://www.epa.gov/newsreleases/epa-streamlines-title-v-permit-renewals-2026-04-16"
    ],
    'data_source': 'agent_research',
    'scope': 'federal',
    'county_lean': None,
    'issue_category': ['environmental', 'air_quality'],
    'authority_level': 'federal_agency',
    'objective': 'EPA streamlining of Clean Air Act Title V permit renewals for data center combustion sources',
    'community_outcome': 'loss',
})

# EIA mandatory reporting — reaffirmed April 15 (TechCrunch) and April 21 (NY Report)
upd('federal-eia-mandatory-data-center-energy-reporting-2026-04-09', {
    'summary': "Federal EIA mandatory data center energy reporting rule: Originally announced April 9, 2026. EIA reaffirmed the rulemaking on April 15, 2026 (TechCrunch coverage) and April 21, 2026 (New York Report). The formal rule will come AFTER EIA's September 2026 pilot concludes. The rule will require data centers to report energy consumption to EIA on an ongoing basis — a major transparency win for researchers, ratepayers, and state regulators.",
}, append_sources=[
    "https://techcrunch.com/2026/04/15/eia-reaffirms-data-center-reporting-rule/",
    "https://www.nyreport.com/2026/04/21/eia-data-center-energy-reporting-pilot/"
])


# ---------------------------------------------------------------------------
# SAVE
# ---------------------------------------------------------------------------

with open(PATH, 'w') as f:
    json.dump(data, f, indent=2, ensure_ascii=False)

print(f"\n=== SUMMARY ===")
print(f"Updated: {updated}")
print(f"Added: {added}")
print(f"Total entries now: {len(data)}")
print(f"\nUpdated IDs:")
for i in update_log:
    print(f"  - {i}")
print(f"\nAdded IDs:")
for i in add_log:
    print(f"  + {i}")
