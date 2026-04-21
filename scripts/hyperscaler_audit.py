#!/usr/bin/env python3
"""Apply hyperscaler attribution audit results to fights.json.

- Removes unverified hyperscaler attributions (set to null) with a summary note.
- Adds caveats to flagged entries where attribution is inferred but unconfirmed.
- Applies explicit corrections.
- Stamps last_updated=2026-04-21 on every touched entry.
"""

import json
from pathlib import Path

FIGHTS_PATH = Path(
    "/Users/georgeingebretsen/Desktop/Main/Code/datacenter-fights/site/data/fights.json"
)
LAST_UPDATED = "2026-04-21"

# id -> note to append to summary
REMOVALS = {
    "city-of-peculiar-mo-2024-10-01":
        "Hyperscaler not named in sources; Meta/Diode link documented only for nearby Kansas City project.",
    "pima-county-zoning-amendment-az-2026":
        "AWS was initial end user but publicly withdrew from Project Blue in December 2025.",
    "hancock-county-in-2025-06-01":
        "Google not publicly confirmed; only circumstantial (images resemble known Google facilities).",
    "perry-township-oh-2025-07-01":
        "Microsoft is associated with a DIFFERENT Perry Township (Allen County, not Lake County). Province Group project has no confirmed hyperscaler.",
    "village-of-yorkville-wi-2025-10-01":
        "Microsoft explicitly DENIED involvement: 'not currently evaluating any sites for data center development in Yorkville.'",
    "foristell-mo-2025-11-01":
        "Tenant undisclosed; Google not confirmed in any source.",
    "sprigg-township-oh-moratorium-2026":
        "Tenant under NDA; Meta not confirmed.",
    "newton-county-ga-2025":
        "Meta not confirmed for this TPA/SC Infrastructure project; Meta's Stanton Springs is a separate nearby project.",
    "washington-township-macomb-mi-2026":
        "CNBC Microsoft article was about Lowell Township (Kent County), not Washington Township (Macomb County). No confirmed hyperscaler for this Prologis project.",
    "monroe-township-adams-county-oh-2026-03-09":
        "Meta not confirmed; developer under NDA. The Hunterbrook 'Meta Ohio' article refers to Piqua/Mount Orab, not this Adams County project.",
}

# id -> caveat appended to summary, hyperscaler retained
FLAGS = {
    "conway-ar-2025-04-01":
        "Google is inferred via Forgelight manager's other projects but is not confirmed in Conway-specific sources.",
    "charles-city-county-va-2025-08-01":
        "Meta is inferred via Diode's track record in Kansas City but not confirmed for this Charles City project.",
    "claremore-ok-2026-01-15":
        "AWS is inferred via Beale Infrastructure's prior work (incl. Project Blue) but not confirmed for Project Mustang.",
    "hollenback-township-pa-2026-03-02":
        "AWS attribution likely incorrect — the documented Talen/AWS deal is at the adjacent Salem Township Susquehanna campus, not Hollenback. This Cumulus Real Estate Holdings project has no confirmed hyperscaler.",
    "salem-township-luzerne-county-pa-2026-03-17":
        "AWS attribution inferred; QTS (Blackstone-owned) serves multiple hyperscalers, and Talen's public AWS deal is separate. Not confirmed for this QTS campus specifically.",
    "waterville-township-oh-2025-12-17":
        "Meta context is regional (nearby Middleton Township Meta project); Waterville developer undisclosed.",
    "floyd-county-rome-ga-2025-05-01":
        "Microsoft confirmed for separate 'Project Firecracker' (Huffaker Road, 347ac) but NOT for the Atlas Development Coosa/Plainville/Battey project (100ac).",
}

# Special case: Seneca / TeraWulf — change hyperscaler label and note
SENECA_ID = "seneca-county-terawulf-water-ny-2026"
SENECA_NEW_HYPERSCALER = "Fluidstack (Google-backed)"
SENECA_NOTE = (
    "Direct tenant is Fluidstack; Google holds ~8% equity in TeraWulf and "
    "backstops ~$1.8B of Fluidstack's lease — indirect link."
)

# Covington correction
COVINGTON_ID = "covington-ga-2026-01-05"
COVINGTON_OLD_COMPANY = "3Rivers Development"
COVINGTON_NEW_COMPANY = "Amazon Web Services (AWS)"

# Fredonia/Saukville: add Oracle alongside OpenAI
FREDONIA_ID = "fredonia-saukville-wi-2025-10-10"
FREDONIA_NEW_HYPERSCALER = "OpenAI / Oracle"
FREDONIA_NOTE = (
    "Vantage press release confirmed 'OpenAI, Oracle and Vantage' for the "
    "Stargate WI site — Oracle is a co-tenant alongside OpenAI."
)


def append_note(summary: str, note: str) -> str:
    """Append a note as a new sentence to summary, avoiding duplicates."""
    summary = (summary or "").rstrip()
    if note in summary:
        return summary
    sep = " " if summary and not summary.endswith(tuple(".!?")) else " "
    if summary and not summary.endswith(tuple(".!?")):
        summary = summary + "."
    return (summary + (" " if summary else "") + note).strip()


def find_company_field(entry: dict) -> str | None:
    """Return the key name used for the company field on this entry."""
    for key in ("company", "developer", "operator"):
        if key in entry:
            return key
    return None


def main() -> None:
    data = json.loads(FIGHTS_PATH.read_text())
    # Support either a list or {fights: [...]} structure
    if isinstance(data, dict) and "fights" in data:
        fights = data["fights"]
        wrapper = data
    elif isinstance(data, list):
        fights = data
        wrapper = None
    else:
        raise SystemExit(f"Unexpected fights.json structure: {type(data)}")

    by_id = {f.get("id"): f for f in fights}

    touched: list[str] = []
    missing: list[str] = []

    # 1. Removals
    for fid, note in REMOVALS.items():
        entry = by_id.get(fid)
        if not entry:
            missing.append(fid)
            continue
        entry["hyperscaler"] = None
        entry["summary"] = append_note(entry.get("summary", ""), note)
        entry["last_updated"] = LAST_UPDATED
        touched.append(fid)

    # 2. Flags (retain hyperscaler, add caveat)
    for fid, note in FLAGS.items():
        entry = by_id.get(fid)
        if not entry:
            missing.append(fid)
            continue
        entry["summary"] = append_note(entry.get("summary", ""), note)
        entry["last_updated"] = LAST_UPDATED
        touched.append(fid)

    # 3. Seneca — change hyperscaler label + note
    entry = by_id.get(SENECA_ID)
    if entry:
        entry["hyperscaler"] = SENECA_NEW_HYPERSCALER
        entry["summary"] = append_note(entry.get("summary", ""), SENECA_NOTE)
        entry["last_updated"] = LAST_UPDATED
        touched.append(SENECA_ID)
    else:
        missing.append(SENECA_ID)

    # 4. Covington — company correction
    entry = by_id.get(COVINGTON_ID)
    if entry:
        key = find_company_field(entry)
        if key is None:
            # default to company if neither present
            key = "company"
        entry[key] = COVINGTON_NEW_COMPANY
        entry["last_updated"] = LAST_UPDATED
        touched.append(COVINGTON_ID)
    else:
        missing.append(COVINGTON_ID)

    # 5. Fredonia/Saukville — add Oracle
    entry = by_id.get(FREDONIA_ID)
    if entry:
        entry["hyperscaler"] = FREDONIA_NEW_HYPERSCALER
        entry["summary"] = append_note(entry.get("summary", ""), FREDONIA_NOTE)
        entry["last_updated"] = LAST_UPDATED
        touched.append(FREDONIA_ID)
    else:
        missing.append(FREDONIA_ID)

    # Write back
    out = wrapper if wrapper is not None else fights
    FIGHTS_PATH.write_text(json.dumps(out, indent=2, ensure_ascii=False) + "\n")

    print(f"Touched {len(touched)} entries.")
    if missing:
        print(f"MISSING ({len(missing)}): {missing}")


if __name__ == "__main__":
    main()
