#!/usr/bin/env python3
"""
Tier B Verification Pass

Applies corrections extracted from 4 verification reports to fights.json.
- Merges 2 pairs of duplicate entries
- Applies ~30 critical field/status/summary corrections
- Applies 32 petition_signatures count updates

All touched entries get last_updated="2026-04-21".
Schema preserved: action_type/issue_category/sources remain arrays;
community_outcome in {win,loss,pending,mixed}.
"""

import json
from pathlib import Path
from copy import deepcopy

FIGHTS_PATH = Path("/Users/georgeingebretsen/Desktop/Main/Code/datacenter-fights/site/data/fights.json")
TOUCH_DATE = "2026-04-21"

# Merges: source_id -> target_id
MERGES = [
    ("protect-stafford-va-2025", "stafford-county-va-2025-10-22"),
    ("deforest-wi-cancelled-2026-01", "village-of-deforest-wi-2026-02-03"),
]

# Critical field updates. Keyed by fight ID. Each value is a dict of field -> new value
# Special "__summary" operations handled separately.
UPDATES = {
    "amarillo-tx-2025-12-01": {
        "megawatts": 6000,
        "summary": (
            "Amarillo received TCEQ approval for a 6 GW air-quality permit — the second largest in the nation — "
            "as part of an 11 GW total target. An additional 5 GW permit was filed March 27, 2026 and is pending. "
            "Earlier reporting of 7.65 GW conflated this with the separate GW Ranch / Pacifico Pecos Co project."
        ),
    },
    "bessemer-al-2025-08-01": {
        "date": "2025-11-18",
        "acreage": 700,
        "summary": (
            "Bessemer City Council voted 5-2 on November 18, 2025 to approve the Project Marvel data center on ~700 acres. "
            "The decision followed extensive community opposition."
        ),
    },
    "milan-augusta-township-oh-2025-10-01": {
        "state": "MI",
        "county": "Washtenaw County",
        "lat": 42.0826,
        "lng": -83.6813,
        "summary": (
            "Augusta Charter Township, Washtenaw County, Michigan — local opposition to a proposed data center. "
            "(Previously misfiled as Milan/Augusta Township, Ohio.)"
        ),
    },
    # hidalgo-county-tx-2025-12-22 handled specially below (drop if dup, else rekey)
    "town-of-dryden-ny-2026-02-20": {
        "date": "2026-02-19",
        "megawatts": None,
        "summary": (
            "Town of Dryden, NY adopted a preventative data center zoning restriction on February 19, 2026. "
            "The TeraWulf Cayuga project referenced in earlier coverage is in Lansing, not Dryden — Dryden's action was "
            "preventative, not tied to a specific application."
        ),
    },
    "tulsa-ok-moratorium-2026": {
        "date": "2026-03-26",
        "summary": (
            "Tulsa City Council unanimously passed a NINE-month data center moratorium (through December 31, 2026) on "
            "March 26, 2026. Originally proposed by Councilor Laura Bellis as a 365-day moratorium, it was amended to "
            "9 months in committee."
        ),
    },
    "lordstown-oh-2025-10-01": {
        "hyperscaler": None,
        "megawatts": None,
        "summary": (
            "Lordstown, OH data center opposition. OpenAI is involved in a SEPARATE nearby Stargate project — not this one. "
            "Hyperscaler and MW figures previously attached were incorrect conflations."
        ),
    },
    "mcduffie-county-ga-2026-03-04": {
        "status": "pending",
        "summary": (
            "McDuffie County Planning Commission voted 5-1 on March 3, 2026 to RECOMMEND approval of the proposed "
            "data center. The Board of Commissioners public hearing is scheduled for March 17. Not a final approval."
        ),
    },
    "taylor-tx-2025-09-26": {
        "status": "approved",
        "community_outcome": "loss",
        "summary_append": (
            " Lawsuit dismissed October 8, 2025; construction is proceeding."
        ),
    },
    "bernalillo-county-nm-2026-02-01": {
        "company": None,
        "investment_million_usd": None,
        "acreage": None,
        "summary": (
            "Bernalillo County guardrails resolution (proposed by Commissioner Eric Olivas) passed 4-1 (Benson dissent) "
            "on February 11, 2026. Project Jupiter (Oracle / $50B / ~1,400 acres) is a SEPARATE project in Doña Ana "
            "County — it was incorrectly conflated with this resolution in earlier entries."
        ),
    },
    "caddo-parish-water-moratorium-la-2026": {
        "date": "2026-02-02",
    },
    "st-joseph-county-in-2025-12-10": {
        "company": None,
        "hyperscaler": None,
        "investment_million_usd": 12000,
        "summary": (
            "On December 10, 2025 the St. Joseph County Council voted 7-2 to deny a $12B data center from an undisclosed "
            "developer. Amazon has separate already-approved projects in the region (an earlier $11B+ project and a "
            "$15B Northern Indiana expansion) — those are NOT this denied project."
        ),
    },
    "nebraska-statewide-ne-2026-01-16": {
        "status": "pending",
        "company": None,
        "hyperscaler": None,
        "investment_million_usd": None,
        "megawatts": None,
        "acreage": None,
        "summary": (
            "LB1111, introduced by Senator Machaela Cavanaugh on January 16, 2026, would impose statewide data center "
            "regulations. Hearing held February 12. The bill remains in the Natural Resources Committee. Previously "
            "attached Meta Sarpy figures (company/investment/MW/acreage) have been removed as they applied to a "
            "separate project, not this bill."
        ),
    },
    "statesville-nc-2025-09-01": {
        "date": "2025-09-08",
        "hyperscaler": None,
        "investment_million_usd": None,
        "megawatts": None,
        "acreage": 330,
        "summary_append": " Statesville City Council approved the project 8-0 unanimously.",
    },
    "louisville-ky-2025-09-11": {
        "megawatts": 400,
        "investment_million_usd": None,
        "acreage": 150,
    },
    "childersburg-talladega-al-2026-01-27": {
        "status": "pending",
        "date": "2026-01-23",
        "summary": (
            "Childersburg / Talladega County, AL — only a zoning amendment passed on January 23, 2026. No property has "
            "been sold and no final project approval has occurred."
        ),
    },
    "hobart-in-2025-10-01": {
        "status": "active",
        "acreage": 725,
    },
    "mooresville-nc-2025-08-01": {
        "date": "2025-08-13",
        "investment_million_usd": None,
    },
    "city-of-madison-wi-2026-01-13": {
        "investment_million_usd": None,
        "megawatts": None,
        "acreage": None,
        "summary": (
            "City of Madison, WI adopted a data center moratorium on January 13, 2026. This was a policy-driven, "
            "preventative action — not tied specifically to the QTS/DeForest proposal. QTS figures ($12B / 1,080 MW / "
            "1,600 ac) previously attached to this entry have been removed."
        ),
    },
    "wake-county-nc-2025-08-01": {
        "megawatts": 300,
        "authority_level": "city_council",
    },
    "yerington-lyon-county-nv-2025-08-01": {
        "date": "2025-12-04",
    },
    "sioux-falls-sd-2025-12-01": {
        "company": "Gemini Data Center SD LLC",
    },
    "monroe-county-ga-2025-12-01": {
        "hyperscaler": None,
        "summary_replace": [
            ("Otis Ingram", "Charles Ingram"),
        ],
        "summary_append": " (Google hyperscaler attribution is unverified and has been removed.)",
    },
    "minooka-il-2025-10-01": {
        "water_usage_gallons_per_day": None,
        "acreage": 368,
        "summary_append": " Project is air-cooled; prior water-usage figure has been removed.",
    },
    "menomonie-wi-2025-09-24": {
        "hyperscaler": None,
        "summary_append": " Meta hyperscaler attribution is unconfirmed and has been removed.",
    },
    "town-of-tarboro-nc-2025-09-15": {
        "acreage": 50,
    },
    "little-rock-ar-2025-06-01": {
        "project_name": "Project Leo",
        "investment_million_usd": 6000,
    },
    "shippingport-pa-2026-01-01": {
        "date": "2026-01-28",
        "megawatts": None,
        "summary_append": " Previously listed 3,600 MW figure is unverified and has been removed.",
    },
    "lincoln-county-sd-2026-02-24": {
        "date": "2026-02-26",
        "acreage": 160,
    },
    "spalding-county-ga-2026-01-14": {
        "summary_append": " Final vote held January 23, 2026.",
    },
    "hermiston-or-annexation-2025": {
        "acreage": 810,
    },
    "jones-county-ga-2025-10-01": {
        "date": "2025-10-22",
    },
}

# Petition signature updates. Target IDs resolved from partial keys.
PETITION_UPDATES_RAW = {
    "yerington-lyon-county-nv-2025-08-01": 727,
    "village-of-caledonia-wi-2025-10-09": 2034,
    "monrovia-morgan-county-in-2025-07-01": 2724,
    "monroe-county-ga-2025-12-01": 14248,
    "minooka-il-2025-10-01": 467,
    "menomonie-wi-2025-09-24": 6428,
    "mason-county-ky-2026-03-01": 1062,
    "hassayampa-ranch-tonopah-az-2025-12-10": 247,
    "bessemer-al-2025-08-01": 702,
    "wake-county-nc-2025-08-01": 5427,
    "little-rock-ar-2025-06-01": 6567,
    "kenosha-wi-2025-12-01": 22401,
    "clarksville-ar-2025-11-25": 287,
    "cherokee-county-sc-2025-06-01": 4548,
    "rockford-il-2025-11-01": 3378,
    "page-az-2025-10-01": 2940,
    "mclennan-county-tx-2025-12-01": 3404,
    "mason-county-wv-2025-09-28": 1862,
    "tucker-county-wv-2025-03-01": 1862,
    "lordstown-oh-2025-10-01": 68,
    "lackawanna-county-pa-2025-10-01": 2088,
    "janesville-wi-2025-12-01": 1976,
    "lufkin-tx-2025-11-01": 2953,
    "limerick-township-linfield-pa-2026-01-01": 2399,
    "cumberland-county-nc-2025-11-01": 1995,
    "howell-township-mi-2025-11-20": 3873,
    "hobart-in-2025-10-01": 2822,
    "conshohocken-plymouth-township-pa-2025-10-01": 1205,
    "brandon-ms-2025-09-01": 1161,
    "blakely-pa-2025-09-12": 2088,
    "wilsonville-al-2025-08-24": 316,
    "wilmington-oh-2025-11-26": 2732,
}


def apply_summary_ops(entry, ops_from_updates):
    """Handle summary, summary_append, summary_replace operations for an entry."""
    new = dict(ops_from_updates)  # copy
    if "summary" in new:
        entry["summary"] = new.pop("summary")
    if "summary_append" in new:
        app = new.pop("summary_append")
        cur = entry.get("summary") or ""
        if app.strip() not in cur:
            entry["summary"] = (cur.rstrip() + app) if cur else app.strip()
    if "summary_replace" in new:
        repls = new.pop("summary_replace")
        cur = entry.get("summary") or ""
        for old, nval in repls:
            cur = cur.replace(old, nval)
        entry["summary"] = cur
    return new  # remaining non-summary fields


def dedupe_list(a, b):
    """Union of two lists preserving order from a first, adding new from b."""
    seen = set()
    out = []
    for item in (a or []) + (b or []):
        key = item if isinstance(item, str) else json.dumps(item, sort_keys=True)
        if key not in seen:
            seen.add(key)
            out.append(item)
    return out


def main():
    with open(FIGHTS_PATH) as f:
        data = json.load(f)

    by_id = {e["id"]: e for e in data}
    initial_count = len(data)

    touched = set()
    merged_deleted = []

    # --- MERGES ---
    for src_id, tgt_id in MERGES:
        if src_id not in by_id or tgt_id not in by_id:
            print(f"[WARN] merge skipped — missing id: {src_id} or {tgt_id}")
            continue
        src = by_id[src_id]
        tgt = by_id[tgt_id]
        # Merge sources (dedupe)
        tgt["sources"] = dedupe_list(tgt.get("sources", []), src.get("sources", []))
        # Merge opposition_groups as well (helpful)
        if src.get("opposition_groups"):
            tgt["opposition_groups"] = dedupe_list(
                tgt.get("opposition_groups", []), src.get("opposition_groups", [])
            )
        tgt["last_updated"] = TOUCH_DATE
        touched.add(tgt_id)
        merged_deleted.append(src_id)

    # Remove merged source entries
    data = [e for e in data if e["id"] not in set(merged_deleted)]
    by_id = {e["id"]: e for e in data}

    # --- HIDALGO / CAMERON COUNTY: drop duplicate ---
    # hidalgo-county-tx-2025-12-22 is the wrong-county Eneus entry; Cameron/Harlingen entries already cover it.
    if "hidalgo-county-tx-2025-12-22" in by_id:
        # Merge any unique sources into harlingen-data-center-ordinance-tx-2026 (the primary Cameron/Eneus entry)
        primary = "harlingen-data-center-ordinance-tx-2026"
        if primary in by_id:
            by_id[primary]["sources"] = dedupe_list(
                by_id[primary].get("sources", []),
                by_id["hidalgo-county-tx-2025-12-22"].get("sources", []),
            )
            by_id[primary]["last_updated"] = TOUCH_DATE
            touched.add(primary)
        data = [e for e in data if e["id"] != "hidalgo-county-tx-2025-12-22"]
        by_id = {e["id"]: e for e in data}
        merged_deleted.append("hidalgo-county-tx-2025-12-22")

    # --- CRITICAL UPDATES ---
    for fid, ops in UPDATES.items():
        if fid not in by_id:
            print(f"[WARN] update target not found: {fid}")
            continue
        entry = by_id[fid]
        ops_copy = deepcopy(ops)
        remaining = apply_summary_ops(entry, ops_copy)
        # Apply remaining scalar/list field updates
        for field, val in remaining.items():
            entry[field] = val
        entry["last_updated"] = TOUCH_DATE
        touched.add(fid)

    # --- PETITION SIGNATURE UPDATES ---
    for fid, sigs in PETITION_UPDATES_RAW.items():
        if fid not in by_id:
            print(f"[WARN] petition target not found: {fid}")
            continue
        entry = by_id[fid]
        entry["petition_signatures"] = sigs
        entry["last_updated"] = TOUCH_DATE
        touched.add(fid)

    # --- Schema guards ---
    for entry in data:
        # Ensure arrays stay arrays
        for arr_field in ("action_type", "issue_category", "sources", "opposition_groups"):
            if arr_field in entry and entry[arr_field] is None:
                entry[arr_field] = []
        # Validate community_outcome
        if entry.get("community_outcome") not in (None, "win", "loss", "pending", "mixed"):
            print(f"[WARN] invalid community_outcome on {entry['id']}: {entry['community_outcome']}")

    # Write back
    with open(FIGHTS_PATH, "w") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
        f.write("\n")

    print("=" * 60)
    print(f"Initial entries: {initial_count}")
    print(f"Final entries:   {len(data)}")
    print(f"Merged/deleted:  {len(merged_deleted)}  -> {merged_deleted}")
    print(f"Touched entries: {len(touched)}")
    print("=" * 60)


if __name__ == "__main__":
    main()
