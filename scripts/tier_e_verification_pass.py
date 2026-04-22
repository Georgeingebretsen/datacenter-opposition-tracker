#!/usr/bin/env python3
"""
Apply Tier E verification pass corrections to fights.json.

Input: verification reports across 4 groups (~100 entries). Many entries need
date corrections, attribution fixes, or structured flags.

For every entry touched, set last_updated='2026-04-21'.
Structured flags have schema: {type, note, added}. Flag types enum:
  url_unverifiable, source_conflict, attribution_uncertain, figure_unverified,
  jurisdiction_ambiguous, status_uncertain, needs_update, other

Prints summary at end: updated / added-flags / merges.
"""

import json
import re
from pathlib import Path

FIGHTS_FILE = Path(__file__).parent.parent / 'site' / 'data' / 'fights.json'
TODAY = '2026-04-21'

stats = {
    'updated': 0,         # entries where any field other than flags changed
    'flags_added': 0,     # new flag objects appended
    'merges': 0,          # entries where flag append merged w/ existing flags array
    'missing_ids': [],    # ids we expected to find but didn't
}

def _touch(entry):
    entry['last_updated'] = TODAY

def add_flag(entry, flag_type, note):
    """Append a structured flag; dedupe by (type, note); count merges."""
    existing = entry.get('flags') or []
    key = (flag_type, note)
    if any((f.get('type'), f.get('note')) == key for f in existing):
        return
    if existing:
        stats['merges'] += 1
    existing.append({'type': flag_type, 'note': note, 'added': TODAY})
    entry['flags'] = existing
    stats['flags_added'] += 1

def get_entry(data_by_id, fight_id):
    e = data_by_id.get(fight_id)
    if e is None:
        stats['missing_ids'].append(fight_id)
    return e

def mark_updated(entry):
    _touch(entry)
    stats['updated'] += 1

def add_sponsor(entry, sponsor_name):
    """Append a sponsor to the sponsors array if not already present."""
    sponsors = entry.get('sponsors') or []
    if sponsor_name not in sponsors:
        sponsors.append(sponsor_name)
        entry['sponsors'] = sponsors
        return True
    return False

def apply_group1(data_by_id):
    # spartanburg: TigerDC, $3.14B, 50 jobs
    e = get_entry(data_by_id, 'spartanburg-sc-northmark-2025')
    if e:
        e['company'] = 'TigerDC (HG Tiger DC I LLC)'
        e['investment_million_usd'] = 3140
        e['jobs_promised'] = 50
        e['summary'] = re.sub(r'NorthMark Strategies', 'TigerDC (HG Tiger DC I LLC)', e.get('summary', ''))
        mark_updated(e)

    # harwood-nd: Clay County -> Cass County
    e = get_entry(data_by_id, 'harwood-nd-2025-08-25')
    if e:
        e['county'] = 'Cass County'
        mark_updated(e)

    # troup-county-ga: investment 9700 -> null
    e = get_entry(data_by_id, 'troup-county-ga-2025-09-01')
    if e:
        e['investment_million_usd'] = None
        mark_updated(e)

    # archbald: project_name Steel -> Scott; add 5-0 vote to summary
    e = get_entry(data_by_id, 'archbald-provident-denial-pa-2026-03-27')
    if e:
        e['project_name'] = 'Project Scott'
        s = e.get('summary', '')
        if 'Project Steel' in s:
            s = s.replace('Project Steel', 'Project Scott')
        if '5-0' not in s and '5–0' not in s:
            s = s.rstrip()
            if not s.endswith('.'):
                s += '.'
            s += ' Council denied the application on a 5-0 vote.'
        e['summary'] = s
        mark_updated(e)

    # st-louis: status -> approved; community_outcome -> loss; note final BPS approval April 21, 2026
    e = get_entry(data_by_id, 'st-louis-mo-2025-09-01')
    if e:
        e['status'] = 'approved'
        e['community_outcome'] = 'loss'
        s = e.get('summary', '').rstrip()
        if 'April 21, 2026' not in s and 'BPS approval' not in s:
            if not s.endswith('.'):
                s += '.'
            s += ' Board of Public Service (BPS) gave final approval on April 21, 2026.'
        e['summary'] = s
        mark_updated(e)

    # virginia HB 897: add Del. Rip Sullivan (D-Fairfax)
    e = get_entry(data_by_id, 'virginia-statewide-hb-897-va-2026-01-01')
    if e:
        target = 'Del. Rip Sullivan (D-Fairfax)'
        sponsors = e.get('sponsors') or []
        # Replace existing generic "Del. Rip Sullivan (D-VA)" with specific district attribution
        sponsors = [target if 'Rip Sullivan' in s else s for s in sponsors]
        if target not in sponsors:
            sponsors.append(target)
        e['sponsors'] = sponsors
        mark_updated(e)

    # nebraska google power plant: add sponsor Sen. Barry DeKay (at Gov. Pillen's request); note about $3.5B historic footprint
    e = get_entry(data_by_id, 'google-nebraska-power-plant-ne-2026')
    if e:
        target = "Sen. Barry DeKay (at Gov. Pillen's request)"
        sponsors = e.get('sponsors') or []
        sponsors = [target if 'Barry DeKay' in s else s for s in sponsors]
        if target not in sponsors:
            sponsors.append(target)
        e['sponsors'] = sponsors
        add_flag(e, 'figure_unverified',
                 'investment_million_usd of 3500 reflects historic Google Nebraska footprint (aggregate), not this specific power-plant project')
        mark_updated(e)

    # hermantown: clarify Google is buyer/end user, Mortenson is construction
    e = get_entry(data_by_id, 'hermantown-mn-2025-10-20')
    if e:
        s = e.get('summary', '').rstrip()
        if 'buyer/end user' not in s and 'end user' not in s:
            if not s.endswith('.'):
                s += '.'
            s += ' (Google is the buyer/end user; Mortenson is the construction contractor.)'
        e['summary'] = s
        mark_updated(e)

    # vineland: note $17.4B is Nebius-Microsoft deal, not data center capex
    e = get_entry(data_by_id, 'vineland-nj-2025-12-23')
    if e:
        add_flag(e, 'figure_unverified',
                 'investment_million_usd of 17400 reflects the total Nebius-Microsoft contract value, not Vineland data center capital expenditure')
        mark_updated(e)

    # edgecombe: $19B is ESS's total NC footprint; Kingsboro ~$6.4B; acreage 300 -> 155
    e = get_entry(data_by_id, 'edgecombe-county-nc-2025-12-01')
    if e:
        e['acreage'] = 155
        add_flag(e, 'figure_unverified',
                 "investment_million_usd of 19000 reflects ESS's total North Carolina footprint; Kingsboro project alone is approximately $6.4B")
        mark_updated(e)

    # temple-tx: add April 2026 4-0 council vote approving 3rd Rowan data center (Project Ranger); acreage 303 for parcel, 700 for Ranger
    e = get_entry(data_by_id, 'temple-tx-2025-10-01')
    if e:
        s = e.get('summary', '').rstrip()
        if 'April 2026' not in s or '4-0' not in s:
            if not s.endswith('.'):
                s += '.'
            s += ' Temple City Council voted 4-0 in April 2026 to approve a third Rowan data center ("Project Ranger").'
        e['summary'] = s
        add_flag(e, 'figure_unverified',
                 'acreage 700 reflects Project Ranger footprint; the specific rezoned parcel is 303 acres')
        mark_updated(e)

    # prince-william: note Court of Appeals ruling March 31 + BoS withdrew appeal April 15
    e = get_entry(data_by_id, 'prince-william-county-va-2024-01-12')
    if e:
        s = e.get('summary', '').rstrip()
        added = False
        if 'Court of Appeals' not in s:
            if not s.endswith('.'):
                s += '.'
            s += ' Virginia Court of Appeals ruled March 31, 2026, upholding the voiding of the rezoning.'
            added = True
        if 'withdrew' not in s.lower() and 'Board of Supervisors withdrew' not in s:
            s += ' The Board of Supervisors withdrew its appeal on April 15, 2026.'
            added = True
        e['summary'] = s
        if added:
            mark_updated(e)
        else:
            mark_updated(e)  # still touch to refresh last_updated per rules

    # weld-county-co: date -> 2026-04-06; fix summary phrasing
    e = get_entry(data_by_id, 'weld-county-co-2026-02-27')
    if e:
        e['date'] = '2026-04-06'
        s = e.get('summary', '')
        s = s.replace('limits data centers to industrial or agricultural zones',
                      'prohibits data centers on agricultural land')
        e['summary'] = s
        mark_updated(e)

def apply_group2(data_by_id):
    # goochland: remove QTS Realty attribution
    e = get_entry(data_by_id, 'goochland-county-va-2025-08-01')
    if e:
        e['company'] = None
        add_flag(e, 'attribution_uncertain',
                 'QTS Realty attribution removed — QTS activity is in Henrico County, not Goochland')
        mark_updated(e)

    # santa-clara: fix vote count (was 3-2 in favor, failed majority); not 4-2 denial
    e = get_entry(data_by_id, 'santa-clara-ca-2024-03-06')
    if e:
        s = e.get('summary', '')
        # Replace original (4-2 vote) with correct framing.
        # Also clean up any prior mangling from earlier runs of this script.
        s = re.sub(r'\(4-2 vote\)',
                   '(3-2 in favor; failed the required 4-vote majority, so the permit was denied)', s)
        # Repair prior mangled text if present
        s = s.replace(
            'denied a 72MW data center permit at 2805 Bowers Ave — 3-2 in favor failed to reach required 4-vote majority ( in favor, but failed the required 4-vote majority so the permit was denied)',
            "denied a 72MW data center permit at 2805 Bowers Ave (3-2 in favor; failed the required 4-vote majority, so the permit was denied)")
        e['summary'] = s
        mark_updated(e)

    # alabama SB-270: House 104-0 -> 100-1; add Senate concurred 33-0 after House amendments
    e = get_entry(data_by_id, 'alabama-statewide-sb-270-al-2026-02-05')
    if e:
        s = e.get('summary', '')
        s = s.replace('104-0', '100-1')
        if '33-0' not in s:
            s = s.rstrip()
            if not s.endswith('.'):
                s += '.'
            s += ' Senate concurred 33-0 after House amendments.'
        e['summary'] = s
        mark_updated(e)

    # dorchester FOIA lawsuit: status active -> passed; community_outcome pending -> win
    e = get_entry(data_by_id, 'dorchester-county-sc-foia-lawsuit-2024-04')
    if e:
        e['status'] = 'passed'
        e['community_outcome'] = 'win'
        mark_updated(e)

    # idaho HB 895: status passed -> pending; community_outcome win -> pending
    e = get_entry(data_by_id, 'idaho-hb-895-water-cooling-2026')
    if e:
        e['status'] = 'pending'
        e['community_outcome'] = 'pending'
        mark_updated(e)

    # oregon HB 4084: add flag status_uncertain; add sponsor Rep. Nancy Nathanson (D-Eugene)
    e = get_entry(data_by_id, 'oregon-hb-4084-tax-break-moratorium-or-2026-03-02')
    if e:
        add_flag(e, 'status_uncertain', 'signing not directly verified in accessible sources')
        add_sponsor(e, 'Rep. Nancy Nathanson (D-Eugene)')
        mark_updated(e)

    # lowell-ma: date -> 2026-03-11
    e = get_entry(data_by_id, 'lowell-ma-moratorium-2026-03')
    if e:
        e['date'] = '2026-03-11'
        mark_updated(e)

    # lansing-deep-green: date -> 2026-04-06; note Deep Green is UK-based
    e = get_entry(data_by_id, 'lansing-deep-green-mi-2026-03-04')
    if e:
        e['date'] = '2026-04-06'
        s = e.get('summary', '')
        if 'UK-based' not in s and 'UK based' not in s:
            s = s.rstrip()
            if not s.endswith('.'):
                s += '.'
            s += ' (Deep Green is UK-based.)'
        e['summary'] = s
        mark_updated(e)

    # gibraltar-mi: date -> 2026-03-09
    e = get_entry(data_by_id, 'gibraltar-mi-moratorium-2026-02')
    if e:
        e['date'] = '2026-03-09'
        mark_updated(e)

    # south-dakota SB 135: signing date March 24 in summary; clarify sponsors
    e = get_entry(data_by_id, 'south-dakota-statewide-sb-135-sd-2026-01-26')
    if e:
        s = e.get('summary', '')
        s = s.replace('March 25, 2026', 'March 24, 2026')
        if 'Karr sponsored SB 135' not in s:
            s = s.rstrip()
            if not s.endswith('.'):
                s += '.'
            s += ' (Sen. Karr sponsored SB 135; Rep. Hansen sponsored HB 1038.)'
        e['summary'] = s
        mark_updated(e)

    # new-castle-county-zoning-de: note 12-0 with one absent (not strictly unanimous)
    e = get_entry(data_by_id, 'new-castle-county-zoning-de-2026')
    if e:
        s = e.get('summary', '')
        if '12-0' not in s:
            s = s.replace('unanimously passed', 'passed 12-0 (with one absent)')
            s = re.sub(r'\s{2,}', ' ', s)
        if 'one absent' not in s:
            s = s.rstrip()
            if not s.endswith('.'):
                s += '.'
            s += ' Vote was 12-0 with one member absent.'
        e['summary'] = s
        mark_updated(e)

    # fauquier-county-va-opposition-2026-02: verified, no changes (do not touch)

    # griffin-spalding: flag attribution_uncertain
    e = get_entry(data_by_id, 'griffin-spalding-county-ga-2025-09-01')
    if e:
        add_flag(e, 'attribution_uncertain',
                 'Hillwood affiliate involvement unverified; direct filer is Spalding Investments LLC')
        mark_updated(e)

    # grant-county-pud: flag figure_unverified (800 MW cap is aggregate, not Microsoft-specific)
    e = get_entry(data_by_id, 'grant-county-pud-wa-2025-03-25')
    if e:
        add_flag(e, 'figure_unverified',
                 '800 MW cap is aggregate Grant County PUD limit, not a Microsoft-specific figure')
        mark_updated(e)

    # gordon-county-ga: note original 60-day moratorium, later extended
    e = get_entry(data_by_id, 'gordon-county-ga-2025-10-01')
    if e:
        s = e.get('summary', '')
        if '60-day' not in s and 'later extended' not in s:
            s = s.rstrip()
            if not s.endswith('.'):
                s += '.'
            s += ' Original action was a 60-day moratorium, later extended.'
        e['summary'] = s
        mark_updated(e)

def apply_group3(data_by_id):
    # frederick-county-va: company -> Tract Capital / Winchester Gateway LLC; date -> 2025-06-25
    e = get_entry(data_by_id, 'frederick-county-va-2025-07-01')
    if e:
        e['company'] = 'Tract Capital / Winchester Gateway LLC'
        e['date'] = '2025-06-25'
        mark_updated(e)

    # forsyth-county-ga: objective update
    e = get_entry(data_by_id, 'forsyth-county-ga-2025-10')
    if e:
        e['objective'] = 'Restrict data center water usage in Forsyth County'
        mark_updated(e)

    # fluvanna-county-va: date -> 2025-11-19; action_type zoning_restriction
    e = get_entry(data_by_id, 'fluvanna-county-va-2025-07-01')
    if e:
        e['date'] = '2025-11-19'
        at = e.get('action_type') or []
        if 'zoning_restriction' not in at:
            at.append('zoning_restriction')
            e['action_type'] = at
        mark_updated(e)

    # fauquier-county-catlett-va: date -> 2024-07-15; investment -> null (already both, but ensure + touch)
    e = get_entry(data_by_id, 'fauquier-county-catlett-va-2025-10-01')
    if e:
        e['date'] = '2024-07-15'
        e['investment_million_usd'] = None
        mark_updated(e)

    # fairfax-county-va: date -> 2024-09-10
    e = get_entry(data_by_id, 'fairfax-county-va-2024-09-01')
    if e:
        e['date'] = '2024-09-10'
        mark_updated(e)

    # el-monte-ca: date -> 2026-03-19
    e = get_entry(data_by_id, 'el-monte-ca-moratorium-2025')
    if e:
        e['date'] = '2026-03-19'
        mark_updated(e)

    # east-windsor-nj: flag url_unverifiable
    e = get_entry(data_by_id, 'east-windsor-nj-2026-02-01')
    if e:
        add_flag(e, 'url_unverifiable', 'could not directly confirm vote date in accessible sources')
        mark_updated(e)

    # detroit-mi-moratorium: date -> 2026-03-10; note 6-2 is resolution asking mayor (not binding)
    e = get_entry(data_by_id, 'detroit-mi-moratorium-2026-03-18')
    if e:
        e['date'] = '2026-03-10'
        s = e.get('summary', '')
        if 'not binding' not in s and 'non-binding' not in s.lower():
            s = s.rstrip()
            if not s.endswith('.'):
                s += '.'
            s += ' (The 6-2 vote is a resolution asking the mayor to impose the pause; it is not itself binding.)'
        e['summary'] = s
        mark_updated(e)

    # culpeper-town-va: date -> 2025-10-28
    e = get_entry(data_by_id, 'culpeper-town-va-2025-05-01')
    if e:
        e['date'] = '2025-10-28'
        mark_updated(e)

    # culpeper-county-va-zoning: date -> 2025-09-02
    e = get_entry(data_by_id, 'culpeper-county-va-zoning-2026-01')
    if e:
        e['date'] = '2025-09-02'
        mark_updated(e)

    # clayton-county-ga: company rewrite
    e = get_entry(data_by_id, 'clayton-county-ga-2025-09-01')
    if e:
        e['company'] = 'TA Realty/EdgeConneX (324 MW Ellenwood) and Digital Realty (Forest Park/former Fort Gillem)'
        mark_updated(e)

    # clarksdale-ms-opposition: date -> 2026-03-24
    e = get_entry(data_by_id, 'clarksdale-ms-opposition-2026-01')
    if e:
        e['date'] = '2026-03-24'
        mark_updated(e)

    # fayetteville-ga-2026-01-28: date -> 2026-01-27; clarify Corvus 240-acre fight vs. separate CHI 37-acre withdrawal
    e = get_entry(data_by_id, 'fayetteville-ga-2026-01-28')
    if e:
        e['date'] = '2026-01-27'
        s = e.get('summary', '')
        if 'CHI 37-acre' not in s and 'separate fight' not in s.lower():
            s = s.rstrip()
            if not s.endswith('.'):
                s += '.'
            s += ' (The CHI 37-acre withdrawal is tracked as a separate fight: fayetteville-ga-withdrawal-2026-03-18.)'
        e['summary'] = s
        mark_updated(e)

    # city-of-south-fulton-ga-2025-09-22: flag figure_unverified (T5 specs)
    e = get_entry(data_by_id, 'city-of-south-fulton-ga-2025-09-22')
    if e:
        add_flag(e, 'figure_unverified',
                 'T5 specs (91 acres / 1.32M sqft / 200 MW) not confirmed in capitalbnews source')
        mark_updated(e)

    # city-of-kings-mountain-nc-2026-02-26: flag figure_unverified; acreage 300 relates to existing T5
    e = get_entry(data_by_id, 'city-of-kings-mountain-nc-2026-02-26')
    if e:
        add_flag(e, 'figure_unverified',
                 'existing T5 specs conflated with new proposal; 300-acre figure relates to existing T5 site')
        mark_updated(e)

    # city-of-industry-ca-zoning-2025: flag attribution_uncertain (EdgeCore involvement unverified)
    e = get_entry(data_by_id, 'city-of-industry-ca-zoning-2025')
    if e:
        add_flag(e, 'attribution_uncertain', 'EdgeCore involvement unverified in accessible sources')
        mark_updated(e)

    # city-of-eagan-mn-2026-02-17: flag figure_unverified (22 acres not in accessible sources)
    e = get_entry(data_by_id, 'city-of-eagan-mn-2026-02-17')
    if e:
        add_flag(e, 'figure_unverified', '22-acre figure not found in accessible sources')
        mark_updated(e)

def apply_group4(data_by_id):
    # bryan-tx-zoning-2026-02: date -> 2025-09-16; acreage 162 -> 160 (already 160; still safe)
    e = get_entry(data_by_id, 'bryan-tx-zoning-2026-02')
    if e:
        e['date'] = '2025-09-16'
        e['acreage'] = 160
        mark_updated(e)

    # anchorage-ak-2026-03-03: date -> 2026-03-27
    e = get_entry(data_by_id, 'anchorage-ak-2026-03-03')
    if e:
        e['date'] = '2026-03-27'
        mark_updated(e)

    # ada-county-id-2025-02-05: date -> 2025-11 (November 2025)
    e = get_entry(data_by_id, 'ada-county-id-2025-02-05')
    if e:
        e['date'] = '2025-11-01'  # month-only resolution; use first-of-month
        mark_updated(e)

    # watts-township-perry-county-pa-2026-01-01: date -> 2026-04-01
    e = get_entry(data_by_id, 'watts-township-perry-county-pa-2026-01-01')
    if e:
        e['date'] = '2026-04-01'
        mark_updated(e)

    # stillwater-county-mt-2026-03-01: company Quantica -> null; flag jurisdiction_ambiguous;
    #   acreage 5000 -> null; energy_mw 1000 -> null; petition_signatures -> 81
    e = get_entry(data_by_id, 'stillwater-county-mt-2026-03-01')
    if e:
        e['company'] = None
        e['acreage'] = None
        # drop energy_mw if present; also clear megawatts if it mirrors 1000
        if 'energy_mw' in e:
            e['energy_mw'] = None
        if e.get('megawatts') == 1000:
            e['megawatts'] = None
        e['petition_signatures'] = 81
        add_flag(e, 'jurisdiction_ambiguous',
                 "Quantica Infrastructure's flagship project is in Yellowstone County, not Stillwater; attribution removed")
        mark_updated(e)

    # sheboygan-county-wi-2025-07-01: company KBC Advisors -> null; flag attribution_uncertain
    e = get_entry(data_by_id, 'sheboygan-county-wi-2025-07-01')
    if e:
        e['company'] = None
        add_flag(e, 'attribution_uncertain',
                 'actual proposal is Amazon logistics, not a data center; no formal data center proposal confirmed')
        mark_updated(e)

    # cincinnati-oh-2026-02-06: flag attribution_uncertain (opposition group Butler County-focused)
    e = get_entry(data_by_id, 'cincinnati-oh-2026-02-06')
    if e:
        add_flag(e, 'attribution_uncertain',
                 'opposition group is Butler County-focused, not Cincinnati-specific')
        mark_updated(e)

    # cassville-wi-village-powers-2026-03: date -> 2026-03-12
    e = get_entry(data_by_id, 'cassville-wi-village-powers-2026-03')
    if e:
        e['date'] = '2026-03-12'
        mark_updated(e)

    # petition_signatures updates
    petition_updates = [
        ('rowan-county-nc-duke-energy-hearing-2026-03-25', 5199),
        ('rowan-county-nc-2026-03-17', 5199),
        ('south-whitehall-township-pa-2026-01-20', 3119),
        # stillwater already handled above to 81
        # Additional petition refreshes resolved to real IDs:
        ('irwin-county-ga-opposition-2026-02', 608),
        ('city-of-pontiac-mi-2026-01-21', 11224),
        ('lacy-lakeview-waco-area-tx-2025-12-03', 3407),
        ('joplin-mo-2025-10-01', 2058),
        ('shreveport-la-2025-10-01', 1340),
        ('palm-beach-county-fl-2025-12-10', 9752),
        ('lowell-township-mi-2025-12-18', 2463),
    ]
    for pid, count in petition_updates:
        e = get_entry(data_by_id, pid)
        if not e:
            continue
        if e.get('petition_signatures') != count:
            e['petition_signatures'] = count
            mark_updated(e)

def main():
    with open(FIGHTS_FILE) as f:
        data = json.load(f)
    data_by_id = {d['id']: d for d in data}

    apply_group1(data_by_id)
    apply_group2(data_by_id)
    apply_group3(data_by_id)
    apply_group4(data_by_id)

    with open(FIGHTS_FILE, 'w') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

    print(f"Tier E verification pass complete:")
    print(f"  Entries updated (field changes):    {stats['updated']}")
    print(f"  Flags appended:                     {stats['flags_added']}")
    print(f"  Flag merges (into existing array):  {stats['merges']}")
    if stats['missing_ids']:
        print(f"\nWARNING: {len(stats['missing_ids'])} expected IDs not found:")
        for mid in stats['missing_ids']:
            print(f"  - {mid}")
    else:
        print(f"\nAll target IDs located.")

if __name__ == '__main__':
    main()
