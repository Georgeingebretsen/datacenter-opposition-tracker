#!/usr/bin/env python3
"""
Reconcile date field mismatches for entries where the ID-embedded date
differs significantly from the `date` field. Based on summary content,
the canonical event date was selected for each. IDs are NOT renamed.
"""
import json
from pathlib import Path

FIGHTS = Path(__file__).parent.parent / "site" / "data" / "fights.json"
LAST_UPDATED = "2026-04-21"

# id -> new canonical date (None means skip/flag for manual review)
# Entries intentionally left untouched are commented out with rationale.
UPDATES = {
    # Multiple extensions through Sep 2025, most recent action = Dec 8 2025 hearing
    "clinton-county-ia-2025-10-01": "2025-12-08",

    # Ongoing bills, per MultiState March 2026 tracker - match ID
    "minnesota-statewide-moratorium-proposal-mn-2026-02-20": "2026-02-20",

    # Bill has 2026 session activity; update to ID date
    "north-carolina-statewide-hb-1002-nc-2026-02-01": "2026-02-01",

    # 2026 bills are current activity; update to ID
    "west-virginia-statewide-wv-2026-01-01": "2026-01-01",

    # Feb 2026 council vote on permanent ban
    "st-charles-mo-permanent-ban-2026-02-01": "2026-02-01",

    # Planning Commission vote late March 2026
    "trenton-oh-project-mila-2026-03-30": "2026-03-30",

    # Lawsuit filed March 27 2026 is most recent major action
    "mason-county-ky-2026-03-01": "2026-03-27",

    # Data center moratorium resolution Nov 25 2025 (more precise than solar Nov 12)
    "mitchell-county-ia-2025-02-01": "2025-11-25",

    # Commission voted April 9 2026 to lift moratorium + adopt permanent ordinance
    "athens-clarke-county-ga-2025-12-01": "2026-04-09",

    # Ordinance introduced April 8 2026
    "monroe-township-gloucester-dc-ban-nj-2026-03-25": "2026-04-08",

    # Commissioners voted 3-2 to rezone April 10 2026
    "coweta-county-ga-2025-05-01": "2026-04-10",

    # ELUC voted April 9 2026 to amend moratorium
    "champaign-county-il-2025-12-01": "2026-04-09",

    # City Council unanimous vote Feb 9 2026 to place on ballot
    "janesville-wi-referendum-2026-11-01": "2026-02-09",

    # Rezoning approved Nov 18 2025 is the major event
    "bessemer-al-expansion-2026-01": "2025-11-18",

    # Wake Up JeffCo lawsuit April 10 2026 is most recent action
    "festus-mo-crg-community-opposition-2026-03": "2026-04-10",

    # --- Entries intentionally left alone (field_date is correct / reflects most recent event) ---
    # "chelan-county-pud-wa-2015-02-01": keep 2014-12-01 (initial Dec 2014 moratorium)
    # "jackson-county-ia-2025-03-01": keep 2024-09-17 (original moratorium; later events lack specific dates)
    # "bessemer-al-2025-08-01": keep 2025-11-18 (vote date)
    # "yerington-lyon-county-nv-2025-08-01": keep 2025-12-04 (approval date)
    # "north-tonawanda-ny-2024-07-01": keep 2025-08-12 (later activity after initial moratorium)
    # "fauquier-county-remington-va-2025-06-18": keep 2025-08-25 (withdrawal date)
    # "griffin-spalding-county-ga-2025-09-01": keep 2026-01-13 (reflects later update)
    # "village-of-yorkville-wi-2025-10-01": keep 2025-12-08 (joint pre-application conference)
    # "douglas-county-ga-2025-03-01": keep 2025-10-22 (reflects later activity)
    # "culpeper-county-va-2024-04-01": keep 2025-10-28 (most recent update)
    # "foristell-mo-2025-11-01": keep 2026-03-16 (reflects later update)
    # "marshall-county-in-2025-02-01": keep 2025-11-24 (captures cascade incl. Putnam Nov 2025)
    # "dekalb-county-ga-2024-07-01": keep 2025-12-16 (Dec 16 2025 extension meeting)
    # "nevada-greenlink-west-nv-2025-05-01": keep 2026-01-12 (construction phase update)
    # "covington-township-lackawanna-county-pa-2025-04-28": keep 2026-02-03 (~Jan 30 ruling)
    # "tucker-county-wv-2025-03-01": keep 2026-02-07 (DEP air permit period)
    # "illinois-commerce-commission-il-2025-12-01": keep 2026-02-19 (Feb 2026 budget address)
    # "middleton-township-oh-2025-04-01": keep 2026-02-19 (later update)
    # "canton-ms-2025-01-01": keep 2026-03-01 (national coverage)
    # "marion-county-sc-2025-01-22": keep 2026-03-05 (later update; approval was Jan 22 2025 - ID captures that)
    # "fauquier-county-catlett-va-2025-10-01": keep 2024-07-15 (correct event; ID is stale)
    # "monterey-park-ca-ballot-ban-2026-06": keep 2026-03-04 (council vote to place on ballot)
    # "appomattox-county-va-2024-12-01": keep 2026-03-24 (reflects recent update)
    # "boulder-city-nv-ballot-2026-11": keep 2026-02-24 (Feb 24 2026 council referral)
    # "town-of-burns-harbor-in-2024-08-05": AMBIGUOUS - flagged below
}

# Flagged for manual review
FLAGS = [
    ("town-of-burns-harbor-in-2024-08-05",
     "Summary describes ongoing opposition but no single pinned event date; "
     "ID says 2024-08-05, field says 2025-05-05 - unclear which event is canonical."),
]


def main():
    data = json.loads(FIGHTS.read_text())
    changes = []
    by_id = {d["id"]: d for d in data}

    for fight_id, new_date in UPDATES.items():
        if fight_id not in by_id:
            print(f"WARNING: ID not found: {fight_id}")
            continue
        entry = by_id[fight_id]
        old_date = entry.get("date", "")
        if old_date == new_date:
            print(f"SKIP (already correct): {fight_id} = {new_date}")
            continue
        entry["date"] = new_date
        entry["last_updated"] = LAST_UPDATED
        changes.append((fight_id, old_date, new_date))

    FIGHTS.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n")

    print(f"\n{'='*80}")
    print(f"Updated {len(changes)} entries")
    print(f"{'='*80}")
    for fid, old, new in changes:
        print(f"  {fid}")
        print(f"    {old}  ->  {new}")

    if FLAGS:
        print(f"\n{'='*80}")
        print(f"FLAGGED for manual review ({len(FLAGS)})")
        print(f"{'='*80}")
        for fid, reason in FLAGS:
            print(f"  {fid}")
            print(f"    {reason}")


if __name__ == "__main__":
    main()
