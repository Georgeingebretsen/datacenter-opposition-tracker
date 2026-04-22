#!/usr/bin/env python3
"""
Tier D verification pass: apply corrections from four verification reports
(~100 entries audited) to site/data/fights.json.

- Targeted updates to specific fields (dates, sponsors, status, outcomes,
  acreage, megawatts, summaries, etc.)
- Merges duplicate entries into their canonical counterparts, unioning
  sources and opposition groups, then deletes the duplicate
- For flagged items with no explicit new value, appends a
  '[FLAGGED in verification: <reason>]' note to the summary (to be
  migrated to a structured flags array by migrate_flags.py afterward)
- Stamps last_updated='2026-04-21' on every touched entry
"""

import json
import re
from pathlib import Path

FIGHTS_FILE = Path(__file__).parent.parent / 'site' / 'data' / 'fights.json'
TODAY = '2026-04-21'


def load_data():
    with open(FIGHTS_FILE) as f:
        return json.load(f)


def save_data(data):
    with open(FIGHTS_FILE, 'w') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)


def by_id(data):
    return {e['id']: e for e in data}


def touch(entry, **updates):
    """Apply updates and stamp last_updated."""
    for k, v in updates.items():
        entry[k] = v
    entry['last_updated'] = TODAY


def append_flag(entry, reason):
    """Add '[FLAGGED in verification: ...]' to summary."""
    summary = entry.get('summary') or ''
    flag_text = f'[FLAGGED in verification: {reason}]'
    if flag_text not in summary:
        entry['summary'] = (summary + ' ' + flag_text).strip()
    entry['last_updated'] = TODAY


def merge_into(src, dst):
    """Merge src entry into dst (union sources, opposition_groups).
    Does NOT overwrite dst scalar fields — dst is canonical."""
    # Union sources
    src_sources = src.get('sources') or []
    dst_sources = dst.get('sources') or []
    merged_sources = list(dst_sources)
    for s in src_sources:
        if s not in merged_sources:
            merged_sources.append(s)
    dst['sources'] = merged_sources

    # Union opposition_groups
    src_og = src.get('opposition_groups') or []
    dst_og = dst.get('opposition_groups') or []
    merged_og = list(dst_og)
    for g in src_og:
        if g not in merged_og:
            merged_og.append(g)
    dst['opposition_groups'] = merged_og

    dst['last_updated'] = TODAY


def main():
    data = load_data()
    idx = by_id(data)

    updated_ids = set()
    merged_ids = []  # list of ids to delete (merged away)

    # ----- GROUP 1 -----

    e = idx['south-dakota-sb-232-sd-2026-02-04']
    touch(e, date='2026-02-18')
    # Merge duplicate into it
    dup = idx['south-dakota-moratorium-bill-sb-232-sd-2026-02-19']
    merge_into(dup, e)
    merged_ids.append('south-dakota-moratorium-bill-sb-232-sd-2026-02-19')
    updated_ids.add(e['id'])

    e = idx['oklahoma-sb-1488-moratorium-ok-2026']
    touch(e, sponsors=['Sen. Kendal Sacchieri (R-OK)'])
    updated_ids.add(e['id'])

    e = idx['montana-sb-212-mt-2025-04-16']
    touch(e, date='2025-04-17')
    updated_ids.add(e['id'])

    e = idx['louisiana-lpsc-lightning-amendment-la-2025-12-19']
    touch(e, date='2025-12-17')
    updated_ids.add(e['id'])

    e = idx['new-jersey-a5462-conditional-veto-nj-2025-10-20']
    e['date'] = '2026-01-21'
    # Clarify pocket veto in summary
    old_summary = e.get('summary') or ''
    # Add clarification
    clarification = (' Clarification: this was a pocket veto (no action taken '
                     'by January 21, 2026 deadline), not a conditional veto. '
                     'The bill was reintroduced as S731/A796.')
    if 'pocket veto' not in old_summary.lower():
        e['summary'] = old_summary.rstrip() + clarification
    e['last_updated'] = TODAY
    updated_ids.add(e['id'])

    e = idx['minnesota-hf-16-mn-2025-06-14']
    old_summary = e.get('summary') or ''
    new_summary = old_summary.replace('25,000+ sq ft', '100 MW with $250M investment')
    new_summary = new_summary.replace('25,000 sq ft', '100 MW with $250M investment')
    if new_summary == old_summary:
        # Pattern not matched verbatim; append correction
        new_summary = old_summary.rstrip() + ' Correction: applicability threshold is 100 MW with $250M investment (not a square-footage trigger).'
    e['summary'] = new_summary
    e['last_updated'] = TODAY
    updated_ids.add(e['id'])

    e = idx['maryland-veto-override-md-2025-12-16']
    old_summary = e.get('summary') or ''
    new_summary = old_summary.replace('September 2025', 'September 2026')
    e['summary'] = new_summary
    e['last_updated'] = TODAY
    updated_ids.add(e['id'])

    e = idx['north-dakota-hb-1579-nd-2025-01-01']
    touch(e,
          sponsors=[
              'Rep. Anna Novak (R-ND)',
              'Rep. SuAnn Olson Heinert (R-ND)',
              'Rep. Todd Porter (R-ND)',
              'Sen. Jeff Kessel (R-ND)',
              'Sen. Dale Patten (R-ND)',
          ])
    # Add signed date note if not already present
    old_summary = e.get('summary') or ''
    if 'April 29' not in old_summary:
        e['summary'] = old_summary.rstrip() + ' Signed into law on April 29, 2025.'
    updated_ids.add(e['id'])

    e = idx['prince-william-hornbaker-va-2026-03']
    append_flag(e, 'MobileSentrix is a chip manufacturer, not a traditional data center — categorization may be inappropriate')
    updated_ids.add(e['id'])

    # ----- GROUP 2 -----

    e = idx['florida-sb-1118-fl-2026']
    touch(e, status='defeated', community_outcome='win')
    old_summary = e.get('summary') or ''
    # Try to correct "enacted" phrasing
    new_summary = re.sub(r'\b(was )?enacted\b', 'died in committee', old_summary, count=1, flags=re.IGNORECASE)
    if new_summary == old_summary and 'died' not in old_summary.lower():
        new_summary = old_summary.rstrip() + ' Correction: SB 1118 died in committee; it was not enacted.'
    e['summary'] = new_summary
    e['last_updated'] = TODAY
    updated_ids.add(e['id'])

    e = idx['alabama-huntsville-meta-noise-al-2026']
    unverified_note = (
        "[UNVERIFIED — entry contained fabricated content; mayor name 'Tommy Dispute' "
        "does not exist (actual Huntsville mayor is Tommy Battle); cited APR source is "
        "about Columbiana/Bessemer not Huntsville; Meta's 2nd Alabama DC is in "
        "Montgomery County, not Huntsville. West Ridge Drive noise concerns from "
        "resident Harold Greenleaf are real but broader entry needs full re-sourcing.]"
    )
    touch(e, summary=unverified_note)
    updated_ids.add(e['id'])

    # Merge washington-township-franklin-county-oh-2026-02-01 into washington-township-oh-2025-12-08
    dup = idx['washington-township-franklin-county-oh-2026-02-01']
    canon = idx['washington-township-oh-2025-12-08']
    merge_into(dup, canon)
    merged_ids.append('washington-township-franklin-county-oh-2026-02-01')
    updated_ids.add(canon['id'])

    e = idx['commercial-point-scioto-township-pickaway-county-oh-2025-06-01']
    e['date'] = '2026-03-01'
    # Remove petition_url and petition_signatures that belong to Muhlenberg Township
    if 'petition_url' in e:
        e['petition_url'] = None
    if 'petition_signatures' in e:
        e['petition_signatures'] = None
    # Finish truncated objective
    obj = e.get('objective') or ''
    if obj and not obj.rstrip().endswith(('.', ')')) and len(obj) > 0:
        # Finish it out
        e['objective'] = obj.rstrip() + ' (moratorium on data center development).'
    e['last_updated'] = TODAY
    updated_ids.add(e['id'])

    e = idx['bastrop-county-tx-2026-01-01']
    old_summary = e.get('summary') or ''
    # Remove Rackspace claim
    new_summary = re.sub(r'[^.]*Rackspace[^.]*\.', '', old_summary).strip()
    new_summary = re.sub(r'\s+', ' ', new_summary)
    e['summary'] = new_summary + ' Correction: Rackspace attribution removed as unsupported; acreage figure was conflated and is set to null.'
    e['acreage'] = None
    e['last_updated'] = TODAY
    updated_ids.add(e['id'])

    e = idx['cassville-wi-2026-02-09']
    touch(e, opposition_facebook_members=2700)
    updated_ids.add(e['id'])

    e = idx['butts-county-ga-2025']
    e['company'] = None
    old_summary = e.get('summary') or ''
    note = ' Correction: River Park is the project name, not the company — actual developer is undisclosed. Project is backed by Lt. Gov. Burt Jones.'
    if 'Burt Jones' not in old_summary:
        e['summary'] = old_summary.rstrip() + note
    e['last_updated'] = TODAY
    updated_ids.add(e['id'])

    e = idx['village-of-greenleaf-wi-2026-01-13']
    touch(e, action_type='project_withdrawal', authority_level='village_board', acreage=600)
    updated_ids.add(e['id'])

    e = idx['town-of-warrenton-va-2025-07-01']
    e['date'] = '2025-07-08'
    old_summary = e.get('summary') or ''
    new_summary = old_summary.replace('6-0', '5-0')
    new_summary = new_summary.replace('February 2023', 'February 2022')
    new_summary = new_summary.replace('Feb 2023', 'Feb 2022')
    new_summary = new_summary.replace('Feb. 2023', 'Feb. 2022')
    e['summary'] = new_summary
    e['last_updated'] = TODAY
    updated_ids.add(e['id'])

    e = idx['warrenton-mo-2026']
    touch(e, acreage=340)
    updated_ids.add(e['id'])

    e = idx['florida-hb-1007-fl-2026-02-25']
    new_summary = (
        'Florida HB 1007 (2026) regulates data center siting and operations by: '
        '(1) limiting the use of non-disclosure agreements in local permitting; '
        '(2) directing the Public Service Commission to set cost-allocation tariffs '
        'so data center loads do not shift costs onto residential ratepayers; '
        'and (3) requiring state water-use permits for large data center withdrawals. '
        'The bill does not ban data centers from agricultural zoning or impose '
        '500-foot setbacks.'
    )
    touch(e, summary=new_summary)
    updated_ids.add(e['id'])

    e = idx['federal-ceq-nepa-repeal-data-center-permitting-2026-01-08']
    touch(e, action_type='regulatory_action')
    updated_ids.add(e['id'])

    e = idx['columbia-mo-2025-10-01']
    touch(e, date='2025-11-19')
    updated_ids.add(e['id'])

    e = idx['forest-grove-or-2024-10-01']
    old_summary = e.get('summary') or ''
    if '5-0' not in old_summary:
        e['summary'] = old_summary.rstrip() + ' The council vote was 5-0 (Councilor Uhing absent).'
    e['last_updated'] = TODAY
    updated_ids.add(e['id'])

    # town-of-carlton-wi-2025-12-01: verified, no change (not counted)

    # ----- GROUP 3 -----

    # Merge scioto-township-oh-moratorium-2026-02 into scioto-township-pickaway-oh-2026-03-06
    dup = idx['scioto-township-oh-moratorium-2026-02']
    canon = idx['scioto-township-pickaway-oh-2026-03-06']
    merge_into(dup, canon)
    merged_ids.append('scioto-township-oh-moratorium-2026-02')
    # Note EdgeConneX attribution issue on canonical
    old_summary = canon.get('summary') or ''
    if 'EdgeConneX' in old_summary:
        canon['summary'] = old_summary + ' Correction: EdgeConneX attribution was wrongly associated with Scioto Township — that project is in Ashville.'
    updated_ids.add(canon['id'])

    # Merge provo-ut-2026-02-11 into provo-ut-denial-2026-03-11
    dup = idx['provo-ut-2026-02-11']
    canon = idx['provo-ut-denial-2026-03-11']
    merge_into(dup, canon)
    merged_ids.append('provo-ut-2026-02-11')
    updated_ids.add(canon['id'])

    # Merge pontiac-mi-2026-01-21 into city-of-pontiac-mi-2026-01-21
    dup = idx['pontiac-mi-2026-01-21']
    canon = idx['city-of-pontiac-mi-2026-01-21']
    merge_into(dup, canon)
    merged_ids.append('pontiac-mi-2026-01-21')
    updated_ids.add(canon['id'])

    e = idx['spring-hill-ks-2026-02-26']
    touch(e, status='active', community_outcome='pending', date='2026-03-25')
    updated_ids.add(e['id'])

    e = idx['reno-nv-2025-01-10']
    # Remove stray fields if present
    for f in ('energy_mw', 'investment_usd'):
        if f in e:
            del e[f]
    e['date'] = '2025-01-22'
    e['last_updated'] = TODAY
    updated_ids.add(e['id'])

    e = idx['reno-oppidan-nv-2025-01']
    touch(e, date='2025-03-12', building_sq_ft=61500)
    updated_ids.add(e['id'])

    e = idx['provo-ut-denial-2026-03-11']
    # Already updated via merge, but also handle megawatts
    e['megawatts'] = None
    old_summary = e.get('summary') or ''
    note = ' Correction: megawatts figure cleared — reported as a 6–10 MW allocation, not 30 MW.'
    if '6–10 MW' not in old_summary and '6-10 MW' not in old_summary:
        e['summary'] = old_summary.rstrip() + note
    e['last_updated'] = TODAY
    updated_ids.add(e['id'])

    e = idx['prince-william-county-va-moratorium-2026-02']
    touch(e, date='2026-03-03', status='pending')
    updated_ids.add(e['id'])

    e = idx['pike-township-indianapolis-withdrawal-in-2026-02-04']
    e['date'] = '2026-02-02'
    old_summary = e.get('summary') or ''
    # Fix address
    new_summary = re.sub(r'\b\d{3,5}\s+Walnut\s+(Drive|Dr\.?|Rd\.?|Road|Street|St\.?)\b', '7701 Walnut Drive', old_summary, flags=re.IGNORECASE)
    if new_summary == old_summary and 'Walnut' in old_summary:
        # Walnut mentioned but address format didn't match — append correction
        new_summary = old_summary.rstrip() + ' Correction: address is 7701 Walnut Drive.'
    elif new_summary == old_summary:
        new_summary = old_summary.rstrip() + ' Site address: 7701 Walnut Drive.'
    e['summary'] = new_summary
    e['last_updated'] = TODAY
    updated_ids.add(e['id'])

    e = idx['oakley-ca-datacenter-2025']
    touch(e, date='2026-03-11')
    updated_ids.add(e['id'])

    e = idx['ottawa-il-moratorium-2026-03']
    touch(e, date='2026-03-03')
    updated_ids.add(e['id'])

    e = idx['royalton-vt-2026-03-03']
    touch(e, objective='Moratorium on AI and crypto data centers')
    updated_ids.add(e['id'])

    e = idx['roswell-ga-2026-01-12']
    touch(e, acreage=None, building_sq_ft=None)
    updated_ids.add(e['id'])

    # ----- GROUP 4 -----

    # Merge irwinville-ga-withdrawal-2026-03 into irwin-county-ga-opposition-2026-02
    dup = idx['irwinville-ga-withdrawal-2026-03']
    canon = idx['irwin-county-ga-opposition-2026-02']
    merge_into(dup, canon)
    merged_ids.append('irwinville-ga-withdrawal-2026-03')
    updated_ids.add(canon['id'])

    # Merge henrico-county-varina-va-2026-02-27 into henrico-darbytown-vested-rights-va-2026-02-27
    dup = idx['henrico-county-varina-va-2026-02-27']
    canon = idx['henrico-darbytown-vested-rights-va-2026-02-27']
    merge_into(dup, canon)
    merged_ids.append('henrico-county-varina-va-2026-02-27')
    updated_ids.add(canon['id'])

    e = idx['millard-county-ut-solar-2026-01']
    # energy_mw might be named 'megawatts' in schema
    if 'energy_mw' in e:
        e['energy_mw'] = 1000
    else:
        e['megawatts'] = 1000
    e['last_updated'] = TODAY
    updated_ids.add(e['id'])

    e = idx['middleton-township-oh-2025-04-01']
    # Date already matches ID; ensure it's set correctly
    touch(e, date='2025-04-01')
    updated_ids.add(e['id'])

    e = idx['lawton-ok-zoning-ordinance-2026-02-24']
    e['company'] = None
    e['acreage'] = None
    old_summary = e.get('summary') or ''
    note = ' Correction: 2 MW figure is the zoning review threshold, not the project size. Boomtown Manufacturing LLC and 388-acre figure removed as not supported.'
    if 'zoning review threshold' not in old_summary and 'zoning threshold' not in old_summary:
        e['summary'] = old_summary.rstrip() + note
    e['last_updated'] = TODAY
    updated_ids.add(e['id'])

    e = idx['lake-county-in-zoning-2026-02']
    if 'opposition_website' in e:
        e['opposition_website'] = None
    e['last_updated'] = TODAY
    updated_ids.add(e['id'])

    e = idx['hood-county-tolar-sailfish-tx-2026-01-13']
    # water field name
    if 'water_gallons_per_day' in e:
        e['water_gallons_per_day'] = 1000000
    if 'water_usage_gallons_per_day' in e:
        e['water_usage_gallons_per_day'] = 1000000
    e['last_updated'] = TODAY
    updated_ids.add(e['id'])

    e = idx['jonesborough-tn-2025-11-01']
    old_summary = e.get('summary') or ''
    # Remove BWX Technologies paragraph
    # Split on paragraph boundaries
    paragraphs = re.split(r'\n\n|(?<=\.)\s{2,}', old_summary)
    kept = [p for p in paragraphs if 'BWX' not in p and 'nuclear fuel' not in p.lower()]
    new_summary = ' '.join(kept).strip()
    # Fallback: if we couldn't segment, strip BWX-containing sentences
    if new_summary == old_summary.strip() and ('BWX' in old_summary or 'nuclear fuel' in old_summary.lower()):
        sentences = re.split(r'(?<=[.!?])\s+', old_summary)
        kept_s = [s for s in sentences if 'BWX' not in s and 'nuclear fuel' not in s.lower()]
        new_summary = ' '.join(kept_s).strip()
    e['summary'] = new_summary
    e['last_updated'] = TODAY
    updated_ids.add(e['id'])

    e = idx['nashville-tn-2025-09-09']
    old_summary = e.get('summary') or ''
    new_summary = old_summary.replace('100,000 sq ft', '102,500 sq ft')
    e['summary'] = new_summary
    e['last_updated'] = TODAY
    updated_ids.add(e['id'])

    e = idx['medina-county-tx-2025-08-01']
    old_summary = e.get('summary') or ''
    note = ' Clarification: Microsoft SAT93/94 and Rowan "Project Cinco" are different projects in Medina County and should not be conflated.'
    if 'Project Cinco' not in old_summary and 'SAT93' not in old_summary:
        e['summary'] = old_summary.rstrip() + note
    e['last_updated'] = TODAY
    updated_ids.add(e['id'])

    e = idx['moorestown-nj-2025-12-01']
    touch(e, date='2025-10-31')
    updated_ids.add(e['id'])

    e = idx['morton-county-nd-2024-09-01']
    old_summary = e.get('summary') or ''
    note = ' Note: crypto mining was NOT included in the Morton County data center moratorium (per Govtech).'
    if 'crypto mining was NOT' not in old_summary:
        e['summary'] = old_summary.rstrip() + note
    e['last_updated'] = TODAY
    updated_ids.add(e['id'])

    # ----- Delete merged duplicates -----
    merged_set = set(merged_ids)
    data[:] = [e for e in data if e['id'] not in merged_set]

    save_data(data)

    # Remove merged from updated count
    updated_final = updated_ids - merged_set

    print(f'Tier D verification pass complete.')
    print(f'  Entries updated:        {len(updated_final)}')
    print(f'  Entries merged/deleted: {len(merged_set)}')
    print(f'  Total touched:          {len(updated_final) + len(merged_set)}')
    print()
    print('Merged/deleted IDs:')
    for mid in merged_ids:
        print(f'  - {mid}')


if __name__ == '__main__':
    main()
