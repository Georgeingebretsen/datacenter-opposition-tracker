#!/usr/bin/env python3
"""
verification_pass_tier_a.py

Applies corrections from 4 verification-pass agent reports against
site/data/fights.json:
  - Petition signature updates
  - Factual corrections (megawatts, company, jurisdiction, etc.)
  - Summary additions
  - Four duplicate merges (copy unique sources, then delete source entry)
  - Bumps last_updated to 2026-04-19 for every touched entry

Schema invariants preserved:
  - action_type / issue_category / sources stay arrays
  - community_outcome ∈ {win, loss, pending, mixed}
  - scope ∈ {local, statewide, federal}
"""

import json
from pathlib import Path

FIGHTS_PATH = Path("/Users/georgeingebretsen/Desktop/Main/Code/datacenter-fights/site/data/fights.json")
TOUCH_DATE = "2026-04-19"

# ---------------------------------------------------------------------------
# Merges: (source_id, target_id)
# ---------------------------------------------------------------------------
MERGES = [
    ("southaven-naacp-clean-air-act-lawsuit-ms-2026-02-13", "southaven-ms-2026-02-18"),
    ("southaven-ms-xai-permit-2026",                         "southaven-xai-permit-ms-2026-03-10"),
    ("colleton-county-sc-lawsuit-2026-01",                   "colleton-county-ace-basin-lawsuit-sc-2026-02-05"),
    ("cameron-county-tx-2026-02-01",                         "cameron-county-tx-resolution-2026-04-07"),
]

# Optional short summary-append notes for merge targets
MERGE_NOTES = {
    "southaven-ms-2026-02-18":
        " Feb 13, 2026 NAACP/SELC/Earthjustice Clean Air Act 60-day notice of intent to sue is folded into this umbrella entry.",
    "southaven-xai-permit-ms-2026-03-10":
        " Feb 17, 2026 MDEQ public hearing (no speakers in favor) preceded this March 10 permit grant.",
    "colleton-county-ace-basin-lawsuit-sc-2026-02-05":
        "",  # already the canonical lawsuit record
    "cameron-county-tx-resolution-2026-04-07":
        "",  # duplicate had a speculative date; nothing substantive to append
}


# ---------------------------------------------------------------------------
# Per-entry field updates. Keys are entry ids; values are dicts of updates.
# For summary we support {"summary_append": "..."} OR {"summary": "..."} OR
# {"summary_replace": (old, new)} to do a substring replacement.
# ---------------------------------------------------------------------------
UPDATES = {
    # --- Group 1 ---
    "sand-springs-ok-2026-01-15": {
        "petition_signatures": 2058,
        "summary_append":
            " Recall petitions with ~1,600 signatures targeting council members "
            "Worrell, Barnett, and Burdge were delivered to the city clerk on March 31, 2026.",
    },
    "janesville-wi-referendum-2026-11-01": {
        "petition_signatures": 1976,
    },
    "covington-township-lackawanna-county-pa-2025-04-28": {
        "petition_signatures": 2087,
    },
    "columbus-muscogee-county-ga-2026-02-25": {
        "petition_signatures": 4404,
        "summary_append":
            " Columbus City Council delayed its vote on the technology overlay district "
            "in mid-April 2026 pending required advertising of Planning Advisory Commission approval.",
    },
    "colleton-county-ace-basin-lawsuit-sc-2026-02-05": {
        "petition_signatures": 7570,
        "summary_append":
            " EagleRock Partners has been told it must reapply for the special exception "
            "through the Colleton County Zoning Board of Appeals (reapplication not yet filed as of April 2026).",
    },
    "york-township-mi-2026-02-12": {
        "petition_signatures": 11220,
    },
    "st-lucie-county-fl-2026-02-23": {
        "petition_signatures": 650,
    },
    "southaven-ms-2026-02-18": {
        "petition_signatures": 1364,
    },
    "simpson-county-ky-2026-01-28": {
        "petition_signatures": 1796,
        "summary_append":
            " On April 14, 2026, Franklin Citizens for Responsible Development Inc. "
            "filed a second lawsuit in Simpson Circuit Court seeking to void the preliminary plan approval.",
        "opposition_groups_add": ["Franklin Citizens for Responsible Development Inc."],
    },
    "port-washington-wi-ballot-2026-04-07": {
        "megawatts": 1300,
    },
    "pacific-mo-2026-02-25": {
        "petition_signatures": 326,
    },
    "joliet-il-opposition-2026-01": {
        "petition_signatures": 5000,
    },
    "franklin-county-in-2026-02-24": {
        "petition_signatures": 8176,
        "community_outcome": "win",
    },
    "columbia-county-ga-2026-02-04": {
        "petition_signatures": 2238,
        "community_outcome": "loss",
        "summary_append":
            " Both Guido lawsuits were dismissed on March 19, 2026; Guido filed appeals around April 16, 2026.",
    },
    "caddo-bossier-parishes-shreveport-area-la-2026-02-25": {
        "petition_signatures": 1340,
    },
    "berkeley-county-wv-2026-02-26": {
        "petition_signatures": 1862,
    },
    "wv-marl-transmission-line-2026-02": {
        "opposition_website": "https://www.wvatli.org/",
    },
    "independence-mo-2026-02-10": {
        "summary_append":
            " Petition clarification: the Change.org petition (~142 signatures) is separate from "
            "the referendum drive, which peaked at ~3,500 signatures collected under the city charter.",
    },

    # --- Group 2 ---
    "el-paso-tx-meta-community-meetings-2026-03-23": {
        "water_usage_gallons_per_day": 400000,
    },
    "city-of-saline-mi-2026-01-12": {
        "jurisdiction": "Saline Township",
        "acreage": 575,
    },
    "van-buren-township-mi-2026-01-01": {
        "petition_signatures": 1604,
    },
    "stokes-county-nc-2026-01-12": {
        "petition_signatures": 3756,
    },
    "springfield-township-mi-2026-01-07": {
        "company": None,
        "hyperscaler": None,
        "investment_million_usd": None,
        "petition_signatures": 11220,
    },
    "maumee-oh-2026-02-02": {
        "petition_signatures": 1613,
    },
    "hill-county-tx-opposition-2026-02": {
        "company": "Nexus Data Centers",
        "summary_replace": ("CyrusOne", "Nexus Data Centers"),
    },
    "hays-county-tx-2026-02-17": {
        "petition_signatures": 4370,
    },
    "forsyth-monroe-county-ga-2026-02-03": {
        "petition_signatures": 14246,
    },
    "conewago-township-york-county-pa-2026-01-01": {
        "petition_signatures": 944,
        "acreage": 541,
    },
    "champaign-county-oh-2026-02-01": {
        "petition_signatures": 6251,
        "building_sq_ft": 460000,
    },
    "carroll-county-ga-2026-01-28": {
        "petition_signatures": 2661,
    },
    "caledonia-township-mi-2026-01-01": {
        "company": None,
        "investment_million_usd": None,
        "petition_signatures": 11220,
    },

    # --- Group 3 ---
    "laramie-county-wy-2026-01-06": {
        "investment_million_usd": 57000,
    },
    "mt-orab-oh-2026-02-04": {
        "petition_signatures": 1354,
    },
    "illinois-statewide-il-2026-02-20": {
        "petition_signatures": 152,
    },
    "tucker-county-wv-2025-03-01": {
        "petition_signatures": 1862,
        "acreage": 500,
        "summary_append":
            " The West Virginia Air Quality Board ruled in favor of developers on February 7, 2026.",
    },
    "idaho-statewide-id-2026-02-09": {
        "summary_replace": ("HB 609", "H0739"),
    },
    "pennsylvania-statewide-moratorium-proposal-pa-2026-02-17": {
        "petition_signatures": 74,
    },
    "fort-meade-polk-county-fl-2026-02-25": {
        "investment_million_usd": 2600,
        "acreage": 1100,
        "summary_append":
            " Fox13 reports $2.6B investment, 1,100+ acres, with 3,960 construction-peak jobs in 2028 "
            "and 456 operational jobs by 2031.",
    },
    "michigan-statewide-mi-2026-02-26": {
        "petition_signatures": 11220,
    },

    # --- Group 4 ---
    "birmingham-al-2026-01-13": {
        "date": "2026-03-03",
        "summary_replace": ("180-day", "270-day"),
        "summary_append":
            " (Jan 13, 2026 was the proposal/public-hearing date; the 270-day moratorium vote was March 3, 2026.)",
    },
    "coweta-ok-2026-01-19": {
        "petition_signatures": 748,
    },
    "barrington-hills-il-2026-01-29": {
        "petition_signatures": 1574,
    },
    "san-marcos-tx-2026-02-17": {
        "petition_signatures": 4370,
    },
    "lyon-township-mi-2026-03-03": {
        "petition_signatures": 1351,
    },
    "gaines-township-mi-2026-03-03": {
        "petition_signatures": 483,
    },
    "urbana-oh-2026-03-04": {
        "petition_signatures": 6251,
    },
    "cheyenne-wy-annexation-2026-04-03": {
        "company": "Meta, Related Digital, Crusoe, Tallgrass Energy",
        "summary_append":
            " Megawatt figure of 2,700 MW refers to Project Jade (Tallgrass Energy / Crusoe), not Meta or Related Digital.",
    },
    "bossier-parish-benton-la-2026": {
        "status": "approved",
        "acreage": 1089,
        "building_sq_ft": 1300000,
    },
    "brown-county-constitutional-petition-oh-2026-03-01": {
        "opposition_groups": ["Adams County for Responsible Development"],
    },
    "columbia-county-lawsuit-ga-2026-02-25": {
        # reported verified with minor update; the append mirrors the dismissal context.
        "summary_append":
            " Both Guido lawsuits dismissed March 19, 2026; appeals filed around April 16, 2026.",
    },
    "east-whiteland-curative-pa-2026-04-01": {
        "building_sq_ft": 1600000,
    },
}


def dedupe_sources(sources):
    """Keep order, dedupe URLs case-insensitively."""
    seen = set()
    out = []
    for s in sources or []:
        # sources are objects like {"url": "...", "title": "..."} or plain strings
        if isinstance(s, dict):
            url = (s.get("url") or "").strip().lower()
            key = url or json.dumps(s, sort_keys=True)
        else:
            key = str(s).strip().lower()
        if key and key not in seen:
            seen.add(key)
            out.append(s)
    return out


def apply_update(entry, upd):
    """Mutate entry in-place according to the update dict."""
    # Handle summary operations first so they don't clobber each other.
    if "summary_replace" in upd:
        old, new = upd["summary_replace"]
        if isinstance(entry.get("summary"), str) and old in entry["summary"]:
            entry["summary"] = entry["summary"].replace(old, new)
    if "summary_append" in upd:
        sfx = upd["summary_append"].strip()
        cur = entry.get("summary") or ""
        if sfx and sfx not in cur:
            if cur and not cur.endswith((".", "!", "?")):
                cur = cur + "."
            entry["summary"] = (cur + " " + sfx).strip()
    if "summary" in upd:
        entry["summary"] = upd["summary"]

    # opposition_groups_add: append uniquely, preserve array type
    if "opposition_groups_add" in upd:
        cur_groups = entry.get("opposition_groups") or []
        if not isinstance(cur_groups, list):
            cur_groups = [cur_groups]
        for g in upd["opposition_groups_add"]:
            if g not in cur_groups:
                cur_groups.append(g)
        entry["opposition_groups"] = cur_groups

    # Direct field assignments (skip special keys we already handled)
    special = {"summary_replace", "summary_append", "summary", "opposition_groups_add"}
    for k, v in upd.items():
        if k in special:
            continue
        entry[k] = v


def main():
    data = json.loads(FIGHTS_PATH.read_text())
    by_id = {e["id"]: e for e in data}

    touched = set()

    # 1) Apply field updates
    for eid, upd in UPDATES.items():
        entry = by_id.get(eid)
        if entry is None:
            print(f"[warn] UPDATE target missing: {eid}")
            continue
        apply_update(entry, upd)
        touched.add(eid)

    # 2) Apply merges
    merged_source_ids = set()
    for source_id, target_id in MERGES:
        src = by_id.get(source_id)
        tgt = by_id.get(target_id)
        if src is None:
            print(f"[warn] MERGE source missing: {source_id}")
            continue
        if tgt is None:
            print(f"[warn] MERGE target missing: {target_id}")
            continue

        # Copy unique sources
        tgt_sources = tgt.get("sources") or []
        if not isinstance(tgt_sources, list):
            tgt_sources = [tgt_sources]
        src_sources = src.get("sources") or []
        if not isinstance(src_sources, list):
            src_sources = [src_sources]
        combined = dedupe_sources(tgt_sources + src_sources)
        tgt["sources"] = combined

        # Append merge note to target summary, if any
        note = MERGE_NOTES.get(target_id, "")
        if note:
            apply_update(tgt, {"summary_append": note.strip()})

        touched.add(target_id)
        merged_source_ids.add(source_id)

    # 3) Bump last_updated on touched entries
    for eid in touched:
        by_id[eid]["last_updated"] = TOUCH_DATE

    # 4) Remove merged-source entries from the list
    before_count = len(data)
    data = [e for e in data if e["id"] not in merged_source_ids]
    after_count = len(data)

    # 5) Write back
    FIGHTS_PATH.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n")

    print("=== verification_pass_tier_a ===")
    print(f"updated_entries   : {len(touched)}")
    print(f"merged (removed)  : {before_count - after_count}")
    print(f"final entry count : {after_count}")


if __name__ == "__main__":
    main()
