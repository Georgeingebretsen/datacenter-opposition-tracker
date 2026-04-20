#!/usr/bin/env python3
"""Daily refresh batch 2: Midwest + West/Southwest research agent updates.
Run date: 2026-04-19. Applied on top of batch 1.
"""

import json
from pathlib import Path

FIGHTS = Path("/Users/georgeingebretsen/Desktop/Main/Code/datacenter-fights/site/data/fights.json")
TODAY = "2026-04-19"


def norm(s):
    return (s or "").strip().lower()


def find_by_id(entries, id_):
    for e in entries:
        if e.get("id") == id_:
            return e
    return None


def apply_update(entry, patch):
    """Shallow-merge patch into entry; always sets last_updated."""
    for k, v in patch.items():
        entry[k] = v
    entry["last_updated"] = TODAY


UPDATES = [
    # --- MIDWEST UPDATES ---
    {
        "id": "ypsilanti-township-mi-2025-06-01",
        "patch": {
            "company": "University of Michigan / Los Alamos National Laboratory / DTE Energy / Thor Equities",
            "summary": (
                "University of Michigan's $1.25B supercomputing facility for Los Alamos National Laboratory on 124 "
                "acres in Ypsilanti Township faces strong opposition. On March 31, 2026, the Ypsilanti Township Board "
                "voted unanimously to adopt Resolution 2026-05 opposing construction. On April 16, 2026, the Township "
                "Board advanced a water moratorium resolution targeting the U-M/Los Alamos project and a separate "
                "Thor Equities data center proposal, citing strained water infrastructure and lack of transparency. "
                "Community concerns center on environmental impact, national security risks, and lack of transparency."
            ),
            "sources": [
                "https://planetdetroit.org/2026/04/ypsilanti-township-escalates-data-center-fight/",
                "https://www.easternecho.com/article/2026/04/ypsilanti-township-strengthens-opposition-to-data-center-as-u-m-confirms-land-purchase",
                "https://michiganadvance.com/2026/04/02/ypsilanti-township-board-gives-full-support-to-resolution-opposing-los-alamos-research-facility/",
                "https://actionnetwork.org/letters/stop-the-hydro-park-data-center",
                "https://stopthedatacenter.org/",
            ],
        },
    },
    {
        "id": "yorkville-il-meyer-property-2026-04-01",
        "patch": {
            "status": "cancelled",
            "community_outcome": "win",
            "summary": (
                "Yorkville Nexus V LLC / Green Door Capital WITHDREW the 91-acre Meyer Property data center "
                "rezoning application on April 14-15, 2026, following the city council's April 1 tabling and "
                "continued resident opposition. The Planning & Zoning Commission had unanimously rejected the "
                "proposal in January 2026. The withdrawal marks a community win against the third data center "
                "proposal in Yorkville, joining already-approved Project Cardinal (1,037 acres) and Project Steel "
                "(540 acres). Residents cited concerns about construction-related pollution, traffic, and "
                "proximity to Caledonia homes."
            ),
            "sources": [
                "https://www.shawlocal.com/kendall-county-now/2026/04/01/80-acre-data-center-near-caledonia-tabled-in-yorkville/",
                "https://www.wspynews.com/news/local/yorkville-tables-meyer-property-data-center-rezoning/article_ebc51183-539f-4243-91cc-83cbf03130f3.html",
            ],
        },
    },
    {
        "id": "port-washington-wi-2025-08-01",
        "patch": {
            "summary": (
                "Following the April 7, 2026 passage of the anti-data-center referendum (66%), Metropolitan "
                "Milwaukee Association of Commerce and allied business groups filed suit challenging the "
                "referendum's validity. A scheduling conference was held April 16, 2026. Separately, Great Lakes "
                "Neighbors United's lawsuit over the $15B Vantage/OpenAI/Oracle Stargate project continues. "
                "Construction on the 1.3 GW facility is underway. A previous recall effort against Mayor Ted "
                "Neitzke collected ~1,200 signatures but fell short of the ~1,600 needed in February 2026."
            ),
        },
    },
    {
        "id": "nobles-county-mn-opposition-2026-02",
        "patch": {
            "status": "pending",
            "summary": (
                "Nobles County Planning and Zoning Commission voted on April 8, 2026 against changing the zoning "
                "ordinance to allow data centers as conditional use in agricultural preservation areas, blocking "
                "Geronimo Power's proposed data center in Elk Township. After 2+ hours of discussion, 19 spoke in "
                "support and 18 against. The Nobles County Board of Commissioners is scheduled to take the "
                "final vote on April 21, 2026."
            ),
        },
    },
    {
        "id": "pine-island-mn-2025-10-16",
        "patch": {
            "summary": (
                "Google's Project Skyway data center on 482 acres in Pine Island faces an environmental lawsuit. "
                "Minnesota Center for Environmental Advocacy's lawsuit challenging the adequacy of Pine Island's "
                "environmental review (AUAR) had a summary judgment hearing in Goodhue County District Court on "
                "April 6, 2026, with a second hearing scheduled for April 20, 2026. MCEA is asking courts to "
                "require a more comprehensive environmental impact statement."
            ),
        },
    },
    {
        "id": "festus-mo-crg-community-opposition-2026-03",
        "patch": {
            "summary": (
                "After CRG withdrew its data center proposal from St. Charles, the Festus City Council "
                "unanimously annexed 240 acres and on March 31, 2026 approved the $6B CRG data center development "
                "agreement despite fierce opposition. On April 8, 2026, voters ousted ALL FOUR incumbent council "
                "members who supported the data center, with turnout 129% higher than April 2025. On April 10, "
                "2026, Wake Up JeffCo filed a 12-count lawsuit against the city and CRG alleging Sunshine Law "
                "violations and unlawful private meetings during the approval process, and launched recall "
                "petitions against remaining officials."
            ),
        },
    },
    {
        "id": "martindale-brightwood-indianapolis-in-2026-02-12",
        "patch": {
            "summary": (
                "Metrobloks proposed a $500 million, 75MW urban data center on 14 acres at the former Sherman "
                "Drive-In site in Martindale-Brightwood, Indianapolis. On April 1, 2026, the Metropolitan "
                "Development Commission voted 6-2 to approve rezoning despite nearly 100 people speaking in "
                "opposition. The project now heads to the City-County Council for final approval. On April 6, "
                "13 rounds were fired at Councilor Ron Gibson's home with a 'No Data Centers' note left on his "
                "doorstep; FBI and DHS are assisting the investigation. The Protect Martindale-Brightwood "
                "coalition condemned the violence."
            ),
        },
    },

    # --- WEST/SOUTHWEST UPDATES ---
    {
        "id": "texas-house-state-affairs-hearing-tx-2026-04-09",
        "patch": {
            "summary": (
                "Texas House State Affairs Committee held follow-on data-center hearings April 13, 2026, "
                "continuing the five-hour April 9 hearing where ERCOT CEO Pablo Vegas testified that incoming "
                "businesses plan to pull 410,000 MW from the grid — about 7x more than new demand accommodated "
                "in 2024. 87% of new interconnection requests are data centers. ERCOT is creating a 'batch "
                "interconnection process' to prioritize grid connections and require deposits for grid upgrades. "
                "PUC Chairman Thomas Gleeson testified about the need for regulations ensuring data centers pay "
                "for infrastructure costs rather than passing them to ratepayers."
            ),
        },
    },
    {
        "id": "harlingen-data-center-ordinance-tx-2026",
        "patch": {
            "summary": (
                "Harlingen city commissioners voted unanimously on April 2, 2026 to begin the process for a "
                "120-day data center moratorium targeting the proposed $14B Eneus Energy project (1,785 acres, "
                "2,000 MW, 4.6M gallons/day) near Valley International Airport. Public hearings are scheduled "
                "for May and June 2026. The city is working with WaterWorks to evaluate water supply impacts, "
                "wastewater capacity, and electrical load demands. The moratorium followed months of community "
                "pushback over strained infrastructure and aligns with Cameron County's April 7 resolution."
            ),
        },
    },
    {
        "id": "dona-ana-county-nm-2025-08-27",
        "patch": {
            "summary": (
                "Doña Ana County, New Mexico approved a historic Industrial Revenue Bond for Project Jupiter, "
                "a $165 BILLION (over 30 years) AI data center campus by STACK Infrastructure and BorderPlex "
                "Digital Assets, with Oracle as anchor tenant. On April 14, 2026, the County Commission adopted "
                "a resolution directing the County Manager to independently verify Project Jupiter's water use "
                "claims, responding to public pressure over water transparency. On March 31, 2026, the New "
                "Mexico State Land Commissioner rejected the gas pipeline application needed to power Project "
                "Jupiter — a major energy obstacle. The project faces two lawsuits, 7,000+ public comments on "
                "air permits, and growing community opposition."
            ),
        },
    },
    {
        "id": "boulder-city-nv-ballot-2026-11",
        "patch": {
            "summary": (
                "Boulder City Council voted 3-1 on February 24, 2026 to refer 'Question 1' to the November 2026 "
                "ballot, asking voters whether to allow data center facilities in the Eldorado Valley Transfer "
                "Area. The proposed 170MW Townsite Solar 2 AI data center would occupy 88.5 acres and use "
                "600,000+ gallons/day of wastewater effluent. Protests continued through April 2026, with the "
                "Boulder City Planning Commission scheduled to hear the project again May 20, 2026 ahead of the "
                "November ballot. A petition opposing the project has gathered 1,400+ signatures; all public "
                "commenters at recent meetings have opposed the project."
            ),
        },
    },
    {
        "id": "denver-co-2026-02-24",
        "patch": {
            "summary": (
                "Denver City Council planning committee approved on March 31, 2026 a measure for a one-year "
                "moratorium on acceptance/processing of data center permit and site development applications. "
                "First reading before full City Council is scheduled for April 20, 2026, with public hearing "
                "set for May 18. If passed, it would take effect May 21. The moratorium was prompted by a "
                "large CoreSite data center under construction in Elyria-Swansea. Mayor Johnston and city "
                "council are aligned on passage."
            ),
        },
    },
    {
        "id": "oklahoma-hb-2992-ok-2026-01-08",
        "patch": {
            "summary": (
                "Oklahoma HB 2992, the Data Center Consumer Ratepayer Protection Act, passed the Oklahoma House "
                "92-2 on March 23, 2026, and passed the Senate Energy Committee 9-0 on April 16-17, 2026. The "
                "bill defines 'large load customers' as new facilities adding 75+ MW and sets guidelines for how "
                "electric suppliers address rising energy demands from data centers, crypto mining, and AI "
                "facilities. It aims to shield residential and small business customers from higher utility "
                "bills tied to data center infrastructure. Now headed to the full Senate."
            ),
            "sources": [
                "https://nondoc.com/2026/03/23/hb-2992-seeks-to-protect-oklahoma-ratepayers-from-data-centers-other-large-energy-users/",
                "https://www.okenergytoday.com/2026/04/data-center-bill-awaits-state-senate-vote/",
                "https://www.okenergytoday.com/2026/04/senate-committee-advances-data-center-ratepayer-protection-act/",
            ],
        },
    },
    {
        "id": "imperial-county-ca-2025-12-04",
        "patch": {
            "summary": (
                "Imperial County Board of Supervisors voted 4-1 on April 7, 2026 to approve the lot merger for "
                "a $10B, ~950,000 sq ft, 330MW data center plus 330MW emergency backup generators and 862MWh "
                "energy storage system. The City of Imperial's attempt to get a restraining order failed. Armed "
                "deputies removed at least 3 opponents from the meeting. On April 13, 2026, NIMBY Imperial "
                "hosted a recall town hall explicitly targeting Supervisor Luis Plancarte (D3) and Supervisor "
                "Ryan Kelley (D4), who voted for approval. The project bypassed standard environmental review, "
                "with opponents citing water usage concerns in the arid Imperial Valley."
            ),
        },
    },
    {
        "id": "hillsboro-or-2026-02-17",
        "patch": {
            "summary": (
                "SB 1586, which would have brought 373 acres of rural land into Hillsboro's UGB for tech "
                "industries, was shelved. Separately, Councilor Kipperlyn Sinclair's data-center moratorium "
                "petition had gathered 1,300+ of the 2,000 signatures needed as of mid-April 2026. Key "
                "concerns: Hillsboro School District lost $128M to tax abatements in 2024; data centers pay "
                "less than half what residents pay for power; and completed data centers have no power and are "
                "being told 3-5 years wait."
            ),
        },
    },
    {
        "id": "weld-county-co-2026-02-27",
        "patch": {
            "status": "passed",
            "community_outcome": "mixed",
            "summary": (
                "Weld County, Colorado, commissioners PASSED Code Ordinance 2026-01 on a 4-1 vote on April 6, "
                "2026. The ordinance limits data centers to industrial or agricultural zones and requires site "
                "plan or special review for 60+ MW facilities. Triggered by Global AI's purchase of 438 acres "
                "near Windsor for a $2 billion data center. Community outcome is mixed: the ordinance imposes "
                "real restrictions, but critics argued it does not go far enough on water, noise, or ratepayer "
                "protections. Facilities under 50MW total capacity fall under lighter rules."
            ),
        },
    },
]


NEW_ENTRIES = [
    # --- MIDWEST NEW ---
    {
        "id": "ravenna-oh-moratorium-2026-04",
        "jurisdiction": "Ravenna",
        "state": "OH",
        "county": "Portage County",
        "lat": 41.1573,
        "lng": -81.2415,
        "action_type": ["moratorium"],
        "date": "2026-04-10",
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
        "summary": (
            "Ravenna, Ohio city council committee advanced a proposed data center moratorium on April 10, 2026, "
            "sending it to the full council for a vote scheduled April 20, 2026. The measure would pause data "
            "center permits while the city studies zoning, water, and grid impacts. Part of a broader wave of "
            "~18 Ohio communities enacting or considering data center moratoriums in 2026."
        ),
        "sources": [
            "https://www.statenews.org/section/the-ohio-newsroom/2026-04/ohio-data-center-moratoriums",
            "https://www.recordpub.com/story/news/local/2026/04/11/ravenna-data-center-moratorium-advances/",
        ],
        "data_source": "agent_research",
        "last_updated": TODAY,
        "scope": "local",
        "county_lean": "R",
        "issue_category": ["grid_energy", "ratepayer", "zoning"],
        "authority_level": "city_council",
        "objective": "Pause data centers in Ravenna pending zoning and grid study",
        "community_outcome": "pending",
    },
    {
        "id": "shawnee-township-allen-county-oh-moratorium-2026-04",
        "jurisdiction": "Shawnee Township (Allen County)",
        "state": "OH",
        "county": "Allen County",
        "lat": 40.6848,
        "lng": -84.1363,
        "action_type": ["moratorium"],
        "date": "2026-04-13",
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
        "summary": (
            "Shawnee Township trustees (Allen County, Ohio) enacted an 18-month moratorium on April 13, 2026 "
            "covering data centers, battery energy storage systems (BESS), and utility-scale solar. The sweeping "
            "pause is intended to give the township time to develop zoning standards amid rapid energy "
            "infrastructure buildout in the Lima/Allen County area, where Google's Bistrozzi LLC is also facing "
            "opposition over a 200-acre, 115-diesel-generator data center."
        ),
        "sources": [
            "https://www.limaohio.com/news/2026/04/shawnee-township-18-month-moratorium/",
            "https://www.statenews.org/section/the-ohio-newsroom/2026-04/shawnee-township-allen-county-moratorium",
        ],
        "data_source": "agent_research",
        "last_updated": TODAY,
        "scope": "local",
        "county_lean": "R",
        "issue_category": ["grid_energy", "zoning", "community_impact"],
        "authority_level": "township_board",
        "objective": "Pause data centers, BESS, and solar in Shawnee Township for 18 months",
        "community_outcome": "win",
    },
    {
        "id": "botkins-oh-ban-2026-04",
        "jurisdiction": "Botkins",
        "state": "OH",
        "county": "Shelby County",
        "lat": 40.4676,
        "lng": -84.1805,
        "action_type": ["legislation", "ordinance"],
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
        "summary": (
            "The Village of Botkins, Ohio held the first reading of legislation to ban data center development "
            "during the week of April 13, 2026. If adopted, it would be one of the first outright bans (rather "
            "than moratoriums) in Ohio's current wave of data center pushback."
        ),
        "sources": [
            "https://www.sidneydailynews.com/news/2026/04/botkins-data-center-ban-first-reading/",
        ],
        "data_source": "agent_research",
        "last_updated": TODAY,
        "scope": "local",
        "county_lean": "R",
        "issue_category": ["zoning", "community_impact"],
        "authority_level": "city_council",
        "objective": "Ban data center development in the Village of Botkins",
        "community_outcome": "pending",
    },
    {
        "id": "dekalb-county-in-auburn-moratorium-2026-04",
        "jurisdiction": "DeKalb County (Auburn)",
        "state": "IN",
        "county": "DeKalb County",
        "lat": 41.3669,
        "lng": -85.0592,
        "action_type": ["moratorium"],
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
        "summary": (
            "The DeKalb County, Indiana Plan Commission recommended a 6-month data center moratorium on April 14, "
            "2026, sending the measure to the County Commissioners for final action. The recommendation is aimed "
            "at giving the county time to draft zoning standards ahead of any speculative data center proposals "
            "near Auburn."
        ),
        "sources": [
            "https://www.kpcnews.com/news/dekalb/2026/04/dekalb-plan-commission-data-center-moratorium/",
        ],
        "data_source": "agent_research",
        "last_updated": TODAY,
        "scope": "local",
        "county_lean": "R",
        "issue_category": ["zoning", "community_impact"],
        "authority_level": "planning_commission",
        "objective": "Pause data centers in DeKalb County, Indiana for 6 months",
        "community_outcome": "pending",
    },
    {
        "id": "new-buffalo-township-mi-moratorium-2026-04",
        "jurisdiction": "New Buffalo Township",
        "state": "MI",
        "county": "Berrien County",
        "lat": 41.7939,
        "lng": -86.7311,
        "action_type": ["moratorium"],
        "date": "2026-04-08",
        "status": "passed",
        "company": "Project Maize investment group",
        "hyperscaler": None,
        "project_name": "Project Maize",
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
        "summary": (
            "New Buffalo Township, Michigan (Berrien County) passed a 1-year data center moratorium on April 8, "
            "2026, blocking an investment group's 'Project Maize' data center proposal and giving the township "
            "time to develop zoning standards. Part of the broader Michigan trend of at least 19 townships "
            "pausing data centers amid uncertainty about SB 761-763 and state-level preemption risk."
        ),
        "sources": [
            "https://www.heraldpalladium.com/news/2026/04/new-buffalo-township-data-center-moratorium/",
            "https://planetdetroit.org/2026/04/new-buffalo-township-data-center-moratorium/",
        ],
        "data_source": "agent_research",
        "last_updated": TODAY,
        "scope": "local",
        "county_lean": "R",
        "issue_category": ["zoning", "community_impact", "farmland"],
        "authority_level": "township_board",
        "objective": "Block Project Maize data center in New Buffalo Township for 1 year",
        "community_outcome": "win",
    },
    {
        "id": "detroit-mi-zoning-working-group-2026-04",
        "jurisdiction": "Detroit (zoning working group)",
        "state": "MI",
        "county": "Wayne County",
        "lat": 42.3314,
        "lng": -83.0458,
        "action_type": ["study_or_report", "zoning_restriction"],
        "date": "2026-04-14",
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
        "opposition_groups": [
            "Michigan Economic Development Responsibility Alliance",
            "Michigan Sierra Club",
        ],
        "opposition_website": None,
        "opposition_facebook": None,
        "opposition_instagram": None,
        "opposition_twitter": None,
        "petition_url": None,
        "petition_signatures": None,
        "summary": (
            "Following the Detroit City Council's March 18, 2026 resolution requesting a two-year data center "
            "permitting pause, the city convened a zoning policy working group in mid-April 2026 to draft "
            "data-center-specific zoning, environmental, and grid standards. The working group is a follow-on "
            "to District 3 Council Member Scott Benson's resolution and responds to concerns about grid "
            "stability, water use, noise pollution, and land use."
        ),
        "sources": [
            "https://planetdetroit.org/2026/04/detroit-data-center-zoning-working-group/",
            "https://www.michiganpublic.org/environment-climate-change/2026-04/detroit-zoning-working-group",
        ],
        "data_source": "agent_research",
        "last_updated": TODAY,
        "scope": "local",
        "county_lean": "D",
        "issue_category": ["environmental", "grid_energy", "noise", "water", "zoning"],
        "authority_level": "city_council",
        "objective": "Draft data center zoning, grid, and environmental standards in Detroit",
        "community_outcome": "pending",
    },
    {
        "id": "washington-township-macomb-ordinance-dev-2026-04",
        "jurisdiction": "Washington Township (Macomb) - ordinance development",
        "state": "MI",
        "county": "Macomb County",
        "lat": 42.7377,
        "lng": -82.9937,
        "action_type": ["zoning_restriction"],
        "date": "2026-04-09",
        "status": "pending",
        "company": "Prologis",
        "hyperscaler": "Microsoft",
        "project_name": None,
        "investment_million_usd": None,
        "megawatts": None,
        "acreage": 312,
        "building_sq_ft": None,
        "water_usage_gallons_per_day": None,
        "jobs_promised": None,
        "opposition_groups": ["Stop Washington Township Data Center"],
        "opposition_website": None,
        "opposition_facebook": None,
        "opposition_instagram": None,
        "opposition_twitter": None,
        "petition_url": None,
        "petition_signatures": None,
        "summary": (
            "The Washington Township (Macomb County) Planning Commission on April 9, 2026 formally authorized "
            "development of a data center zoning ordinance, following months of postponing the Prologis/"
            "Microsoft 312-acre rezoning. This is the next step after four postponements of the rezoning "
            "decision (January to February to April to June 11). The ordinance is expected to address setbacks, "
            "noise, water, and traffic standards ahead of the postponed June 11 rezoning hearing."
        ),
        "sources": [
            "https://planetdetroit.org/2026/04/washington-township-data-center-ordinance-authorized/",
            "https://www.macombdaily.com/2026/04/10/washington-twp-data-center-ordinance-development/",
        ],
        "data_source": "agent_research",
        "last_updated": TODAY,
        "scope": "local",
        "county_lean": "R",
        "issue_category": ["farmland", "noise", "traffic", "water", "zoning"],
        "authority_level": "planning_commission",
        "objective": "Develop data center zoning ordinance in Washington Township ahead of Prologis rezoning",
        "community_outcome": "pending",
    },
    {
        "id": "caledonia-wi-balch-election-2026-04-07",
        "jurisdiction": "Village of Caledonia (trustee election)",
        "state": "WI",
        "county": "Racine County",
        "lat": 42.7978,
        "lng": -87.8762,
        "action_type": ["other_opposition"],
        "date": "2026-04-07",
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
        "opposition_groups": ["Stop Project Nova"],
        "opposition_website": "https://www.nodata.center/",
        "opposition_facebook": None,
        "opposition_instagram": None,
        "opposition_twitter": None,
        "petition_url": None,
        "petition_signatures": None,
        "summary": (
            "Prescott Balch, an explicitly anti-data-center candidate, was elected Village of Caledonia trustee "
            "on April 7, 2026, cementing anti-data-center representation on the village board after Microsoft "
            "canceled its 244-acre, 900 MW 'Project Nova' data center in October 2025 under community pressure. "
            "The election signals continued political momentum against data-center siting in Racine County."
        ),
        "sources": [
            "https://racinecountyeye.com/2026/04/caledonia-trustee-election-balch-data-center/",
            "https://urbanmilwaukee.com/2026/04/caledonia-elects-anti-data-center-trustee/",
        ],
        "data_source": "agent_research",
        "last_updated": TODAY,
        "scope": "local",
        "county_lean": "R",
        "issue_category": ["community_impact", "zoning"],
        "authority_level": "voters",
        "objective": "Elect anti-data-center trustee Prescott Balch in Caledonia",
        "community_outcome": "win",
    },
    {
        "id": "otoe-county-ne-moratorium-2026-04",
        "jurisdiction": "Otoe County",
        "state": "NE",
        "county": "Otoe County",
        "lat": 40.6505,
        "lng": -96.1372,
        "action_type": ["moratorium"],
        "date": "2026-04-17",
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
        "summary": (
            "The Otoe County, Nebraska Planning Commission on April 17, 2026 recommended a data center "
            "moratorium, sending the measure to the County Board of Commissioners. The recommendation is aimed "
            "at giving the county time to develop zoning and infrastructure standards ahead of anticipated "
            "data center interest in the region."
        ),
        "sources": [
            "https://journalstar.com/news/local/2026/04/otoe-county-planning-commission-data-center-moratorium/",
        ],
        "data_source": "agent_research",
        "last_updated": TODAY,
        "scope": "local",
        "county_lean": "R",
        "issue_category": ["zoning", "community_impact"],
        "authority_level": "planning_commission",
        "objective": "Pause data centers in Otoe County pending zoning standards",
        "community_outcome": "pending",
    },

    # --- WEST/SOUTHWEST NEW ---
    {
        "id": "cameron-county-tx-resolution-2026-04-07",
        "jurisdiction": "Cameron County (resolution on unregulated data centers)",
        "state": "TX",
        "county": "Cameron County",
        "lat": 26.1525,
        "lng": -97.4956,
        "action_type": ["regulatory_action", "public_comment"],
        "date": "2026-04-07",
        "status": "passed",
        "company": "Eneus Energy",
        "hyperscaler": None,
        "project_name": "RGV Data Center (Harlingen)",
        "investment_million_usd": 14000,
        "megawatts": 2000,
        "acreage": 1785,
        "building_sq_ft": None,
        "water_usage_gallons_per_day": 4600000,
        "jobs_promised": 360,
        "opposition_groups": ["South Texas Environmental Justice Network"],
        "opposition_website": "https://sotxejn.org/",
        "opposition_facebook": None,
        "opposition_instagram": None,
        "opposition_twitter": None,
        "petition_url": None,
        "petition_signatures": None,
        "summary": (
            "Cameron County Commissioners' Court adopted a resolution on April 7, 2026 opposing unregulated "
            "data center development in the county, targeting Eneus Energy's proposed $14B RGV Data Center "
            "near Harlingen's Valley International Airport. The resolution urges state and regulatory agencies "
            "to require reporting of anticipated electricity demand, water usage, and infrastructure impacts "
            "before approval, and calls for independent impact assessments. County Judge Eddie Trevino "
            "acknowledged the county's authority is limited when businesses comply with existing permitting."
        ),
        "sources": [
            "https://myrgv.com/local-news/2026/04/08/cameron-county-resolution-unregulated-data-centers/",
            "https://www.rgvbusinessjournal.com/news/08/04/2026/cameron-county-eneus-energy-resolution/",
            "https://www.krgv.com/news/cameron-county-data-center-resolution-april-2026",
        ],
        "data_source": "agent_research",
        "last_updated": TODAY,
        "scope": "local",
        "county_lean": "R",
        "issue_category": ["grid_energy", "transparency", "water", "community_impact"],
        "authority_level": "county_commission",
        "objective": "Oppose unregulated data centers and demand impact disclosures in Cameron County",
        "community_outcome": "win",
    },
    {
        "id": "elbert-county-co-puc-power-pathway-override-2026-04-15",
        "jurisdiction": "Elbert County (Xcel Power Pathway)",
        "state": "CO",
        "county": "Elbert County",
        "lat": 39.2837,
        "lng": -104.1367,
        "action_type": ["infrastructure_opposition", "utility_regulation"],
        "date": "2026-04-15",
        "status": "approved",
        "company": "Xcel Energy",
        "hyperscaler": None,
        "project_name": "Power Pathway",
        "investment_million_usd": 1700,
        "megawatts": None,
        "acreage": None,
        "building_sq_ft": None,
        "water_usage_gallons_per_day": None,
        "jobs_promised": None,
        "opposition_groups": ["Elbert County residents", "Elbert County Board of Commissioners"],
        "opposition_website": None,
        "opposition_facebook": None,
        "opposition_instagram": None,
        "opposition_twitter": None,
        "petition_url": None,
        "petition_signatures": None,
        "summary": (
            "The Colorado Public Utilities Commission voted 3-0 on April 15, 2026 to override Elbert County's "
            "permit denials for Xcel Energy's $1.7B Power Pathway transmission line, a key grid upgrade tied to "
            "Front Range data-center and renewables growth. Elbert County had repeatedly denied local permits "
            "over land-use, aesthetic, and community-impact concerns. As a partial concession, the PUC order "
            "directed Xcel to pay a $2.5 million impact fee to the county. Community outcome is mixed: state "
            "regulators overrode local opposition, but imposed a financial mitigation payment."
        ),
        "sources": [
            "https://www.denvergazette.com/2026/04/16/puc-power-pathway-elbert-county/",
            "https://coloradosun.com/2026/04/15/puc-xcel-power-pathway-elbert/",
            "https://www.9news.com/article/news/local/colorado-news/puc-overrides-elbert-county-xcel/",
        ],
        "data_source": "agent_research",
        "last_updated": TODAY,
        "scope": "statewide",
        "county_lean": "R",
        "issue_category": ["grid_energy", "community_impact", "transparency"],
        "authority_level": "utility_commission",
        "objective": "Block Xcel Power Pathway transmission line through Elbert County",
        "community_outcome": "loss",
    },
    {
        "id": "washington-state-utc-data-center-review-2026-04",
        "jurisdiction": "Washington State (UTC data center review)",
        "state": "WA",
        "county": None,
        "lat": 47.0379,
        "lng": -122.9007,
        "action_type": ["utility_regulation", "study_or_report"],
        "date": "2026-04-01",
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
        "opposition_groups": [],
        "opposition_website": None,
        "opposition_facebook": None,
        "opposition_instagram": None,
        "opposition_twitter": None,
        "petition_url": None,
        "petition_signatures": None,
        "summary": (
            "The Washington Utilities and Transportation Commission (UTC) opened a review in April 2026 of how "
            "utilities should allocate data-center-driven grid costs, modeled partly on Oregon's and Oklahoma's "
            "ratepayer-protection efforts. Written public comments are due April 21, 2026, and the UTC has "
            "scheduled a stakeholder workshop for April 27, 2026. The review is expected to shape tariff "
            "structures for large-load customers statewide."
        ),
        "sources": [
            "https://www.utc.wa.gov/news/2026/utc-opens-data-center-cost-allocation-review",
            "https://www.seattletimes.com/business/technology/2026/04/washington-utc-data-center-rate-review/",
        ],
        "data_source": "agent_research",
        "last_updated": TODAY,
        "scope": "statewide",
        "county_lean": None,
        "issue_category": ["grid_energy", "ratepayer"],
        "authority_level": "utility_commission",
        "objective": "Review data center cost allocation and tariff structure statewide in Washington",
        "community_outcome": "pending",
    },
]


def main():
    data = json.loads(FIGHTS.read_text())
    by_id = {e.get("id"): e for e in data}
    print(f"Loaded {len(data)} entries.")

    updated = 0
    missing = []
    for u in UPDATES:
        e = by_id.get(u["id"])
        if e is None:
            missing.append(u["id"])
            continue
        apply_update(e, u["patch"])
        updated += 1

    added = 0
    skipped_dupes = []
    for new in NEW_ENTRIES:
        if new["id"] in by_id:
            # Treat as update instead.
            apply_update(by_id[new["id"]], {k: v for k, v in new.items() if k != "id"})
            updated += 1
            skipped_dupes.append(new["id"])
            continue
        data.append(new)
        by_id[new["id"]] = new
        added += 1

    FIGHTS.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n")

    print(f"Updated: {updated}")
    print(f"Added:   {added}")
    if missing:
        print(f"Missing IDs (no update applied): {missing}")
    if skipped_dupes:
        print(f"New IDs already existed, merged as updates: {skipped_dupes}")
    print(f"Final total: {len(data)}")


if __name__ == "__main__":
    main()
