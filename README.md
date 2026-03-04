# US Datacenter Fights

An interactive map and open database tracking grassroots opposition to datacenter development across the United States.

**345+ fights tracked across 50 states.**

## What's in here

- **`site/`** — Static website with Leaflet.js map, filterable table, dark mode, CSV/JSON export
- **`data/fights.json`** — The complete database (345 entries with coordinates, opposition groups, sources, specs)
- **`scripts/`** — Data processing and enrichment pipeline
- **`data/enrichment-*.json`** — Research artifacts documenting how data was gathered and enriched

## Data fields

Each fight entry includes:

| Field | Description |
|-------|-------------|
| `jurisdiction` | City, county, or township name |
| `state` | US state abbreviation |
| `lat` / `lng` | Coordinates for mapping |
| `action_type` | moratorium, full_ban, zoning_restriction, cancellation, permit_denial, lawsuit, protest, petition, etc. |
| `status` | active, approved, defeated, delayed, etc. |
| `date` | When the fight began or the action was taken |
| `summary` | Description of the opposition |
| `concerns` | Water, noise, electricity rates, air quality, property values, etc. |
| `opposition_groups` | Named community groups fighting the project |
| `sources` | URLs to news articles and primary sources |
| `company` | Developer or operator |
| `hyperscaler` | End customer (AWS, Google, Microsoft, Meta, etc.) |
| `megawatts` | Planned facility capacity |
| `investment_million` | Reported project investment |

## Running locally

```bash
npm run build    # merge data files
npx serve site   # serve at localhost:3000
```

## Deployment

Configured for Netlify — push to `main` and it builds automatically.

## Data sources

Compiled from [Data Center Watch](https://www.datacenterwatch.org/), [Robert Bryce's reporting](https://robertbryce.substack.com/), [FracTracker Alliance](https://www.fractracker.org/), Change.org petitions, local news coverage, and direct research.

## Contributing

Know of a datacenter fight not listed? Have corrections or updates? Open an issue or submit a PR. The main data file is `data/fights.json`.

## License

MIT
