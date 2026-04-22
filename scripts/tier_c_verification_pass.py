#!/usr/bin/env python3
"""Tier C verification pass — apply corrections from 4 verification reports.

Writes site/data/fights.json in place with indent=2, ensure_ascii=False.
Every touched entry gets last_updated="2026-04-21".
"""
from __future__ import annotations

import json
from pathlib import Path

PATH = Path(__file__).resolve().parent.parent / "site" / "data" / "fights.json"
LAST_UPDATED = "2026-04-21"

FLAG = "[FLAGGED in verification"


def load():
    return json.loads(PATH.read_text())


def save(data):
    PATH.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n")


def main() -> int:
    data = load()
    by_id = {e["id"]: e for e in data}
    touched: set[str] = set()

    def touch(entry_id: str, **fields) -> None:
        if entry_id not in by_id:
            print(f"  ! SKIP missing id: {entry_id}")
            return
        e = by_id[entry_id]
        for k, v in fields.items():
            e[k] = v
        e["last_updated"] = LAST_UPDATED
        touched.add(entry_id)

    def append_summary(entry_id: str, note: str) -> None:
        if entry_id not in by_id:
            print(f"  ! SKIP missing id (summary): {entry_id}")
            return
        e = by_id[entry_id]
        s = e.get("summary") or ""
        if note in s:
            return
        e["summary"] = (s + " " + note).strip()
        e["last_updated"] = LAST_UPDATED
        touched.add(entry_id)

    # ---------------- Group 1 ----------------

    # milam-county-tx-2024-12-01: rewrite summary, investment 3000 -> 1000
    touch(
        "milam-county-tx-2024-12-01",
        investment_million_usd=1000,
        summary=(
            "Milam County (TX) has become a flashpoint for data center buildout as SB Energy "
            "(SoftBank) and partners advance the Stargate / Milam County campus near Sharp (Rockdale / "
            "Thorndale area), a multi-building site associated with OpenAI and SoftBank. "
            "Local opposition and the nearby City of Thorndale have pushed back on the scale, power "
            "demand, and water impact of the project, and Milam County commissioners have wrestled "
            "with zoning and designated-zone restrictions on data centers. "
            f"{FLAG}: prior summary conflated Milam County with Abilene; investment_million_usd "
            "revised from 3000 to 1000 to reflect the Milam-specific figure rather than the broader "
            "Stargate program.]"
        ),
    )

    # pittsylvania-county-va-2025-04-01: company Uranium LLC -> Balico
    touch(
        "pittsylvania-county-va-2025-04-01",
        company="Balico",
    )

    # york-county-sc-2025-11-01: investment 8000 -> 1000; petition 1652 -> 1759
    touch(
        "york-county-sc-2025-11-01",
        investment_million_usd=1000,
        petition_signatures=1759,
    )

    # aurora-il-2026-02-19: status passed -> pending, petition 658 -> 669, clarify
    touch(
        "aurora-il-2026-02-19",
        status="pending",
        community_outcome="pending",
        petition_signatures=669,
        summary=(
            "Aurora (IL) is debating what supporters describe as the strictest-in-Illinois data "
            "center noise and setback ordinance. The February 19, 2026 Planning & Development "
            "Committee meeting did not finalize rules; regulations remain under active debate in "
            "2026. "
            f"{FLAG}: prior summary conflated the 2024 CyrusOne groundbreaking with the February "
            "2026 regulations debate; status revised from passed/win to pending while Aurora "
            "continues to consider the ordinance. Petition count updated to 669.]"
        ),
    )

    # fort-worth-southeast-tx-2025-01-01: status approved -> pending
    touch(
        "fort-worth-southeast-tx-2025-01-01",
        status="pending",
        community_outcome="pending",
    )

    # genesee-county-stamp-ny-2025-02-01: company -> Stream U.S. Data Centers
    touch(
        "genesee-county-stamp-ny-2025-02-01",
        company="Stream U.S. Data Centers",
        status="active",
        community_outcome="pending",
        summary=(
            "Stream U.S. Data Centers is advancing a 500 MW / 2.2M sq ft expanded data center "
            "campus at the STAMP site in Genesee County (NY) after the original 250 MW proposal "
            "was cancelled amid treaty-rights objections from the Tonawanda Seneca Nation and "
            "environmental groups. The expanded project is active; the earlier 250 MW configuration "
            f"was cancelled. {FLAG}: company corrected from 'STREAM Data Centers' to 'Stream U.S. "
            "Data Centers'; status revised to reflect the active expanded project.]"
        ),
    )

    # logan-county-co-2025-10-01: add pagosadailypost source
    _add_source = "https://www.pagosadailypost.com/"
    e = by_id.get("logan-county-co-2025-10-01")
    if e is not None:
        srcs = list(e.get("sources") or [])
        new_src = "https://pagosadailypost.com/2025/10/21/granite-renewables-logan-county/"
        # If any pagosadailypost url already present, skip
        if not any("pagosadailypost.com" in (s or "") for s in srcs):
            srcs.append(new_src)
        append_summary(
            "logan-county-co-2025-10-01",
            f"{FLAG}: Granite Renewables details sourced to pagosadailypost.com; no primary "
            "confirmation obtained.]",
        )
        touch("logan-county-co-2025-10-01", sources=srcs)

    # palm-beach-county-fl-2025-12-10: petition 9557 -> 9752
    touch("palm-beach-county-fl-2025-12-10", petition_signatures=9752)

    # lowell-township-mi-2025-12-18: petition 2364 -> 2463
    touch("lowell-township-mi-2025-12-18", petition_signatures=2463)

    # ---------------- Group 2 ----------------

    # crown-point-northwest-indiana-in-2025-11-01: clarify summary
    append_summary(
        "crown-point-northwest-indiana-in-2025-11-01",
        f"{FLAG}: this entry covers broader Northwest Indiana scouting/buildout (including Hobart "
        "and surrounding communities), not a Crown-Point-specific project.]",
    )

    # oneonta-ny-moratorium-2026-02: passed -> pending, win -> pending
    touch(
        "oneonta-ny-moratorium-2026-02",
        status="pending",
        community_outcome="pending",
    )

    # colleton-county-sc-2025-12-18: company name fix, flag water number
    touch(
        "colleton-county-sc-2025-12-18",
        company="Eagle Rock Partners",
    )
    append_summary(
        "colleton-county-sc-2025-12-18",
        f"{FLAG}: water_usage_gallons_per_day value of 12,000 is implausibly low for a 1 GW campus "
        "and is likely missing decimals or units; retained pending verification.]",
    )

    # reno-nv-2025-02-05: remove Tract attribution and unverified MW/acreage
    touch(
        "reno-nv-2025-02-05",
        company=None,
        megawatts=None,
        acreage=None,
    )
    append_summary(
        "reno-nv-2025-02-05",
        f"{FLAG}: moratorium was not Tract-specific — company/MW/acreage cleared pending sourced "
        "attribution.]",
    )

    # norton-oh-2025-11-03: megawatts 5 -> null (entry currently has no MW; still flag)
    e = by_id.get("norton-oh-2025-11-03")
    if e is not None:
        if e.get("megawatts") not in (None,):
            touch("norton-oh-2025-11-03", megawatts=None)
        append_summary(
            "norton-oh-2025-11-03",
            f"{FLAG}: reported 5 MW figure was inconsistent with a $2B project scale; megawatts set "
            "to null pending sourced confirmation.]",
        )

    # matthews-mecklenburg-county-nc-2025-09-01: opposition_website is developer site
    touch(
        "matthews-mecklenburg-county-nc-2025-09-01",
        opposition_website=None,
    )
    append_summary(
        "matthews-mecklenburg-county-nc-2025-09-01",
        f"{FLAG}: prior opposition_website (projectacceleratenc.com) was actually the developer's "
        "site, not an opposition group — removed.]",
    )

    # shelby-county-shelbyville-in-2026-01-01: fix typo "Shelby, Indiana,ville" in summary
    e = by_id.get("shelby-county-shelbyville-in-2026-01-01")
    if e is not None:
        for field in ("objective", "summary"):
            v = e.get(field) or ""
            new_v = v.replace("Shelby, Indiana,ville", "Shelbyville, Indiana")
            new_v = new_v.replace("Shelby,ville", "Shelbyville")
            if new_v != v:
                touch("shelby-county-shelbyville-in-2026-01-01", **{field: new_v})

    # ---------------- Group 3 ----------------

    # hamilton-township-oh-2025-11-12: WRONG JURISDICTION -> City of Hamilton, Butler County
    touch(
        "hamilton-township-oh-2025-11-12",
        jurisdiction="City of Hamilton",
        county="Butler County",
    )
    append_summary(
        "hamilton-township-oh-2025-11-12",
        f"{FLAG}: jurisdiction corrected from 'Hamilton Township' to 'City of Hamilton' (Butler "
        "County, OH).]",
    )

    # irwin-county-ga-opposition-2026-02: company Google -> null; date -> 2026-03-02;
    #  petition 588 -> 608; summary clarify applicant
    touch(
        "irwin-county-ga-opposition-2026-02",
        company=None,
        hyperscaler=None,
        date="2026-03-02",
        petition_signatures=608,
    )
    append_summary(
        "irwin-county-ga-opposition-2026-02",
        f"{FLAG}: Google attribution was speculative per the petition, not the actual applicant. "
        "Applicant of record is James Russell Bryant / Marcus D. Fletcher Trust; the rezoning "
        "was withdrawn on 2026-03-02.]",
    )

    # habersham-county-cornelia-ga-2025-12: project name fix; summary clarify
    touch(
        "habersham-county-cornelia-ga-2025-12",
        project_name="Red Apple Innovation Corridor",
    )
    append_summary(
        "habersham-county-cornelia-ga-2025-12",
        f"{FLAG}: project renamed from 'Big Red Apple' to 'Red Apple Innovation Corridor'. The "
        "data center component was speculative; the broader project collapsed following rejection "
        "of the annexation.]",
    )

    # douglas-county-ga-2025-03-01: megawatts 180 -> 120
    touch("douglas-county-ga-2025-03-01", megawatts=120)
    append_summary(
        "douglas-county-ga-2025-03-01",
        f"{FLAG}: initial megawatts revised from 180 to 120; 200 MW total planned at full build-out.]",
    )

    # lewiston-me-2025-12-16: acreage 2 -> null
    touch("lewiston-me-2025-12-16", acreage=None)
    append_summary(
        "lewiston-me-2025-12-16",
        f"{FLAG}: project was 85,000 sq ft inside Bates Mill, not a 2-acre site; acreage cleared.]",
    )

    # lisle-il-2026-01-23: date -> 2026-03-12; clarify summary
    touch("lisle-il-2026-01-23", date="2026-03-12")
    append_summary(
        "lisle-il-2026-01-23",
        f"{FLAG}: date updated to 2026-03-12 (actual withdrawal). The January 23 hearing was "
        "postponed, not the withdrawal date.]",
    )

    # city-of-thorndale-tx-2024-10-01: status approved -> cancelled
    touch(
        "city-of-thorndale-tx-2024-10-01",
        status="cancelled",
        community_outcome="win",
    )
    append_summary(
        "city-of-thorndale-tx-2024-10-01",
        f"{FLAG}: project was called off; status revised from 'approved' to 'cancelled'.]",
    )

    # clinton-ms-2026-01-15: investment 750 -> 1000 (cap for 1000+ noted in summary)
    touch("clinton-ms-2026-01-15", investment_million_usd=1000)
    append_summary(
        "clinton-ms-2026-01-15",
        f"{FLAG}: investment revised upward (1000M+ baseline) to reflect the April 2026 updated "
        "$25B MS-wide figure; the 750M figure was an earlier Clinton-specific number.]",
    )

    # fredericksburg-va-penzance-gateway-2025-12: note status reflects Planning Commission
    append_summary(
        "fredericksburg-va-penzance-gateway-2025-12",
        f"{FLAG}: status reflects the Planning Commission action, not the City Council.]",
    )

    # city-of-pontiac-mi-2026-01-21: petition 11109 -> 11224
    touch("city-of-pontiac-mi-2026-01-21", petition_signatures=11224)

    # city-of-lagrange-ga-2025-09-01: date -> 2025-09-23
    touch("city-of-lagrange-ga-2025-09-01", date="2025-09-23")

    # lacy-lakeview-waco-area-tx-2025-12-03: petition 3335 -> 3407
    touch("lacy-lakeview-waco-area-tx-2025-12-03", petition_signatures=3407)

    # joplin-mo-2025-10-01: petition 2048 -> 2058
    touch("joplin-mo-2025-10-01", petition_signatures=2058)

    # shreveport-la-2025-10-01: petition 1336 -> 1340
    touch("shreveport-la-2025-10-01", petition_signatures=1340)

    # ---------------- Group 4 ----------------

    # bartow-county-ga-2026-03-01: investment/MW/acreage/sqft -> null (cross-contaminated)
    touch(
        "bartow-county-ga-2026-03-01",
        investment_million_usd=None,
        megawatts=None,
        acreage=None,
        building_sq_ft=None,
    )
    append_summary(
        "bartow-county-ga-2026-03-01",
        f"{FLAG}: prior investment/MW/acreage/sq-ft values were cross-contaminated from the "
        "Adairsville project and have been cleared. Lawsuit and opposition facts preserved.]",
    )

    # beaver-dam-wi-2025-12-01: megawatts 400 -> 220
    touch("beaver-dam-wi-2025-12-01", megawatts=220)
    append_summary(
        "beaver-dam-wi-2025-12-01",
        f"{FLAG}: megawatts revised from 400 to 220 per unredacted Alliant contract.]",
    )

    # west-louisville-ky-2026-03-05: summary 8-1 -> 6-1
    e = by_id.get("west-louisville-ky-2026-03-05")
    if e is not None:
        s = e.get("summary") or ""
        new_s = s.replace("8-1", "6-1")
        if new_s != s:
            touch("west-louisville-ky-2026-03-05", summary=new_s)
        else:
            append_summary(
                "west-louisville-ky-2026-03-05",
                f"{FLAG}: council vote clarified as 6-1 (not 8-1).]",
            )

    # sunbury-oh-2026-02-24: status passed, outcome win, acreage 330 -> 241
    touch(
        "sunbury-oh-2026-02-24",
        status="passed",
        community_outcome="win",
        acreage=241,
    )
    append_summary(
        "sunbury-oh-2026-02-24",
        f"{FLAG}: moratorium passed 6-0 on April 15; acreage revised from 330 to 241.]",
    )

    # washington-sb-6231-wa-2026-01-01: sponsor fix (Noel Frame, not Macri)
    e = by_id.get("washington-sb-6231-wa-2026-01-01")
    if e is not None:
        sponsors = list(e.get("sponsors") or [])
        changed = False
        new_sponsors = []
        for s in sponsors:
            if "Macri" in (s or ""):
                new_sponsors.append("Sen. Noel Frame (D-WA)")
                changed = True
            else:
                new_sponsors.append(s)
        if not any("Frame" in (s or "") for s in new_sponsors):
            new_sponsors = ["Sen. Noel Frame (D-WA)"] + new_sponsors
            changed = True
        if changed:
            touch("washington-sb-6231-wa-2026-01-01", sponsors=new_sponsors)
        s = e.get("summary") or ""
        new_s = s.replace("Macri", "Frame")
        if new_s != s:
            touch("washington-sb-6231-wa-2026-01-01", summary=new_s)
        append_summary(
            "washington-sb-6231-wa-2026-01-01",
            f"{FLAG}: prime sponsor corrected to Sen. Noel Frame (prior 'Macri' was incorrect).]",
        )

    # whitfield-county-dalton-ga-2025-03-11: hyperscaler CoreWeave -> null
    touch("whitfield-county-dalton-ga-2025-03-11", hyperscaler=None)
    append_summary(
        "whitfield-county-dalton-ga-2025-03-11",
        f"{FLAG}: CoreWeave is the tenant, not the hyperscaler — hyperscaler cleared.]",
    )

    # virginia-statewide-hb-1515-moratorium-va-2026-02-01: county -> null (statewide)
    touch("virginia-statewide-hb-1515-moratorium-va-2026-02-01", county=None)

    # wisconsin-ab-840-wi-2026-01-09: fix 'Romain' -> 'Romaine' in sponsors
    e = by_id.get("wisconsin-ab-840-wi-2026-01-09")
    if e is not None:
        sponsors = list(e.get("sponsors") or [])
        new_sponsors = [s.replace("Romain Quinn", "Romaine Quinn") for s in sponsors]
        if new_sponsors != sponsors:
            touch("wisconsin-ab-840-wi-2026-01-09", sponsors=new_sponsors)

    # breckinridge-county-ky-2025-12-01: clear TeraWulf fields (belongs to Hancock County)
    touch(
        "breckinridge-county-ky-2025-12-01",
        company=None,
        investment_million_usd=None,
        megawatts=None,
        acreage=None,
    )
    append_summary(
        "breckinridge-county-ky-2025-12-01",
        f"{FLAG}: TeraWulf data applied to this entry belonged to Hancock County, KY — company, "
        "investment, megawatts, and acreage cleared.]",
    )

    # ---------------- General petition updates ----------------

    touch("maricopa-county-zoning-ordinance-az-2025", petition_signatures=7054)
    # kosciusko-county-in-2025-04-02: stable ~2440 (current is 2439) — still mark touched w/ date
    touch("kosciusko-county-in-2025-04-02", petition_signatures=2440)

    # ---------------- Save ----------------
    save(data)
    print(f"Touched {len(touched)} entries; last_updated={LAST_UPDATED}")
    for i in sorted(touched):
        print(f"  - {i}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
