#!/usr/bin/env node
/**
 * Merges all datacenter fight data from Bryce CSV + DCW scraping + news research
 * into a single deduplicated fights.json
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const TODAY = new Date().toISOString().split('T')[0];

function slugify(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

// All known coordinates
const GEO = {
  // Round 7
  "Hanover County, VA": [37.7590, -77.4717],
  "Henrico County (Varina), VA": [37.4400, -77.3200],
  "Fulton County, IN": [41.0600, -86.2600],
  "Charles County, MD": [38.4700, -76.9800],
  "Ransom Township, PA": [41.4100, -75.5900],
  "Barrington Hills, IL": [42.1400, -88.1500],
  "Aurora, IL": [41.7606, -88.3201],
  "Ashville (Pickaway County), OH": [39.7200, -82.9500],
  "Wood County (Bowling Green area), OH": [41.3800, -83.6500],
  "El Paso, TX": [31.7619, -106.4850],
  "Sterling Heights, MI": [42.5803, -83.0302],
  "Caddo-Bossier Parishes (Shreveport area), LA": [32.5252, -93.7502],
  "Walla Walla County, WA": [46.0646, -118.3430],
  "Marana (referendum lawsuit), AZ": [32.4367, -111.2257],
  // Round 6
  "Abilene, TX": [32.4487, -99.7331],
  "Lacy Lakeview (Waco area), TX": [31.6364, -97.1019],
  // Statewide/misc entries
  "Frederick County, MD": [39.4143, -77.4105],
  "Michigan (statewide), MI": [44.3148, -85.6024],
  // Original Bryce entries
  "Cascade Locks Port Authority, OR": [45.6696, -121.8910],
  "DeKalb County, GA": [33.7712, -84.2263],
  "North Tonawanda, NY": [43.0387, -78.8642],
  "City of Atlanta, GA": [33.7490, -84.3880],
  "Fairfax County, VA": [38.8462, -77.3064],
  "City of Thorndale, TX": [30.6138, -97.2053],
  "City of Peculiar, MO": [38.7192, -94.4577],
  "Gilmer County, GA": [34.6932, -84.4525],
  "Milam County, TX": [30.7849, -96.9766],
  "Marshall County, IN": [41.3234, -86.2700],
  "Douglas County, GA": [33.7015, -84.7477],
  "Loudoun County, VA": [39.0768, -77.6369],
  "Coweta County, GA": [33.3518, -84.7616],
  "Henrico County, VA": [37.5438, -77.3868],
  "Town of Warrenton, VA": [38.7135, -77.7953],
  "City of St. Charles, MO": [38.7839, -90.4812],
  "Clayton County, GA": [33.5413, -84.3588],
  "Troup County, GA": [33.0335, -85.0277],
  "Prince George's County, MD": [38.8296, -76.8453],
  "City of LaGrange, GA": [33.0393, -85.0322],
  "Pike County, GA": [33.0910, -84.3835],
  "Lamar County, GA": [33.0735, -84.1474],
  "White County, IN": [40.7494, -86.8647],
  "Putnam County, IN": [39.6650, -86.8647],
  "Monroe County, GA": [33.0154, -83.9177],
  "Athens-Clarke County, GA": [33.9519, -83.3576],
  // New entries from research
  "City of Tucson, AZ": [32.2226, -110.9747],
  "City of Chandler, AZ": [33.3062, -111.8413],
  "Town of Marana, AZ": [32.4366, -111.2257],
  "Maricopa County, AZ": [33.3484, -112.4955],
  "Denver, CO": [39.7392, -104.9903],
  "Franklin Township, IN": [39.6992, -86.0550],
  "Hancock County, IN": [39.8237, -85.7733],
  "Town of Chesterton, IN": [41.6103, -87.0642],
  "Town of Burns Harbor, IN": [41.6261, -87.1334],
  "Starke County, IN": [41.2850, -86.6486],
  "St. Joseph County, IN": [41.6176, -86.2889],
  "Oldham County, KY": [38.4003, -85.4528],
  "Simpson County, KY": [36.7420, -86.5819],
  "Meade County, KY": [37.9582, -86.2166],
  "Howell Township, MI": [42.6075, -83.9294],
  "Lowell Township, MI": [42.9330, -85.3578],
  "Oshtemo Township, MI": [42.2475, -85.6803],
  "City of Portage, MI": [42.2012, -85.5800],
  "Augusta Charter Township, MI": [42.2167, -83.7833],
  "Green Charter Township, MI": [43.1989, -85.5261],
  "City of Saline, MI": [42.1667, -83.7816],
  "Van Buren Township, MI": [42.2228, -83.4788],
  "City of Mason, MI": [42.5792, -84.4436],
  "City of Eagan, MN": [44.8041, -93.1669],
  "City of Farmington, MN": [44.6402, -93.1438],
  "City of Becker, MN": [45.3933, -93.8771],
  "City of North Mankato, MN": [44.1730, -94.0338],
  "Hermantown, MN": [46.8069, -92.2377],
  "Pacific, MO": [38.4820, -90.7415],
  "New Brunswick, NJ": [40.4862, -74.4518],
  "New York State, NY": [42.1657, -74.9481],
  "Gates County, NC": [36.4378, -76.6970],
  "Chatham County, NC": [35.7210, -79.2515],
  "Town of Canton, NC": [35.5329, -82.8365],
  "City of Kings Mountain, NC": [35.2451, -81.3412],
  "Wake County, NC": [35.7230, -78.5482],
  "Statesville, NC": [35.7826, -80.8873],
  "Jerome Township, OH": [40.1733, -83.2141],
  "Montour County, PA": [41.0319, -76.6592],
  "Blakely, PA": [41.4822, -75.5903],
  "Plymouth Township, PA": [40.1120, -75.2967],
  "Archbald, PA": [41.4951, -75.5363],
  "Colleton County, SC": [32.8891, -80.6413],
  "Spartanburg County, SC": [34.9596, -81.9278],
  "Marion County, SC": [34.1794, -79.4006],
  "San Marcos, TX": [29.8833, -97.9414],
  "Taylor, TX": [30.5710, -97.4094],
  "Prince William County, VA": [38.6581, -77.2819],
  "Culpeper County, VA": [38.4735, -78.0069],
  "Tucker County, WV": [39.1134, -79.5631],
  "Village of DeForest, WI": [43.2478, -89.3437],
  "Village of Caledonia, WI": [42.7978, -87.8762],
  "Village of Yorkville, WI": [42.7303, -87.9823],
  "Village of Greenleaf, WI": [44.2975, -88.0737],
  "Town of Carlton, WI": [44.4939, -87.5142],
  "City of Madison, WI": [43.0731, -89.4012],
  "Fredonia/Saukville, WI": [43.4578, -87.9538],
  "Wyandotte County, KS": [39.1142, -94.7435],
  "Bessemer, AL": [33.4012, -86.9544],
  "New Orleans, LA": [29.9511, -90.0715],
  "Fayetteville, GA": [33.4487, -84.4550],
  "Sangamon County, IL": [39.7817, -89.6501],
  "Jones County, GA": [33.0001, -83.5633],
};

// All entries — merged from all sources
const ALL_FIGHTS = [
  // ===== BRYCE CSV (26 entries) =====
  { jurisdiction: "Cascade Locks Port Authority", state: "OR", action_type: "cancellation", date: "2023-07-01", status: "resolved", company: null, project_name: null, investment_million_usd: null, megawatts: null, opposition_groups: [], summary: "Cascade Locks Port Authority canceled plans for a data center in Oregon.", sources: ["https://www.datacenterdynamics.com/en/news/cascade-locks-port-authority-cancels-plans-for-data-center-in-oregon/"], data_source: "bryce" },
  { jurisdiction: "DeKalb County", state: "GA", action_type: "moratorium", date: "2024-07-01", status: "active", company: null, project_name: null, investment_million_usd: null, megawatts: null, opposition_groups: [], summary: "DeKalb County approved a 100-day moratorium on data center applications and permits. Later extended to June 2026.", sources: ["https://www.wsbtv.com/news/local/dekalb-county/dekalb-county-approves-100-day-moratorium-data-center-applications-permits/"], data_source: "bryce" },
  { jurisdiction: "North Tonawanda", state: "NY", action_type: "moratorium", date: "2024-07-01", status: "active", company: null, project_name: null, investment_million_usd: null, megawatts: null, opposition_groups: [], summary: "North Tonawanda banned new crypto mining operations for 2 years.", sources: ["https://www.govtech.com/policy/north-tonawanda-n-y-bans-new-crypto-mining-for-2-years"], data_source: "bryce" },
  { jurisdiction: "City of Atlanta", state: "GA", action_type: "full_ban", date: "2024-09-01", status: "permanent", company: null, project_name: null, investment_million_usd: null, megawatts: null, opposition_groups: [], summary: "Atlanta City Council banned data centers along the Beltline corridor.", sources: ["https://www.gpb.org/news/2024/09/04/atlanta-city-council-bans-data-centers-along-beltline"], data_source: "bryce" },
  { jurisdiction: "Fairfax County", state: "VA", action_type: "zoning_restriction", date: "2024-09-01", status: "permanent", company: null, project_name: null, investment_million_usd: null, megawatts: null, opposition_groups: [], summary: "Fairfax County tightened data center rules with restrictive zoning ordinance.", sources: ["https://www.datacenterfrontier.com/site-selection/article/55139905/northern-virginias-fairfax-county-tightens-data-center-rules"], data_source: "bryce" },
  { jurisdiction: "City of Thorndale", state: "TX", action_type: "resolution_opposing", date: "2024-10-01", status: "permanent", company: null, project_name: null, investment_million_usd: null, megawatts: null, opposition_groups: [], summary: "Thorndale passed a formal resolution opposing a Bitcoin mining operation.", sources: ["https://theminermag.com/news/2024-10-11/thorndale-bitcoin-mine-oppose"], data_source: "bryce" },
  { jurisdiction: "City of Peculiar", state: "MO", action_type: "full_ban", date: "2024-10-01", status: "permanent", company: null, project_name: null, investment_million_usd: null, megawatts: null, opposition_groups: [], summary: "Peculiar reversed zoning for a data center after community outcry, removing data centers from permitted uses.", sources: ["https://www.kshb.com/news/local-news/peculiar-reverses-zoning-for-data-center-after-cries-from-neighbors"], data_source: "bryce" },
  { jurisdiction: "Gilmer County", state: "GA", action_type: "full_ban", date: "2024-11-01", status: "permanent", company: null, project_name: null, investment_million_usd: null, megawatts: null, opposition_groups: [], summary: "Gilmer County enacted a full ban on cryptocurrency mining operations.", sources: ["https://www.gpb.org/news/2025/12/04/the-costs-of-crypto-mining-in-georgia-will-it-be-regulated-along-new-data-center"], data_source: "bryce" },
  { jurisdiction: "Milam County", state: "TX", action_type: "zoning_restriction", date: "2024-12-01", status: "permanent", company: null, project_name: null, investment_million_usd: null, megawatts: null, opposition_groups: [], summary: "Milam County imposed location restrictions on crypto/data center operations.", sources: ["https://www.texasobserver.org/crypto-energy-grid-texas-bitcoin-water/"], data_source: "bryce" },
  { jurisdiction: "Marshall County", state: "IN", action_type: "moratorium", date: "2025-02-01", status: "active", company: null, project_name: null, investment_million_usd: null, megawatts: null, opposition_groups: [], summary: "Marshall County enacted a moratorium on data center development.", sources: ["https://www.datacenterwatch.org/report"], data_source: "bryce" },
  { jurisdiction: "Douglas County", state: "GA", action_type: "moratorium", date: "2025-03-01", status: "active", company: null, project_name: null, investment_million_usd: null, megawatts: null, opposition_groups: [], summary: "Douglas County approved a moratorium on data center development.", sources: ["https://www.fox5atlanta.com/news/douglas-county-data-centers-moratorium"], data_source: "bryce" },
  { jurisdiction: "Loudoun County", state: "VA", action_type: "zoning_restriction", date: "2025-03-01", status: "permanent", company: null, project_name: null, investment_million_usd: null, megawatts: null, opposition_groups: [], summary: "Loudoun County eliminated by-right data center development, requiring special permits for all new facilities.", sources: ["https://www.hklaw.com/en/insights/publications/2025/04/loudoun-county-virginia-eliminates-by-right-data-center-development"], data_source: "bryce" },
  { jurisdiction: "Coweta County", state: "GA", action_type: "moratorium", date: "2025-05-01", status: "active", company: null, project_name: null, investment_million_usd: null, megawatts: null, opposition_groups: [], summary: "Coweta County passed a moratorium on data center development.", sources: ["https://www.gpb.org/news/2025/10/22/wave-of-data-center-ordinances-sweep-through-ga-counties-how-strict-are-they"], data_source: "bryce" },
  { jurisdiction: "Henrico County", state: "VA", action_type: "zoning_restriction", date: "2025-06-01", status: "permanent", company: null, project_name: null, investment_million_usd: null, megawatts: null, opposition_groups: [], summary: "Henrico County Board of Supervisors passed a Provisional Use Permit requirement for data centers.", sources: ["https://www.12onyourside.com/2025/06/11/henrico-board-supervisors-passes-stricter-requirements-data-centers/"], data_source: "bryce" },
  { jurisdiction: "Town of Warrenton", state: "VA", action_type: "full_ban", date: "2025-07-01", status: "permanent", company: null, project_name: null, investment_million_usd: null, megawatts: null, opposition_groups: [], summary: "Warrenton Town Council voted to fully ban data centers from the town.", sources: ["https://www.fauquier.com/news/town-council-votes-to-ban-data-centers-from-warrenton/article_0f58d64e-f89e-4dbd-8825-c06e65f1a4b7.html"], data_source: "bryce" },
  { jurisdiction: "City of St. Charles", state: "MO", action_type: "moratorium", date: "2025-08-01", status: "active", company: null, project_name: null, investment_million_usd: null, megawatts: null, opposition_groups: [], summary: "St. Charles enacted a full moratorium on data center development.", sources: ["https://www.stltoday.com/news/local/st-charles/article_cc69ee91-9269-42c1-8a23-5a93d1c05679.html"], data_source: "bryce" },
  { jurisdiction: "Clayton County", state: "GA", action_type: "moratorium", date: "2025-09-01", status: "active", company: null, project_name: null, investment_million_usd: null, megawatts: null, opposition_groups: [], summary: "Clayton County Board of Commissioners approved a moratorium on new data centers.", sources: ["https://www.claytoncountyga.gov/news/clayton-county-board-of-commissioners-approves-moratorium-on-new-data-centers-in-clayton-county/"], data_source: "bryce" },
  { jurisdiction: "Troup County", state: "GA", action_type: "moratorium", date: "2025-09-01", status: "active", company: null, project_name: null, investment_million_usd: null, megawatts: null, opposition_groups: [], summary: "Troup County enacted a moratorium on data center development.", sources: ["https://www.11alive.com/article/news/local/troup-county-moratorium-on-data-centers/85-87d5c110-12db-4a48-88dd-70bda4ac47c9"], data_source: "bryce" },
  { jurisdiction: "Prince George's County", state: "MD", action_type: "moratorium", date: "2025-09-01", status: "active", company: null, project_name: null, investment_million_usd: null, megawatts: null, opposition_groups: [], summary: "Prince George's County paused data center approvals amid policy review.", sources: ["https://conduitstreet.mdcounties.org/2025/09/24/prince-georges-pauses-data-center-approvals-amid-policy-review/"], data_source: "bryce" },
  { jurisdiction: "City of LaGrange", state: "GA", action_type: "moratorium", date: "2025-09-01", status: "active", company: null, project_name: null, investment_million_usd: null, megawatts: null, opposition_groups: [], summary: "LaGrange City Council passed a 180-day moratorium on data centers.", sources: ["https://www.wsbtv.com/news/local/lagrange-city-council-passes-180-day-moratorium-data-centers/LFCNYS3HWRE3VJJAJBBLRT3COA/"], data_source: "bryce" },
  { jurisdiction: "Pike County", state: "GA", action_type: "moratorium", date: "2025-09-01", status: "active", company: null, project_name: null, investment_million_usd: null, megawatts: null, opposition_groups: [], summary: "Pike County enacted a moratorium on data center development as part of a wave of Georgia county ordinances.", sources: ["https://www.gpb.org/news/2025/10/22/wave-of-data-center-ordinances-sweep-through-ga-counties-how-strict-are-they"], data_source: "bryce" },
  { jurisdiction: "Lamar County", state: "GA", action_type: "moratorium", date: "2025-09-01", status: "active", company: null, project_name: null, investment_million_usd: null, megawatts: null, opposition_groups: [], summary: "Lamar County enacted a moratorium on data center development.", sources: ["https://www.gpb.org/news/2025/10/22/wave-of-data-center-ordinances-sweep-through-ga-counties-how-strict-are-they"], data_source: "bryce" },
  { jurisdiction: "White County", state: "IN", action_type: "moratorium", date: "2025-10-01", status: "active", company: null, project_name: null, investment_million_usd: null, megawatts: null, opposition_groups: [], summary: "White County enacted a moratorium on data center development.", sources: ["https://www.datacenterwatch.org/report"], data_source: "bryce" },
  { jurisdiction: "Putnam County", state: "IN", action_type: "moratorium", date: "2025-11-01", status: "active", company: null, project_name: null, investment_million_usd: null, megawatts: null, opposition_groups: [], summary: "Putnam County enacted a moratorium on data center development.", sources: ["https://www.datacenterwatch.org/report"], data_source: "bryce" },
  { jurisdiction: "Monroe County", state: "GA", action_type: "moratorium", date: "2025-12-01", status: "active", company: null, project_name: null, investment_million_usd: null, megawatts: null, opposition_groups: [], summary: "Monroe County passed a data center moratorium to review potential limitations on development.", sources: ["https://www.13wmaz.com/article/news/local/forsyth-monroe/monroe-county-passes-data-center-moratorium-will-review-potential-limitations/93-195cbb55-5a2a-4f29-879f-c0f3f859aef2"], data_source: "bryce" },
  { jurisdiction: "Athens-Clarke County", state: "GA", action_type: "moratorium", date: "2025-12-01", status: "active", company: null, project_name: null, investment_million_usd: null, megawatts: null, opposition_groups: [], summary: "Athens-Clarke County Commission paused new data center development. The existing Athens Studios data center would need to rezone.", sources: ["https://www.wuga.org/local-news/2025-12-03/acc-commission-pauses-new-data-centers-manager-says-athens-studios-data-center-would-need-rezone"], data_source: "bryce" },

  // ===== NEW ENTRIES FROM RESEARCH =====
  { jurisdiction: "City of Tucson", state: "AZ", action_type: "permit_denial", date: "2025-08-06", status: "resolved", company: "Amazon (via Beale Infrastructure)", project_name: "Project Blue", investment_million_usd: 3600, megawatts: 600, opposition_groups: ["No Desert Data Center"], summary: "Tucson City Council voted 7-0 to reject Project Blue, a 290-acre, 600MW data center linked to AWS. Community opposition centered on water use and energy costs. Amazon later pulled out entirely.", sources: ["https://azluminaria.org/2025/08/06/tucson-city-council-rejects-project-blue-amid-intense-community-pressure/"], data_source: "news" },
  { jurisdiction: "City of Chandler", state: "AZ", action_type: "permit_denial", date: "2025-12-12", status: "permanent", company: "Active Infrastructure", project_name: null, investment_million_usd: 2500, megawatts: null, opposition_groups: [], summary: "Chandler City Council unanimously rejected a $2.5B AI data center. Emails opposing the project outnumbered supporters 20-to-1. Former Sen. Kyrsten Sinema lobbied for the project but the council rejected it anyway.", sources: ["https://www.azfamily.com/2025/12/12/chandler-unanimously-votes-against-proposed-ai-data-center/"], data_source: "dcw" },
  { jurisdiction: "Town of Marana", state: "AZ", action_type: "zoning_restriction", date: "2024-12-01", status: "permanent", company: null, project_name: null, investment_million_usd: null, megawatts: null, opposition_groups: [], summary: "Marana approved an ordinance prohibiting municipal drinking water for data center cooling. Developers must secure alternate water sources and meet noise, energy, and environmental requirements.", sources: ["https://www.kgun9.com/news/community-inspired-journalism/marana/maranas-data-center-ordinance"], data_source: "news" },
  { jurisdiction: "Maricopa County", state: "AZ", action_type: "cancellation", date: "2024-05-01", status: "resolved", company: "Tract", project_name: "Project Range", investment_million_usd: 14000, megawatts: null, opposition_groups: [], summary: "Tract withdrew its $14B rezoning application for a 1,000-acre data center complex after pushback from Goodyear and Buckeye over incompatibility with land uses.", sources: ["https://therealdeal.com/national/phoenix/2024/05/02/tract-drops-14b-plan-to-build-data-centers-outside-phoenix/"], data_source: "news" },
  { jurisdiction: "Denver", state: "CO", action_type: "moratorium", date: "2026-02-24", status: "active", company: "CoreSite", project_name: null, investment_million_usd: null, megawatts: 75, opposition_groups: [], summary: "Mayor Mike Johnston announced a one-year moratorium on new data center construction. The city will review zoning, water, energy use, and affordability impacts amid opposition in Globeville-Elyria-Swansea.", sources: ["https://coloradosun.com/2026/02/24/denver-data-center-moratorium-state-legislature-opposition/"], data_source: "dcw" },
  { jurisdiction: "Franklin Township", state: "IN", action_type: "cancellation", date: "2025-09-22", status: "resolved", company: "Google", project_name: "Project Flo", investment_million_usd: 1000, megawatts: null, opposition_groups: ["Protect Franklin Township", "Greater Troy Neighborhood Association"], summary: "Google withdrew its 468-acre 'Project Flo' data center hours before the council was expected to vote it down. 15 of 25 council members announced opposition. A 7,000+ signature petition and loud cheers erupted at the withdrawal.", sources: ["https://www.wfyi.org/news/articles/indianapolis-council-google-data-center-vote-withdrawl"], data_source: "dcw" },
  { jurisdiction: "Hancock County", state: "IN", action_type: "cancellation", date: "2025-06-01", status: "resolved", company: "Surge Development", project_name: "Hancock County MegaSite", investment_million_usd: null, megawatts: null, opposition_groups: [], summary: "Surge Development withdrew its application to rezone 775 acres of farmland for a data center near Tuttle Orchards, a century-old farm. Over 70 people signed up to speak at a public hearing.", sources: ["https://www.wthr.com/article/money/business/application-withdrawn-surge-development-hancock-county-greenfield-data-center-tuttle-orchards/"], data_source: "news" },
  { jurisdiction: "Town of Chesterton", state: "IN", action_type: "cancellation", date: "2024-06-01", status: "resolved", company: "Provident Realty Advisors", project_name: null, investment_million_usd: 1300, megawatts: null, opposition_groups: [], summary: "Provident Realty withdrew its $1.3B data center proposal for a former golf course after the town council stated it could 'never support this project' at its current scale.", sources: ["https://www.datacenterdynamics.com/en/news/application-for-13bn-data-center-in-chesterton-indiana-withdrawn/"], data_source: "news" },
  { jurisdiction: "Town of Burns Harbor", state: "IN", action_type: "protest", date: "2024-08-05", status: "ongoing", company: "Provident Realty Advisors", project_name: null, investment_million_usd: null, megawatts: null, opposition_groups: [], summary: "Over 100 people attended the Planning Commission meeting with 20 speaking against a proposed 7-building, 102-acre data center campus. The developer announced plans to revise.", sources: ["https://www.chicagotribune.com/2024/08/06/burns-harbor-residents-blast-data-center-plan-plan-commission-meeting-on-sept-9-for-discussion/"], data_source: "news" },
  { jurisdiction: "Starke County", state: "IN", action_type: "moratorium", date: "2025-12-04", status: "active", company: null, project_name: null, investment_million_usd: null, megawatts: null, opposition_groups: [], summary: "Starke County Planning Commission unanimously approved a one-year moratorium on data centers exceeding 5,000 sq ft. Fourth Indiana county to enact a data center moratorium.", sources: ["https://www.wndu.com/2025/12/05/starke-county-planning-commission-approves-one-year-data-center-moratorium/"], data_source: "dcw" },
  { jurisdiction: "St. Joseph County", state: "IN", action_type: "permit_denial", date: "2025-12-10", status: "resolved", company: "Amazon", project_name: null, investment_million_usd: 13000, megawatts: null, opposition_groups: [], summary: "County Council voted 7-2 to deny rezoning for a $13B data center near New Carlisle after a marathon 10-hour meeting with public comment lasting until 3 AM.", sources: ["https://wsbt.com/news/local/st-joseph-county-council-denies-rezoning-of-land-for-data-center-votes-7-2-marathon-meeting-hours-long-public-opinion-13-billion-dollar-project-amazon-new-carlisle-approval-process-plan-commission-st-joseph-county-indiana"], data_source: "news" },
  { jurisdiction: "Oldham County", state: "KY", action_type: "moratorium", date: "2025-07-02", status: "active", company: "Western Hospitality Partners", project_name: null, investment_million_usd: 6000, megawatts: 600, opposition_groups: ["We Are Oldham County"], summary: "Oldham County passed a 150-day moratorium 4-2. Western Hospitality Partners subsequently withdrew its $6B, 600MW application. 'We Are Oldham County' organized fierce opposition.", sources: ["https://www.lpm.org/news/2025-07-02/oldham-county-passes-sweeping-data-center-moratorium-executive-fired-over-recording"], data_source: "news" },
  { jurisdiction: "Simpson County", state: "KY", action_type: "lawsuit", date: "2026-01-28", status: "ongoing", company: "TenKey LandCo", project_name: null, investment_million_usd: 5000, megawatts: null, opposition_groups: [], summary: "TenKey LandCo sued Simpson County over a land use ordinance. Franklin's council and planning commission both voted unanimously to reject the developer's rezoning. 150 community members attended the Feb. 5 meeting.", sources: ["https://www.lpm.org/news/2026-01-28/data-center-developer-sues-simpson-county-government-over-land-use-ordinance"], data_source: "dcw" },
  { jurisdiction: "Meade County", state: "KY", action_type: "permit_denial", date: "2025-10-14", status: "permanent", company: null, project_name: null, investment_million_usd: null, megawatts: null, opposition_groups: [], summary: "After a 5-hour public hearing with 150+ residents and a 2,500-signature petition, the Planning Commission declined to recommend rezoning. Fiscal Court unanimously blocked the proposal and adopted a moratorium.", sources: ["https://datacenterwatch.substack.com/p/briefing-10172025"], data_source: "dcw" },
  { jurisdiction: "Howell Township", state: "MI", action_type: "moratorium", date: "2025-11-20", status: "active", company: "Meta (suspected)", project_name: null, investment_million_usd: 1000, megawatts: null, opposition_groups: ["Stop the Data Centers Livingston County"], summary: "Township enacted a unanimous six-month moratorium after ~2 hours of public comment. Meta identified as the company behind the project. Developer withdrew rezoning in Dec 2025.", sources: ["https://planetdetroit.org/2025/12/billion-dollar-data-center-paused/"], data_source: "dcw" },
  { jurisdiction: "Lowell Township", state: "MI", action_type: "cancellation", date: "2025-12-18", status: "resolved", company: "Franklin Lowell LLC", project_name: null, investment_million_usd: null, megawatts: null, opposition_groups: [], summary: "Township suspended its participation after a venue was too small to accommodate opposition turnout. Franklin Lowell LLC withdrew its application.", sources: ["https://www.datacenterdynamics.com/en/news/developer-in-lowell-township-michigan-withdraws-data-center-application-following-opposition/"], data_source: "news" },
  { jurisdiction: "Oshtemo Township", state: "MI", action_type: "moratorium", date: "2026-01-01", status: "active", company: null, project_name: null, investment_million_usd: null, megawatts: null, opposition_groups: [], summary: "Oshtemo Charter Township is considering a preventative moratorium on data centers, citing concerns over utility rates, water use, and environmental impact.", sources: ["https://wwmt.com/news/local/oshtemo-charter-township-considers-data-center-moratorium-portage-ai-artificial-intelligence-debate-development-battery-energy-bess-west-michigan"], data_source: "news" },
  { jurisdiction: "City of Portage", state: "MI", action_type: "moratorium", date: "2026-02-25", status: "active", company: null, project_name: null, investment_million_usd: null, megawatts: null, opposition_groups: [], summary: "Portage enacted a temporary moratorium on data centers and battery storage facilities through end of year.", sources: ["https://wkzo.com/2026/02/25/894892/"], data_source: "news" },
  { jurisdiction: "Augusta Charter Township", state: "MI", action_type: "petition", date: "2025-08-01", status: "ongoing", company: "Thor Equities", project_name: null, investment_million_usd: 1000, megawatts: null, opposition_groups: ["Protect Augusta Charter Township (PACT)"], summary: "Despite the Planning Commission recommending denial, the Board of Trustees approved rezoning of 522 acres. Residents gathered 957 signatures to force a public referendum.", sources: ["https://planetdetroit.org/2025/08/augusta-data-center-opposition/"], data_source: "dcw" },
  { jurisdiction: "Green Charter Township", state: "MI", action_type: "moratorium", date: "2025-12-09", status: "active", company: null, project_name: null, investment_million_usd: null, megawatts: null, opposition_groups: [], summary: "Green Charter Township adopted a one-year moratorium on all data center development, citing concerns about water/energy consumption and noise.", sources: ["https://datacenterwatch.substack.com/p/briefing-12192025"], data_source: "dcw" },
  { jurisdiction: "City of Saline", state: "MI", action_type: "moratorium", date: "2026-01-12", status: "active", company: null, project_name: null, investment_million_usd: null, megawatts: null, opposition_groups: [], summary: "Saline City Council unanimously adopted a one-year moratorium, prompted by inquiries from Fortune 100 companies. City's zoning code did not yet define data centers.", sources: ["https://datacenterwatch.substack.com/p/briefing-01162026"], data_source: "dcw" },
  { jurisdiction: "Van Buren Township", state: "MI", action_type: "protest", date: "2026-01-01", status: "ongoing", company: "Panattoni", project_name: "Project Cannoli", investment_million_usd: null, megawatts: 1000, opposition_groups: [], summary: "Residents organized against 'Project Cannoli,' a 1 GW data center requiring 2M+ gallons of water daily. 1,400 petition signatures collected. Planning Commission approved 5-2.", sources: ["https://planetdetroit.org/2026/02/project-cannoli-preliminary-site-plan/"], data_source: "dcw" },
  { jurisdiction: "City of Mason", state: "MI", action_type: "petition", date: "2026-02-03", status: "ongoing", company: null, project_name: null, investment_million_usd: null, megawatts: null, opposition_groups: ["Mason Data Center Facts"], summary: "After council adopted data center zoning 5-2, Mason Data Center Facts launched a referendum petition targeting 1,200+ signatures to put it to voters.", sources: ["https://www.wkar.org/wkar-news/2026-02-03/mason-passes-new-rules-for-data-centers-over-public-outcry"], data_source: "dcw" },
  { jurisdiction: "City of Eagan", state: "MN", action_type: "moratorium", date: "2026-02-17", status: "active", company: null, project_name: null, investment_million_usd: null, megawatts: null, opposition_groups: [], summary: "First Minnesota city to enact a data center moratorium. One-year pause on facilities using more than 20 MW or within 500 feet of residential land.", sources: ["https://www.kare11.com/article/news/local/eagan-mn-moratorium-data-center/89-a65e44a4-000c-492b-94c7-7d78ea20cc7c"], data_source: "news" },
  { jurisdiction: "City of Farmington", state: "MN", action_type: "lawsuit", date: "2025-01-14", status: "ongoing", company: "Tract", project_name: "Farmington Technology Park", investment_million_usd: null, megawatts: 708, opposition_groups: ["Castle Rock Township", "Coalition for Responsible Data Center Development"], summary: "Tract received approval for a 708MW data center that would double the city's water consumption. Castle Rock Township sued for breach of the Orderly Annexation Agreement. Residents discovered officials signed NDAs.", sources: ["https://streets.mn/2025/11/07/deep-dive-the-farmington-push-for-responsible-hyper-scale-data-centers/"], data_source: "news" },
  { jurisdiction: "City of Becker", state: "MN", action_type: "cancellation", date: "2025-05-23", status: "resolved", company: "Amazon", project_name: null, investment_million_usd: null, megawatts: null, opposition_groups: [], summary: "Amazon abandoned plans after Minnesota regulators ruled it must get a permit for 250 diesel backup generators. Minnesota also eliminated a sales tax exemption on data center electricity.", sources: ["https://www.mprnews.org/story/2025/05/23/amazon-pulls-back-on-plans-for-large-data-center-in-becker"], data_source: "news" },
  { jurisdiction: "City of North Mankato", state: "MN", action_type: "cancellation", date: "2025-08-01", status: "resolved", company: "Oppidan", project_name: null, investment_million_usd: null, megawatts: null, opposition_groups: ["Minnesota Center for Environmental Advocacy"], summary: "Oppidan halted its project citing lengthy permitting for diesel generators. MCEA sued the city alleging officials hid information and approved faulty environmental review.", sources: ["https://www.mankatofreepress.com/news/local_news/data-center-plans-stalled-in-north-mankato-after-developer-backs-out/"], data_source: "news" },
  { jurisdiction: "Hermantown", state: "MN", action_type: "lawsuit", date: "2025-10-20", status: "ongoing", company: null, project_name: "Project Loon", investment_million_usd: null, megawatts: null, opposition_groups: ["Stop the Hermantown Data Center", "Minnesota Center for Environmental Advocacy"], summary: "City Council voted 4-0 to rezone 200+ acres for 'Project Loon,' but residents filed lawsuits alleging the city kept the public in the dark. A Facebook group gained over 3,500 members.", sources: ["https://stopthehermantowndatacenter.org/"], data_source: "dcw" },
  { jurisdiction: "Pacific", state: "MO", action_type: "cancellation", date: "2026-02-25", status: "resolved", company: "Beltline Energy", project_name: null, investment_million_usd: 16000, megawatts: null, opposition_groups: [], summary: "Beltline Energy withdrew its $16B data center rezoning request minutes into a packed meeting. Missouri Dept. of Conservation flagged the site for endangered species habitat.", sources: ["https://www.firstalert4.com/2026/02/26/pacific-data-center-rezoning-meeting-ends-abruptly-after-developer-withdraws-request/"], data_source: "dcw" },
  { jurisdiction: "New Brunswick", state: "NJ", action_type: "permit_denial", date: "2026-02-19", status: "permanent", company: null, project_name: null, investment_million_usd: null, megawatts: null, opposition_groups: ["Food & Water Watch", "NAACP New Jersey Chapter"], summary: "City Council voted unanimously to block a data center and remove data centers as a permitted use. Hundreds protested near an elementary school. Council restored plans for a public park.", sources: ["https://www.commondreams.org/news/new-brunswick-ai-data-center"], data_source: "dcw" },
  { jurisdiction: "New York State", state: "NY", action_type: "legislative_action", date: "2026-02-06", status: "ongoing", company: null, project_name: "S.9144", investment_million_usd: null, megawatts: null, opposition_groups: ["Food & Water Watch"], summary: "State legislators introduced S.9144, a 3+ year statewide moratorium on permits for data centers using 20 MW or more while DEC completes a comprehensive environmental impact statement.", sources: ["https://www.foodandwaterwatch.org/2026/02/06/ny-legislators-introduce-strongest-data-center-moratorium-bill-in-the-country/"], data_source: "dcw" },
  { jurisdiction: "Gates County", state: "NC", action_type: "moratorium", date: "2025-12-17", status: "active", company: null, project_name: null, investment_million_usd: null, megawatts: null, opposition_groups: [], summary: "First North Carolina county to enact a one-year data center moratorium, halting applications for data centers, cryptocurrency mining, and high-impact data processing through Dec 2026.", sources: ["https://www.roanoke-chowannewsherald.com/news/data-center-moratorium-approved-a302acb2"], data_source: "dcw" },
  { jurisdiction: "Chatham County", state: "NC", action_type: "moratorium", date: "2026-02-13", status: "active", company: null, project_name: null, investment_million_usd: null, megawatts: null, opposition_groups: ["NC Environmental Justice Network"], summary: "Commissioners unanimously approved a 12-month moratorium on data centers, AI computing, and cryptocurrency mining in unincorporated areas through February 2027.", sources: ["https://www.wral.com/news/local/chatham-county-approves-12-month-ban-data-centers-crypto-mining-february-2026/"], data_source: "dcw" },
  { jurisdiction: "Town of Canton", state: "NC", action_type: "moratorium", date: "2026-02-11", status: "active", company: null, project_name: null, investment_million_usd: null, megawatts: null, opposition_groups: [], summary: "Board of Aldermen unanimously passed a 12-month moratorium after ~50 residents spoke out. Prompted by inquiries about using the decommissioned paper mill site for a data center.", sources: ["https://smokymountainnews.com/news/item/40892-a-hard-no-to-high-tech-canton-passes-data-center-moratorium"], data_source: "dcw" },
  { jurisdiction: "City of Kings Mountain", state: "NC", action_type: "moratorium", date: "2026-02-26", status: "active", company: null, project_name: null, investment_million_usd: null, megawatts: null, opposition_groups: [], summary: "City Council approved a six-month moratorium 5-2 to study impacts on water, energy, design standards, setbacks, and noise.", sources: ["https://www.wfae.org/politics/2026-02-26/kings-mountain-approves-six-month-moratorium-on-new-data-centers"], data_source: "news" },
  { jurisdiction: "Wake County", state: "NC", action_type: "protest", date: "2025-08-01", status: "ongoing", company: "Natelli Investments LLC", project_name: "New Hill Digital Campus", investment_million_usd: null, megawatts: 250, opposition_groups: [], summary: "Residents rallied against a 250MW, 6-building data center near Harris Nuclear Plant. 2,000+ petition signatures. Would consume 1M gallons of water/day.", sources: ["https://www.datacenterdynamics.com/en/news/residents-rally-against-250mw-data-center-proposal-in-wake-county-north-carolina/"], data_source: "news" },
  { jurisdiction: "Statesville", state: "NC", action_type: "protest", date: "2025-09-01", status: "resolved", company: "Compass Data Centers", project_name: null, investment_million_usd: 1000, megawatts: null, opposition_groups: [], summary: "Compass proposed a $1B+ campus on 330 acres of farmland. Facebook group with 900+ members organized. Council ultimately approved the project unanimously.", sources: ["https://www.govtech.com/products/despite-protests-north-carolina-city-approves-data-center"], data_source: "dcw" },
  { jurisdiction: "Jerome Township", state: "OH", action_type: "moratorium", date: "2025-09-03", status: "expired", company: "Amazon", project_name: null, investment_million_usd: null, megawatts: null, opposition_groups: [], summary: "Trustees unanimously approved a 9-month moratorium after residents complained about noise from existing Amazon facilities and concerns about water and electricity costs.", sources: ["https://www.wosu.org/politics-government/2025-09-09/jerome-township-puts-pause-on-new-data-center-development-for-nine-months"], data_source: "news" },
  { jurisdiction: "Montour County", state: "PA", action_type: "permit_denial", date: "2026-02-10", status: "ongoing", company: "Talen Energy / Amazon", project_name: null, investment_million_usd: null, megawatts: null, opposition_groups: [], summary: "Commissioners unanimously denied Talen Energy's request to rezone 800+ acres from agricultural to industrial. Would have allowed Amazon data centers co-located with Talen's gas plant.", sources: ["https://insideclimatenews.org/news/11022026/pennsylvania-talen-energy-data-center-rezoning-denied/"], data_source: "news" },
  { jurisdiction: "Blakely", state: "PA", action_type: "cancellation", date: "2025-09-12", status: "resolved", company: null, project_name: null, investment_million_usd: null, megawatts: 1500, opposition_groups: [], summary: "Developers withdrew their proposal for a 209-acre, 1.5 GW data center campus after the borough denied an additional meeting and residents collected ~800 petition signatures.", sources: ["https://fox56.com/news/local/blakely-borough-data-center-plans-scrapped-amid-community-pushback-borough-responds"], data_source: "dcw" },
  { jurisdiction: "Plymouth Township", state: "PA", action_type: "cancellation", date: "2025-11-17", status: "resolved", company: null, project_name: null, investment_million_usd: null, megawatts: null, opposition_groups: ["No Conshy Data Centers", "Delaware Riverkeeper Network"], summary: "Organized opposition forced withdrawal of a 2M sq ft AI data center at a retired steel mill after residents identified a legal flaw in the developer's agreement. 1,000+ petition signatures.", sources: ["https://whyy.org/articles/conshohocken-pennsylvania-residents-pushback-data-center-proposal/"], data_source: "dcw" },
  { jurisdiction: "Archbald", state: "PA", action_type: "protest", date: "2025-11-01", status: "ongoing", company: null, project_name: null, investment_million_usd: null, megawatts: null, opposition_groups: [], summary: "Residents packed council meetings to protest a zoning overlay allowing data centers. Council approved the amendment; residents appealed the decision.", sources: ["https://www.wvia.org/news/local/2025-11-25/crammed-angered-archbald-residents-express-disapproval-as-council-approves-controversial-data-center-zoning-amendment"], data_source: "dcw" },
  { jurisdiction: "Colleton County", state: "SC", action_type: "protest", date: "2025-12-18", status: "ongoing", company: "Eagle Rock Partners", project_name: null, investment_million_usd: 6000, megawatts: 1000, opposition_groups: [], summary: "Hundreds packed a Walterboro auditorium to oppose an 859-acre, 1-GW data center near the ACE Basin ecosystem. Seven state legislators formally opposed it. Landowners filed a lawsuit.", sources: ["https://scdailygazette.com/2025/12/19/gigawatt-data-center-proposal-draws-opposition-from-sc-lowcountry-residents-politicians/"], data_source: "news" },
  { jurisdiction: "Spartanburg County", state: "SC", action_type: "cancellation", date: "2026-02-27", status: "resolved", company: "TigerDC", project_name: "Project Spero", investment_million_usd: 3000, megawatts: null, opposition_groups: [], summary: "TigerDC withdrew its $3B Project Spero after the County Council voted to deny tax incentives. Hundreds packed council chambers. 1,200+ petition signatures against.", sources: ["https://www.foxcarolina.com/2026/02/27/company-withdraws-ai-data-center-spartanburg-county-consideration/"], data_source: "news" },
  { jurisdiction: "Marion County", state: "SC", action_type: "protest", date: "2025-01-22", status: "ongoing", company: null, project_name: "Project Liberty", investment_million_usd: 2400, megawatts: null, opposition_groups: [], summary: "County officials approved a $2.4B data center during a winter storm while most residents were unaware. Council members had signed NDAs. Residents subsequently demanded answers.", sources: ["https://capitalbnews.org/secret-data-center-deal-marion-county-south-carolina/"], data_source: "news" },
  { jurisdiction: "San Marcos", state: "TX", action_type: "permit_denial", date: "2026-02-17", status: "permanent", company: "Highlander SM One LLC", project_name: null, investment_million_usd: 1500, megawatts: 380, opposition_groups: [], summary: "City Council voted 5-2 to deny a $1.5B, 380MW data center after 8+ hours of testimony with 100+ residents speaking. Came amid historic aquifer drops and Stage 4 drought restrictions.", sources: ["https://www.kut.org/energy-environment/2026-02-18/san-marcos-city-council-blocks-proposed-data-center"], data_source: "dcw" },
  { jurisdiction: "Taylor", state: "TX", action_type: "lawsuit", date: "2025-09-26", status: "resolved", company: "Blueprint Data Centers", project_name: null, investment_million_usd: null, megawatts: null, opposition_groups: [], summary: "Five residents sued over a data center on land deeded for parkland. Court temporarily blocked it but dismissed the lawsuit, ruling residents lacked standing.", sources: ["https://datacenterwatch.substack.com/p/briefing-10032025"], data_source: "dcw" },
  { jurisdiction: "Prince William County", state: "VA", action_type: "lawsuit", date: "2024-01-12", status: "ongoing", company: "QTS Realty Trust / Compass", project_name: "PW Digital Gateway", investment_million_usd: 24700, megawatts: null, opposition_groups: ["Coalition to Protect Prince William County", "American Battlefield Trust"], summary: "A judge voided the $24.7B rezoning of 2,100+ acres for data centers near Manassas Battlefield. Virginia Court of Appeals barred construction pending appeal.", sources: ["https://www.princewilliamtimes.com/news/breaking-judge-overturns-prince-william-digital-gateway/"], data_source: "dcw" },
  { jurisdiction: "Culpeper County", state: "VA", action_type: "lawsuit", date: "2024-04-01", status: "ongoing", company: "Amazon (via Marvell Developments)", project_name: null, investment_million_usd: null, megawatts: null, opposition_groups: ["Coalition to Save Culpeper", "Save Brandy Station", "Piedmont Environmental Council"], summary: "Board of Supervisors approved Amazon's rezoning 4-3 despite Planning Commission voting 5-4 against. Residents sued alleging illegal spot-zoning. Brandy Station $12B proposal also denied.", sources: ["https://www.saveculpeper.com/"], data_source: "news" },
  { jurisdiction: "Tucker County", state: "WV", action_type: "protest", date: "2025-03-01", status: "ongoing", company: "Fundamental Data", project_name: null, investment_million_usd: null, megawatts: null, opposition_groups: ["Tucker United"], summary: "Tucker United mobilized hundreds against a natural gas power plant and data center campus that could span 10,000 acres between Thomas and Davis. 2,000+ petition signatures.", sources: ["https://westvirginiawatch.com/2025/05/28/it-will-destroy-this-place-tucker-county-residents-fight-for-future-against-proposed-data-center/"], data_source: "news" },
  { jurisdiction: "Village of DeForest", state: "WI", action_type: "permit_denial", date: "2026-02-03", status: "resolved", company: "QTS", project_name: null, investment_million_usd: 12000, megawatts: null, opposition_groups: ["No Data Center in DeForest"], summary: "Village board voted unanimously against annexation for QTS's proposed $12B, 650-acre data center. 'No Data Center in DeForest' gained 4,000+ followers in a village of 10,000.", sources: ["https://isthmus.com/news/news/deforest-announces-no-data-center/"], data_source: "news" },
  { jurisdiction: "Village of Caledonia", state: "WI", action_type: "cancellation", date: "2025-10-09", status: "resolved", company: "Microsoft", project_name: "Project Nova", investment_million_usd: null, megawatts: null, opposition_groups: [], summary: "Microsoft canceled plans for a 244-acre data center citing 'community feedback' after 40 people spoke against it and a 2,000-name petition was filed.", sources: ["https://urbanmilwaukee.com/2025/10/09/citing-opposition-microsoft-cancels-caledonia-data-center/"], data_source: "dcw" },
  { jurisdiction: "Village of Yorkville", state: "WI", action_type: "cancellation", date: "2025-10-01", status: "resolved", company: null, project_name: "Project Cardinal", investment_million_usd: null, megawatts: null, opposition_groups: [], summary: "Yorkville tabled the vote on a 1,000-acre Project Cardinal after over an hour of public opposition. Project effectively defeated at the most preliminary stage.", sources: ["https://www.wspynews.com/news/local/yorkville-tables-vote-on-project-cardinal-data-center-after-public-opposition/"], data_source: "news" },
  { jurisdiction: "Village of Greenleaf", state: "WI", action_type: "cancellation", date: "2026-01-13", status: "resolved", company: "Cloverleaf Infrastructure", project_name: null, investment_million_usd: null, megawatts: null, opposition_groups: [], summary: "Cloverleaf Infrastructure abandoned plans in the rural Brown County village after community resistance including petitions and appeals to officials.", sources: ["https://www.wearegreenbay.com/news/local-news/because-of-community-opposition-village-of-greenleaf-no-longer-considered-for-data-center-project/"], data_source: "news" },
  { jurisdiction: "Town of Carlton", state: "WI", action_type: "cancellation", date: "2025-12-01", status: "resolved", company: "Cloverleaf Infrastructure", project_name: null, investment_million_usd: null, megawatts: null, opposition_groups: [], summary: "Cloverleaf scrapped plans in this Kewaunee County farming community near Lake Michigan. Developer was subsequently also rejected in Greenleaf.", sources: ["https://pbswisconsin.org/news-item/kewaunee-county-town-staves-off-plan-for-a-land-purchase-by-a-data-center-developer/"], data_source: "news" },
  { jurisdiction: "City of Madison", state: "WI", action_type: "moratorium", date: "2026-01-13", status: "active", company: null, project_name: null, investment_million_usd: null, megawatts: null, opposition_groups: [], summary: "City council passed a one-year moratorium on data centers over 10,000 sq ft. Mayor Rhodes-Conway and 10 alders led the effort. One of the nation's largest cities to enact such a ban.", sources: ["https://spectrumnews1.com/wi/milwaukee/news/2026/02/01/madison-passes-temporary-data-center-moratorium"], data_source: "dcw" },
  { jurisdiction: "Fredonia/Saukville", state: "WI", action_type: "protest", date: "2025-10-10", status: "ongoing", company: "Vantage Data Centers", project_name: null, investment_million_usd: null, megawatts: null, opposition_groups: ["Responsible Energy Alliance", "Protect Fredonia Coalition"], summary: "Residents formed a joint coalition to oppose new power-line routes serving a planned Vantage Data Center in Port Washington. Pressing the Wisconsin PSC for alternative routes.", sources: ["https://spectrumnews1.com/wi/milwaukee/news/2025/10/10/ozaukee-county-port-washington-data-center-fredonia"], data_source: "dcw" },
  { jurisdiction: "Wyandotte County", state: "KS", action_type: "lawsuit", date: "2025-10-29", status: "ongoing", company: "Red Wolf DCD Properties", project_name: null, investment_million_usd: 12000, megawatts: null, opposition_groups: ["We the People of Wyco", "Kansas Sierra Club"], summary: "A $12B data center campus on 400 acres is on hold after a protest petition and lawsuit challenged the rezoning. Residents allege rushed review and manipulation of petition signatures.", sources: ["https://kansasreflector.com/2025/11/07/lawsuit-delays-12b-data-center-in-kansas-city-as-community-environmental-group-voice-concerns/"], data_source: "dcw" },
  { jurisdiction: "Bessemer", state: "AL", action_type: "protest", date: "2025-08-01", status: "ongoing", company: "Logistics Land Investment", project_name: "Project Marvel", investment_million_usd: 14000, megawatts: null, opposition_groups: ["Alabama Rivers Alliance", "NAACP", "Great Rivers Habitat Alliance"], summary: "Bessemer delayed rezoning for Project Marvel, a $14B, 700-acre campus, amid opposition from residents and environmental groups citing environmental justice. 7,000+ petition signatures.", sources: ["https://insideclimatenews.org/news/25092025/naacp-opposes-massive-alabama-data-center/"], data_source: "dcw" },
  { jurisdiction: "New Orleans", state: "LA", action_type: "moratorium", date: "2026-01-28", status: "active", company: "MS Solar Grid Data", project_name: null, investment_million_usd: null, megawatts: null, opposition_groups: ["Deep South Center for Environmental Justice"], summary: "City Council voted unanimously (6-0) to enact a one-year moratorium on data centers, crypto mining, and server farms while working on zoning definitions.", sources: ["https://www.wwno.org/economy/2026-01-29/new-orleans-city-council-bans-data-center-development-for-a-year-heres-why"], data_source: "dcw" },
  { jurisdiction: "Fayetteville", state: "GA", action_type: "zoning_restriction", date: "2026-01-28", status: "ongoing", company: "Corvus Investment Group", project_name: null, investment_million_usd: null, megawatts: null, opposition_groups: [], summary: "Planning & Zoning Commission denied Corvus Investment Group's request to rezone 240+ acres to Business Park (which allows data centers) and recommended Light Industrial zoning instead.", sources: ["https://thecitizen.com/2026/01/28/fayetteville-planning-commission-denies-data-center/"], data_source: "dcw" },
  { jurisdiction: "Sangamon County", state: "IL", action_type: "protest", date: "2026-02-01", status: "ongoing", company: "CyrusOne", project_name: null, investment_million_usd: 500, megawatts: null, opposition_groups: [], summary: "Zoning committee voted 5-3 against a proposed six-month moratorium, then the ZBA recommended CyrusOne receive approval for a $500M data center on 280 acres of farmland. Final decision pending.", sources: ["https://www.wcia.com/news/sangamon-county/sangamon-county-will-not-adopt-6-month-moratorium-on-data-centers/"], data_source: "dcw" },
  { jurisdiction: "Jones County", state: "GA", action_type: "moratorium", date: "2025-10-01", status: "active", company: "EagleRock Partners", project_name: "Crooked Creek Technology Park", investment_million_usd: 5000, megawatts: null, opposition_groups: ["No Data Centers in Jones County"], summary: "EagleRock Partners withdrew rezoning for 600+ acres after organized opposition under 'No Data Centers in Jones County.' Commissioners voted 4-1 for a 90-day moratorium.", sources: ["https://www.13wmaz.com/article/news/local/jones-county-leaders-put-90-day-moratorium-on-data-centers/93-29002835-454e-4208-be1e-5a7f355edf0e"], data_source: "dcw" },
  { jurisdiction: "Frederick County", state: "MD", action_type: "zoning_restriction", date: "2025-12-24", status: "permanent", company: null, project_name: "Critical Digital Infrastructure Overlay Zone", investment_million_usd: null, megawatts: null, opposition_groups: [], summary: "Frederick County Council passed a 2,615-acre overlay map constraining data center development to a single zone covering less than 1% of the county's landmass.", sources: ["https://www.wypr.org/wypr-news/2025-12-24/frederick-county-council-passes-map-for-data-center-development"], data_source: "dcw" },
  { jurisdiction: "Michigan (statewide)", state: "MI", action_type: "legislative_action", date: "2026-02-26", status: "ongoing", company: null, project_name: "HB 5994-5996", investment_million_usd: null, megawatts: null, opposition_groups: [], summary: "Bipartisan legislators introduced a three-bill package to halt all state and local data center permits until April 2027. At least 27 Michigan communities already have local moratoria.", sources: ["https://www.wkar.org/wkar-news/2026-02-26/michigan-house-reps-call-for-moratorium-on-data-centers"], data_source: "dcw" },
];

// Load additional entries from JSON files
const ADDITIONS_FILES = ['additions-round2.json', 'additions-round3.json', 'additions-south.json', 'additions-round4.json', 'petition-discoveries.json', 'additions-round5.json', 'additions-round6.json', 'additions-round7.json'];
let additions = [];
for (const file of ADDITIONS_FILES) {
  const filePath = path.join(DATA_DIR, file);
  if (fs.existsSync(filePath)) {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    console.log(`Loaded ${data.length} entries from ${file}`);
    additions = additions.concat(data);
  }
}

// Load enrichments (concerns, opposition web presence, etc.)
const enrichmentsPath = path.join(DATA_DIR, 'enrichments.json');
let enrichmentMap = {};
if (fs.existsSync(enrichmentsPath)) {
  const enrichData = JSON.parse(fs.readFileSync(enrichmentsPath, 'utf-8'));
  const enrichments = enrichData.enrichments || [];
  for (const e of enrichments) {
    const key = `${e.jurisdiction}|${e.state}`;
    if (enrichmentMap[key]) {
      // Merge: later entries override earlier ones, but preserve existing non-null values
      enrichmentMap[key] = { ...enrichmentMap[key], ...Object.fromEntries(Object.entries(e).filter(([,v]) => v != null)) };
    } else {
      enrichmentMap[key] = e;
    }
  }
  console.log(`Loaded ${enrichments.length} enrichments`);
}

// Normalize free-text concerns to coded enums
const CONCERN_NORMALIZE = {
  'water': ['water', 'aquifer', 'gallons', 'groundwater', 'drinking water', 'well', 'lake michigan', 'water basin', 'water supply', 'water strain', 'water consumption', 'water usage', 'water table'],
  'noise': ['noise', 'sound pollution'],
  'electricity_rates': ['electricity', 'utility rate', 'utility cost', 'utility price', 'utility bill', 'energy cost', 'rate increase', 'energy consumption', 'electricity cost', 'electricity supply', 'power usage'],
  'air_quality': ['air quality', 'air pollution', 'gas turbine', 'diesel', 'no2', 'pm2.5', 'natural gas pollution', 'coal-powered'],
  'property_values': ['property value'],
  'traffic': ['traffic', 'truck traffic', 'congested road'],
  'agricultural_land': ['agricultural', 'farmland', 'acres of farmland'],
  'environment': ['environment', 'ecosystem', 'wetland', 'contamination', 'chemical', 'soil'],
  'grid_reliability': ['grid', 'power grid', 'energy grid', 'dte'],
  'health': ['health', 'electromagnetic'],
  'community_character': ['community character', 'rural character', 'town character', 'community impact', 'disruption'],
  'process_fairness': ['transparency', 'nda', 'democratic process', 'community input', 'consent judgment', 'public transparency', 'approval without', 'not consulted', 'procedural', 'sunshine law'],
  'light_pollution': ['light pollution', 'bright lights'],
  'tax_fairness': ['tax', 'financial impact', 'subsidies', 'abatement', 'only benefits'],
  'wildlife': ['wildlife', 'cedar bog', 'nature preserve', 'biological preserve', 'game lands'],
  'jobs_quality': ['job', 'permanent employment', 'misleading job', 'few permanent', 'minimal permanent'],
};

function normalizeConcerns(concerns) {
  if (!concerns || !concerns.length) return [];
  const result = new Set();
  for (const c of concerns) {
    const lower = c.toLowerCase();
    // Check if it's already a coded enum
    if (CONCERN_NORMALIZE[lower]) { result.add(lower); continue; }
    // Try to match against keywords
    let matched = false;
    for (const [code, keywords] of Object.entries(CONCERN_NORMALIZE)) {
      if (keywords.some(kw => lower.includes(kw))) {
        result.add(code);
        matched = true;
      }
    }
    // If no match, skip it (don't add free text to output)
  }
  return [...result];
}

// Normalize non-standard action types
const ACTION_TYPE_NORMALIZE = {
  'moratorium_proposed': 'moratorium',
  'moratorium_passed': 'moratorium',
  'referendum_effort': 'petition',
  'project_denied': 'permit_denial',
};

// Load hyperscaler mappings
const hyperscalerPath = path.join(DATA_DIR, 'hyperscaler-mappings.json');
let hyperscalerMap = {};
if (fs.existsSync(hyperscalerPath)) {
  const hsData = JSON.parse(fs.readFileSync(hyperscalerPath, 'utf-8'));
  for (const h of hsData) {
    const key = `${h.jurisdiction}|${h.state}`;
    hyperscalerMap[key] = h.hyperscaler;
  }
  console.log(`Loaded ${hsData.length} hyperscaler mappings`);
}

// Build final dataset — merge hardcoded + additions files
const allEntries = [...ALL_FIGHTS, ...additions];

// Deduplicate by jurisdiction+state (first occurrence wins, which is the more
// researched source since hardcoded entries come first, then additions in order)
const seen = new Set();
const deduped = [];
for (const f of allEntries) {
  const key = `${f.jurisdiction}|${f.state}`;
  if (seen.has(key)) continue;
  seen.add(key);
  deduped.push(f);
}

const fights = deduped.map(f => {
  // Use pre-set lat/lng if available, otherwise look up from GEO table
  let lat = f.lat, lng = f.lng;
  if (!lat || !lng) {
    const geoKey = `${f.jurisdiction}, ${f.state}`;
    const geo = GEO[geoKey] || [0, 0];
    lat = geo[0];
    lng = geo[1];
  }
  const dateStr = f.date;
  const id = slugify(`${f.jurisdiction}-${f.state}-${dateStr}`);

  // Apply enrichments
  const enrichKey = `${f.jurisdiction}|${f.state}`;
  const enrich = enrichmentMap[enrichKey] || {};

  return {
    id,
    jurisdiction: f.jurisdiction,
    state: f.state,
    county: f.county || null,
    lat,
    lng,
    action_type: ACTION_TYPE_NORMALIZE[f.action_type] || f.action_type,
    date: dateStr,
    status: f.status,
    company: f.company || null,
    hyperscaler: hyperscalerMap[`${f.jurisdiction}|${f.state}`] || f.hyperscaler || null,
    project_name: f.project_name || null,
    investment_million_usd: f.investment_million_usd || null,
    megawatts: f.megawatts || null,
    acreage: f.acreage || null,
    building_sq_ft: f.building_sq_ft || null,
    water_usage_gallons_per_day: f.water_usage_gallons_per_day || null,
    jobs_promised: f.jobs_promised || null,
    opposition_groups: f.opposition_groups || [],
    opposition_website: f.opposition_website || enrich.opposition_website || null,
    opposition_facebook: f.opposition_facebook || enrich.opposition_facebook || null,
    opposition_instagram: f.opposition_instagram || enrich.opposition_instagram || null,
    opposition_twitter: f.opposition_twitter || enrich.opposition_twitter || null,
    petition_url: f.petition_url || enrich.petition_url || null,
    petition_signatures: f.petition_signatures || enrich.petition_signatures || null,
    concerns: normalizeConcerns((f.concerns && f.concerns.length) ? f.concerns : (enrich.concerns || [])),
    summary: f.summary,
    sources: f.sources || [],
    data_source: f.data_source || 'manual',
    last_updated: TODAY,
  };
}).sort((a, b) => a.date.localeCompare(b.date));

// Write output
const outPath = path.join(DATA_DIR, 'fights.json');
fs.writeFileSync(outPath, JSON.stringify(fights, null, 2));
console.log(`\nWrote ${fights.length} total entries to data/fights.json`);

// Stats
const states = new Set(fights.map(f => f.state));
const types = {};
fights.forEach(f => { types[f.action_type] = (types[f.action_type] || 0) + 1; });
console.log(`States: ${states.size}`);
console.log('By type:', types);
const withCompany = fights.filter(f => f.company).length;
console.log(`Entries with company identified: ${withCompany}`);
const totalInvestment = fights.filter(f => f.investment_million_usd).reduce((s,f) => s + f.investment_million_usd, 0);
console.log(`Total investment affected: $${(totalInvestment/1000).toFixed(1)}B`);
if (additions.length) {
  console.log(`\nMerged ${additions.length} entries from additional files (${deduped.length - ALL_FIGHTS.length} net new after dedup)`);
}
