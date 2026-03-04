#!/usr/bin/env node
/**
 * Build the master fights database from all sources.
 * Reads CSVs, enriches with geocoding, and outputs data/fights.json
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');

// Geocoding cache — hardcoded coordinates for all known jurisdictions
// (avoids needing an API key for geocoding)
const GEOCODE_CACHE = {
  "Cascade Locks Port Authority, OR": { lat: 45.6696, lng: -121.8910 },
  "DeKalb County, GA": { lat: 33.7712, lng: -84.2263 },
  "North Tonawanda, NY": { lat: 43.0387, lng: -78.8642 },
  "City of Atlanta, GA": { lat: 33.7490, lng: -84.3880 },
  "Fairfax County, VA": { lat: 38.8462, lng: -77.3064 },
  "City of Thorndale, TX": { lat: 30.6138, lng: -97.2053 },
  "City of Peculiar, MO": { lat: 38.7192, lng: -94.4577 },
  "Gilmer County, GA": { lat: 34.6932, lng: -84.4525 },
  "Milam County, TX": { lat: 30.7849, lng: -96.9766 },
  "Marshall County, IN": { lat: 41.3234, lng: -86.2700 },
  "Douglas County, GA": { lat: 33.7015, lng: -84.7477 },
  "Loudoun County, VA": { lat: 39.0768, lng: -77.6369 },
  "Coweta County, GA": { lat: 33.3518, lng: -84.7616 },
  "Henrico County, VA": { lat: 37.5438, lng: -77.3868 },
  "Town of Warrenton, VA": { lat: 38.7135, lng: -77.7953 },
  "City of St. Charles, MO": { lat: 38.7839, lng: -90.4812 },
  "Clayton County, GA": { lat: 33.5413, lng: -84.3588 },
  "Troup County, GA": { lat: 33.0335, lng: -85.0277 },
  "Prince George's County, MD": { lat: 38.8296, lng: -76.8453 },
  "City of LaGrange, GA": { lat: 33.0393, lng: -85.0322 },
  "Pike County, GA": { lat: 33.0910, lng: -84.3835 },
  "Lamar County, GA": { lat: 33.0735, lng: -84.1474 },
  "White County, IN": { lat: 40.7494, lng: -86.8647 },
  "Putnam County, IN": { lat: 39.6650, lng: -86.8647 },
  "Monroe County, GA": { lat: 33.0154, lng: -83.9177 },
  "Athens-Clarke County, GA": { lat: 33.9519, lng: -83.3576 },
};

function slugify(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function parseDate(dateStr) {
  // "Jul, 2023" -> "2023-07-01"
  const months = {
    'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04',
    'May': '05', 'Jun': '06', 'Jul': '07', 'Aug': '08',
    'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
  };
  const match = dateStr.match(/(\w{3}),?\s*(\d{4})/);
  if (match) {
    return `${match[2]}-${months[match[1]]}-01`;
  }
  return dateStr;
}

function mapActionType(type) {
  const mapping = {
    'Moratorium': 'moratorium',
    'Full ban': 'full_ban',
    'Full ban (removed from zoning)': 'full_ban',
    'Full crypto ban': 'full_ban',
    'Full moratorium': 'moratorium',
    'Cancellation': 'cancellation',
    'Restrictive zoning ordinance': 'zoning_restriction',
    'Permanent location-specific ban': 'full_ban',
    'Formal resolution opposing': 'resolution_opposing',
    'Location restriction': 'zoning_restriction',
    'Eliminated by-right development': 'zoning_restriction',
    'Provisional Use Permit requirement': 'zoning_restriction',
  };
  return mapping[type] || 'other';
}

function parseCSV(text) {
  const lines = text.trim().split('\n');
  const headers = parseCSVLine(lines[0]);
  return lines.slice(1).map(line => {
    const values = parseCSVLine(line);
    const obj = {};
    headers.forEach((h, i) => obj[h.trim()] = (values[i] || '').trim());
    return obj;
  });
}

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

function importBryce() {
  const csv = fs.readFileSync(path.join(DATA_DIR, 'bryce-rejections.csv'), 'utf-8');
  const rows = parseCSV(csv);

  return rows.map(row => {
    const geoKey = `${row.Jurisdiction}, ${row.State}`;
    const geo = GEOCODE_CACHE[geoKey] || { lat: 0, lng: 0 };
    const date = parseDate(row.Date);
    const id = slugify(`${row.Jurisdiction}-${row.State}-${date}`);

    return {
      id,
      jurisdiction: row.Jurisdiction,
      state: row.State,
      county: null,
      lat: geo.lat,
      lng: geo.lng,
      action_type: mapActionType(row.Type),
      date,
      status: 'active',
      company: null,
      project_name: null,
      investment_million_usd: null,
      megawatts: null,
      opposition_groups: [],
      summary: `${row.Jurisdiction}, ${row.State} enacted a ${row.Type.toLowerCase()} on data center development.`,
      sources: row.Link ? [row.Link] : [],
      data_source: 'bryce',
      last_updated: new Date().toISOString().split('T')[0],
    };
  });
}

// Main
const fights = [];

// Import Bryce data
const bryceData = importBryce();
fights.push(...bryceData);
console.log(`Imported ${bryceData.length} entries from Bryce CSV`);

// Sort by date
fights.sort((a, b) => a.date.localeCompare(b.date));

// Write output
fs.writeFileSync(
  path.join(DATA_DIR, 'fights.json'),
  JSON.stringify(fights, null, 2)
);
console.log(`Wrote ${fights.length} total entries to data/fights.json`);
