#!/usr/bin/env python3
"""
List all open flags in fights.json grouped by type.

Usage:
  python3 scripts/list_flags.py                   # all open flags
  python3 scripts/list_flags.py attribution_uncertain  # one type
  python3 scripts/list_flags.py --counts          # just counts per type
"""

import json
import sys
from collections import defaultdict
from pathlib import Path

FIGHTS_FILE = Path(__file__).parent.parent / 'site' / 'data' / 'fights.json'

def main():
    with open(FIGHTS_FILE) as f:
        data = json.load(f)

    counts_only = '--counts' in sys.argv
    type_filter = next((a for a in sys.argv[1:] if not a.startswith('--')), None)

    by_type = defaultdict(list)
    for d in data:
        for flag in d.get('flags', []) or []:
            by_type[flag['type']].append({
                'id': d['id'],
                'jurisdiction': d.get('jurisdiction', ''),
                'state': d.get('state', ''),
                'note': flag.get('note', ''),
                'added': flag.get('added', ''),
            })

    total = sum(len(v) for v in by_type.values())
    print(f'Total open flags: {total} across {sum(1 for d in data if d.get("flags"))} entries\n')

    for flag_type, items in sorted(by_type.items(), key=lambda x: -len(x[1])):
        if type_filter and flag_type != type_filter:
            continue
        print(f'=== {flag_type} ({len(items)}) ===')
        if counts_only:
            print()
            continue
        for item in items:
            print(f'  [{item["added"]}] {item["id"]}')
            print(f'    {item["jurisdiction"]}, {item["state"]}')
            print(f'    → {item["note"][:180]}')
        print()

if __name__ == '__main__':
    main()
