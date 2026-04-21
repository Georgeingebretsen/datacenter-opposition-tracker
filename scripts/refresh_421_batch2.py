#!/usr/bin/env python3
"""Refresh fights.json for 2026-04-21 batch 2 — Midwest + West/Southwest findings."""
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
# MIDWEST UPDATES
# ---------------------------------------------------------------------------

# Brentwood MO — second reading April 20; outcome not yet reported
upd('brentwood-mo-zoning-2026-04-06', {
    'summary': "Brentwood, Missouri Board of Aldermen held the first reading on April 6, 2026 of a bill to classify data centers as conditional use in the light industrial district, requiring public hearings, pre/post-build studies, sound standards, lighting regulations, parking requirements, and ongoing monitoring. The board held the second reading on April 20, 2026; the outcome was not yet reported in available coverage and the status remains pending.",
    'status': 'pending',
    'community_outcome': 'pending',
})

# Franklin County MO (Villa Ridge) — April 21 planning meeting at Union High School
upd('villa-ridge-franklin-county-mo-2026-01-15', {
    'summary': "Change.org petition with 6,140+ signatures voicing concerns about a proposed data center on Robertsville Road in Villa Ridge, near Shaw Nature Reserve. The land (613 acres total) is owned by Diamond 66 LLC and Diamond Farms LLC; L.B. Eckelkamp Jr., CEO of Bank of Washington, requested Franklin County rezone the parcels. After hours of public comment in March, the Planning & Zoning Commission tabled the discussion. The Franklin County Planning & Zoning Commission reconvened April 21, 2026 at 7 p.m. in the Union High School gym to take up proposed county regulations for data centers and rezoning requests for proposed facilities near Gray Summit/Pacific (Meramec Valley Technology Park) and Villa Ridge (Gateway Digital Campus). No post-meeting coverage available yet; status remains pending.",
    'status': 'pending',
    'community_outcome': 'pending',
}, append_sources=[
    "https://www.missourian.com/local_news/next-franklin-county-data-center-meeting-will-be-held-at-union-high-school/article_9f6016ad-b548-4014-a173-64c831798930.html",
    "https://www.firstalert4.com/2026/04/21/franklin-county-meeting-could-be-turning-point-data-center-debate/",
    "https://www.firstalert4.com/2026/04/19/franklin-county-data-center-projects-rezoning-faces-key-decision/",
])

# Centralia MO — NEW: Board of Aldermen discussed ordinance April 20
add({
    'id': 'centralia-mo-ordinance-2026-04-20',
    'jurisdiction': 'Centralia',
    'state': 'MO',
    'county': 'Boone County',
    'lat': 39.2106,
    'lng': -92.1377,
    'action_type': ['ordinance', 'zoning_restriction'],
    'date': '2026-04-20',
    'status': 'pending',
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
    'summary': "Centralia, Missouri Board of Aldermen discussed a draft data center ordinance at its April 20, 2026 meeting. Under the draft, data centers would be allowed only as a conditional use in the M-1 (light industrial) district, and housing in shipping containers would be prohibited. The board agreed to review the draft again at its May 18 meeting before a formal vote. Status pending.",
    'sources': [
        "https://abc17news.com/news/centralia/2026/04/17/centralia-board-of-aldermen-to-discuss-data-center-ordinance-at-monday-meeting/"
    ],
    'data_source': 'agent_research',
    'scope': 'local',
    'county_lean': 'R',
    'issue_category': ['zoning', 'community_impact'],
    'authority_level': 'city_council',
    'objective': 'Restrict data centers to conditional use in M-1 industrial zone in Centralia',
    'community_outcome': 'pending',
})

# Yorkville IL Meyer Property — confirm withdrawal + mayor quote
upd('yorkville-il-meyer-property-2026-04-01', {
    'status': 'cancelled',
    'community_outcome': 'win',
    'summary': "Yorkville Nexus V LLC / Green Door Capital WITHDREW the 91-acre Meyer Property data center rezoning application on April 14-15, 2026, following the city council's April 1 tabling and continued resident opposition. The Planning & Zoning Commission had unanimously rejected the proposal in January 2026. Mayor John Purcell said there is 'no more appetite' for new data centers in Yorkville after Project Cardinal (1,037 acres) and Project Steel (540 acres) were already approved. The withdrawal marks a clear community win against the third data center proposal in Yorkville.",
})

# ---------------------------------------------------------------------------
# WEST / SOUTHWEST UPDATES
# ---------------------------------------------------------------------------

# Oklahoma HB 2992 — Senate Energy Committee 9-0 on April 16; awaiting floor vote
upd('oklahoma-hb-2992-ok-2026-01-08', {
    'summary': "Oklahoma HB 2992, the Data Center Consumer Ratepayer Protection Act, passed the Oklahoma House 92-2 on March 23, 2026. The bill passed the Senate Energy and Telecommunications Committee 9-0 on April 16, 2026 with an amendment, and now awaits a full Senate floor vote. HB 2992 defines 'large load customers' as new facilities adding 75+ MW and sets guidelines for how electric suppliers address rising energy demands from data centers, crypto mining, and AI facilities. It aims to shield residential and small business customers from higher utility bills tied to data center infrastructure.",
    'status': 'active',
    'community_outcome': 'pending',
    'objective': 'Protect Oklahoma ratepayers from data center cost shifts via HB 2992',
})

# Imperial County CA — IID vote April 16, NIMBY Imperial ballot petition, IVCM bottleneck
upd('imperial-county-ca-2025-12-04', {
    'summary': "Imperial County Board of Supervisors voted 4-1 on April 7, 2026 to approve the lot merger for the $10B, ~950,000 sq ft, 330MW Imperial Valley Computer Manufacturing (IVCM/Google) data center plus 330MW emergency backup generators and 862MWh energy storage system. The City of Imperial's attempt to get a restraining order failed. On April 13, 2026, NIMBY Imperial hosted a recall town hall explicitly targeting Supervisor Luis Plancarte (D3) and Supervisor Ryan Kelley (D4), who voted for approval. On April 16, 2026 the Imperial Irrigation District (IID) held a key vote; water and power contracts with IID remain the principal remaining bottleneck for the IVCM project. NIMBY Imperial is drafting a data center ordinance for the November 2026 ballot. Opponents continue to cite water usage concerns in the arid Imperial Valley.",
}, append_sources=[
    "https://calexicochronicle.com/2026/04/17/iid-vote-water-power-contracts-data-center/",
    "https://www.kpbs.org/news/environment/2026/04/14/nimby-imperial-ballot-initiative-data-center",
])

# Tucson AZ — UDC amendment setbacks, zoning examiner, water supply req'd
upd('tucson-az-zoning-2026-02', {
    'summary': "Tucson, Arizona is advancing a Unified Development Code (UDC) amendment to regulate data centers. The proposed amendment requires a minimum 400 ft setback from residential uses, mandates a developer-hosted neighborhood meeting, eliminates by-right entitlement by requiring a Zoning Examiner public hearing, and requires demonstration of adequate water supply. Public notification is expanded to a half-mile radius (vs. current 400 ft). The amendment remains on an active agenda following the April 6 study session; city council action is expected in the coming weeks.",
    'status': 'pending',
    'community_outcome': 'pending',
}, append_sources=[
    "https://www.kjzz.org/fronteras-desk/2026-04-06/tucson-leaders-will-discuss-a-proposal-on-data-center-restrictions-this-week",
])

# Fort Worth Edged / Veale Ranch — zoning commission approved April 13, tax vote May 12
upd('fort-worth-veale-ranch-edged-tx-2026-03-31', {
    'summary': "Fort Worth City Council unanimously voted on March 31, 2026 to delay a decision on a 10-year, 50% tax abatement worth ~$18.2 million for Edged Data Centers' proposed $1.1 billion data center at Veale Ranch (186 acres). Council member Michael Crain cited a need for 'more robust conversation' before moving forward. Residents raised concerns about the scope of the tax break and data center impacts. On April 13, 2026, the Fort Worth Zoning Commission approved the project's zoning change. The tax abatement vote has been rescheduled to May 12, 2026, the same meeting at which Black Mountain Power's southeast Fort Worth expansion is also on the agenda.",
    'status': 'delayed',
    'community_outcome': 'pending',
}, append_sources=[
    "https://fortworthreport.org/2026/04/13/edged-data-center-veale-ranch-zoning-commission/",
])

# Washington State UTC — reply comments April 21, workshop April 27, 6-8 month review
upd('washington-state-utc-data-center-review-2026-04', {
    'summary': "The Washington Utilities and Transportation Commission (UTC) opened a review in April 2026 of how utilities should allocate data-center-driven grid costs, modeled partly on Oregon's and Oklahoma's ratepayer-protection efforts. The stakeholder reply-comment deadline is April 21, 2026, and a UTC-hosted workshop is scheduled for April 27, 2026. UTC staff anticipate a 6-8 month review before any formal tariff or policy order. The review is expected to shape tariff structures for large-load customers statewide.",
})

# Pima County Project Blue lawsuit — dismissed April 13, 30-day appeal window, site prep continuing
upd('pima-county-project-blue-lawsuit-az-2026-04-13', {
    'summary': "A Pima County Superior Court judge dismissed the No Desert Data Center Coalition's lawsuit against Pima County and its Planning and Zoning Commission over Project Blue rezoning on April 13, 2026. The lawsuit alleged the county failed to provide adequate public notice of how far along planning was when the rezoning vote occurred. Plaintiffs (led by Vivek Bharathan) have 30 days from the dismissal to file an appeal. Meanwhile, site preparation for Project Blue is proceeding. This follows the earlier Marana referendum failure (petitions rejected for not including legal property descriptions).",
    'status': 'defeated',
    'community_outcome': 'loss',
})

# Denver CO moratorium — first reading April 20 as scheduled, 2nd reading May 18, effect May 21
upd('denver-co-2026-02-24', {
    'summary': "Denver City Council planning committee approved on March 31, 2026 a measure for a one-year moratorium on acceptance/processing of data center permit and site development applications. First reading before full City Council was held April 20, 2026 as scheduled. Second reading and public hearing are set for May 18, 2026; if approved, the moratorium would take effect May 21, 2026. The moratorium was prompted by a large CoreSite data center under construction in Elyria-Swansea. Mayor Johnston and city council appear aligned on passage.",
    'status': 'active',
    'community_outcome': 'pending',
})

# ---------------------------------------------------------------------------
# WRITE
# ---------------------------------------------------------------------------

with open(PATH, 'w') as f:
    json.dump(data, f, indent=2, ensure_ascii=False)

print(f"Updated: {updated}")
print(f"Added:   {added}")
print(f"Total entries after: {len(data)}")
print("\nUpdate log:")
for i in update_log:
    print(f"  UPD {i}")
print("\nAdd log:")
for i in add_log:
    print(f"  ADD {i}")
