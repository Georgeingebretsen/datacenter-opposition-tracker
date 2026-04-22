#!/usr/bin/env python3
"""
Migrate flag-like language from summary text into a structured `flags` array.

Flag schema:
  flags: [
    {
      "type": "<type>",          # enum, see FLAG_TYPES below
      "note": "<short note>",     # description of the issue
      "added": "YYYY-MM-DD"       # when the flag was added
    }
  ]

Types:
  url_unverifiable      — Cloudflare-blocked or inaccessible source, needs manual eyeball
  source_conflict       — sources disagree on a fact
  attribution_uncertain — hyperscaler/company attribution not confirmed by sources
  figure_unverified     — MW/investment/acreage/water figure can't be corroborated
  jurisdiction_ambiguous— township/county conflation suspected
  status_uncertain      — unclear if action passed/pending/approved
  needs_update          — known stale data, event has likely progressed
  other                 — generic flag with free-text note

Also removes migrated bracket-text from summaries to declutter the UI.
"""

import json
import re
import sys
from pathlib import Path

FIGHTS_FILE = Path(__file__).parent.parent / 'site' / 'data' / 'fights.json'
TODAY = '2026-04-21'

# Patterns that indicate a flag in summary text
FLAG_PATTERNS = [
    # Bracket-style flags (most recent pattern)
    (r'\[FLAGGED in verification:([^\]]+)\]', 'other'),
    (r'\[UNVERIFIED[^\]]*\]', 'url_unverifiable'),
    (r'\[URL[^\]]*UNVERIFIED[^\]]*\]', 'url_unverifiable'),
    # Parenthetical hyperscaler audit flags
    (r'\(Hyperscaler attribution REMOVED in accuracy audit:([^)]+)\)', 'attribution_uncertain'),
    (r'\(Hyperscaler attribution FLAGGED as uncertain:([^)]+)\)', 'attribution_uncertain'),
    # Source conflict markers
    (r'\(Source conflict on vote count:([^)]+)\)', 'source_conflict'),
]

def classify_flag_type(note_text):
    """Look at the note text to classify what kind of flag this is."""
    t = note_text.lower()
    if any(w in t for w in ['hyperscaler', 'attribution', 'attributed', 'microsoft', 'google', 'meta', 'amazon', 'aws', 'openai', 'oracle', 'xai']):
        return 'attribution_uncertain'
    if any(w in t for w in ['404', 'url', 'fabricated url', 'paywall', 'cloudflare']):
        return 'url_unverifiable'
    if any(w in t for w in ['source conflict', 'sources disagree', 'vote count']):
        return 'source_conflict'
    if any(w in t for w in ['megawatts', 'investment', 'acreage', ' mw ', 'mw)', 'figure', 'unverified', 'needs sourced']):
        return 'figure_unverified'
    if any(w in t for w in ['jurisdiction', 'county', 'township', 'conflation', 'conflated']):
        return 'jurisdiction_ambiguous'
    if any(w in t for w in ['status', 'still pending', 'not yet', 'overstated']):
        return 'status_uncertain'
    return 'other'

def extract_flags_from_summary(summary):
    """Extract flag notes from summary text. Returns (flags, cleaned_summary)."""
    flags = []
    cleaned = summary

    for pattern, default_type in FLAG_PATTERNS:
        matches = list(re.finditer(pattern, cleaned))
        for m in matches:
            note_text = m.group(1) if m.lastindex and m.lastindex >= 1 else m.group(0)
            note_text = note_text.strip().rstrip('.').strip()
            flag_type = classify_flag_type(note_text)
            flags.append({
                'type': flag_type,
                'note': note_text,
                'added': TODAY,
            })
        cleaned = re.sub(pattern, '', cleaned)

    # Clean up double spaces + leading/trailing whitespace on summary
    cleaned = re.sub(r'\s+', ' ', cleaned).strip()
    return flags, cleaned

def main():
    with open(FIGHTS_FILE) as f:
        data = json.load(f)

    touched = 0
    total_flags_migrated = 0
    flags_by_type = {}

    for d in data:
        summary = d.get('summary', '')
        if not summary:
            continue

        new_flags, cleaned = extract_flags_from_summary(summary)
        if not new_flags:
            continue

        # Merge with existing flags if any
        existing = d.get('flags', []) or []
        # Dedupe by (type, note)
        existing_keys = {(f['type'], f['note']) for f in existing}
        for nf in new_flags:
            if (nf['type'], nf['note']) not in existing_keys:
                existing.append(nf)
                total_flags_migrated += 1
                flags_by_type[nf['type']] = flags_by_type.get(nf['type'], 0) + 1

        d['flags'] = existing
        d['summary'] = cleaned
        d['last_updated'] = TODAY
        touched += 1

    with open(FIGHTS_FILE, 'w') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

    print(f'Migrated {total_flags_migrated} flags across {touched} entries')
    print('\nBy type:')
    for t, c in sorted(flags_by_type.items(), key=lambda x: -x[1]):
        print(f'  {t}: {c}')

if __name__ == '__main__':
    main()
