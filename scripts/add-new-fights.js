#!/usr/bin/env node
/**
 * Add genuinely new fights from research and create enrichment for existing entries
 */
const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '..', 'data');
const fights = JSON.parse(fs.readFileSync(path.join(dataDir, 'fights.json'), 'utf8'));
const research = JSON.parse(fs.readFileSync(path.join(dataDir, 'new-fights-research.json'), 'utf8'));

// Helper to generate ID
function makeId(jurisdiction, state, date) {
  const slug = jurisdiction.toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return `${slug}-${state.toLowerCase()}-${date}`;
}

// Helper to geocode (rough US state centers - will need refinement)
const STATE_COORDS = {
  MI: { lat: 42.7, lng: -84.5 }, OH: { lat: 40.4, lng: -82.9 },
  PA: { lat: 40.9, lng: -77.8 }, NC: { lat: 35.6, lng: -79.0 },
  TX: { lat: 31.0, lng: -97.5 }, WI: { lat: 44.5, lng: -89.5 },
  DC: { lat: 38.9, lng: -77.0 }, SC: { lat: 34.0, lng: -81.0 },
  CO: { lat: 39.7, lng: -105.0 }, IA: { lat: 42.0, lng: -93.5 },
};

// More specific coords for known cities
const CITY_COORDS = {
  'City of Pontiac-MI': { lat: 42.6389, lng: -83.2910 },
  'Hubbard Township-OH': { lat: 41.1556, lng: -80.5729 },
  'Vienna Township-OH': { lat: 41.2356, lng: -80.6620 },
  'City of Oregon-OH': { lat: 41.6439, lng: -83.4272 },
  'Upper Macungie Township-PA': { lat: 40.5726, lng: -75.5713 },
  'Dickson City-PA': { lat: 41.4734, lng: -75.6118 },
  'Town of Tarboro-NC': { lat: 35.8968, lng: -77.5358 },
  'Town of Apex (Wake County)-NC': { lat: 35.7327, lng: -78.8503 },
  'Denver (Globeville/Elyria-Swansea CoreSite)-CO': { lat: 39.7817, lng: -104.9717 },
  'Mount Horeb-WI': { lat: 43.0083, lng: -89.7382 },
  'Sanders National Moratorium (federal)-DC': { lat: 38.9072, lng: -77.0369 },
  'South Carolina (Data Center Development Act)-SC': { lat: 34.0007, lng: -81.0348 },
  'City of Kings Mountain-NC': { lat: 35.2443, lng: -81.3413 },
  'Colleton County (ACE Basin)-SC': { lat: 32.8960, lng: -80.6418 },
};

function getCoords(jurisdiction, state) {
  const key = `${jurisdiction}-${state}`;
  if (CITY_COORDS[key]) return CITY_COORDS[key];
  return STATE_COORDS[state] || { lat: 39.0, lng: -96.0 };
}

// Check which entries are already in the database
const existingJurisdictions = new Set(fights.map(f => `${f.jurisdiction}|${f.state}`.toLowerCase()));

// Genuinely new fights to add
const NEW_FIGHT_JURISDICTIONS = [
  'City of Pontiac',
  'Hubbard Township',
  'Vienna Township',
  'City of Oregon',
  'Upper Macungie Township',
  'Dickson City',
  'Town of Tarboro',
  'Town of Apex (Wake County)',
  'Sanders National Moratorium (federal)',
  'South Carolina (Data Center Development Act)',
  'City of Kings Mountain',
];

// Entries that are updates to existing fights
const enrichmentUpdates = [];
const newFights = [];

for (const entry of research) {
  const key = `${entry.jurisdiction}|${entry.state}`.toLowerCase();

  if (NEW_FIGHT_JURISDICTIONS.includes(entry.jurisdiction)) {
    // This is a genuinely new fight
    const coords = getCoords(entry.jurisdiction, entry.state);
    const id = makeId(entry.jurisdiction, entry.state, entry.date);

    const newFight = {
      id,
      jurisdiction: entry.jurisdiction,
      state: entry.state,
      lat: coords.lat,
      lng: coords.lng,
      action_type: entry.action_type,
      status: entry.status,
      date: entry.date,
      summary: entry.summary,
      sources: entry.sources || [],
      concerns: entry.concerns || [],
      opposition_groups: entry.opposition_groups || [],
      last_updated: new Date().toISOString().split('T')[0],
    };

    if (entry.company) newFight.company = entry.company;
    if (entry.hyperscaler) newFight.hyperscaler = entry.hyperscaler;
    if (entry.megawatts) newFight.megawatts = entry.megawatts;
    if (entry.investment_million_usd) newFight.investment_million_usd = entry.investment_million_usd;
    if (entry.opposition_facebook) newFight.opposition_facebook = entry.opposition_facebook;

    // Check for scope
    if (entry.jurisdiction.includes('statewide') || entry.jurisdiction.includes('Statewide') ||
        entry.jurisdiction.includes('federal') || entry.jurisdiction.includes('Data Center Development Act')) {
      newFight.scope = 'statewide';
    }

    newFights.push(newFight);
  } else {
    // This is an update to an existing fight - create enrichment
    // Find the matching fight
    const match = fights.find(f => {
      const fKey = `${f.jurisdiction}|${f.state}`.toLowerCase();
      return fKey === key || f.jurisdiction.toLowerCase().includes(entry.jurisdiction.toLowerCase().split(' (')[0].split(' ').slice(0,2).join(' '));
    });

    if (match) {
      const updates = {};
      if (entry.opposition_groups && entry.opposition_groups.length > 0) {
        updates.opposition_groups = entry.opposition_groups;
      }
      if (entry.company && !match.company) updates.company = entry.company;
      if (entry.hyperscaler && !match.hyperscaler) updates.hyperscaler = entry.hyperscaler;
      if (entry.megawatts && !match.megawatts) updates.megawatts = entry.megawatts;
      if (entry.opposition_facebook) updates.opposition_facebook = entry.opposition_facebook;
      if (entry.sources && entry.sources.length > 0) updates.sources = entry.sources;
      if (entry.concerns && entry.concerns.length > 0) updates.concerns = entry.concerns;
      // Update summary if the new one is longer
      if (entry.summary && (!match.summary || entry.summary.length > match.summary.length)) {
        updates.summary = entry.summary;
      }

      if (Object.keys(updates).length > 0) {
        enrichmentUpdates.push({
          id: match.id,
          jurisdiction: match.jurisdiction,
          state: match.state,
          updates,
        });
      }
    } else {
      console.log(`  No match found for "${entry.jurisdiction}, ${entry.state}" — treating as new`);
      // Add as new if no match
      const coords = getCoords(entry.jurisdiction, entry.state);
      const id = makeId(entry.jurisdiction, entry.state, entry.date);
      const newFight = {
        id,
        jurisdiction: entry.jurisdiction,
        state: entry.state,
        lat: coords.lat, lng: coords.lng,
        action_type: entry.action_type,
        status: entry.status,
        date: entry.date,
        summary: entry.summary,
        sources: entry.sources || [],
        concerns: entry.concerns || [],
        opposition_groups: entry.opposition_groups || [],
        last_updated: new Date().toISOString().split('T')[0],
      };
      if (entry.company) newFight.company = entry.company;
      if (entry.hyperscaler) newFight.hyperscaler = entry.hyperscaler;
      if (entry.megawatts) newFight.megawatts = entry.megawatts;
      if (entry.investment_million_usd) newFight.investment_million_usd = entry.investment_million_usd;
      if (entry.opposition_facebook) newFight.opposition_facebook = entry.opposition_facebook;
      newFights.push(newFight);
    }
  }
}

console.log(`\n=== NEW FIGHTS TO ADD: ${newFights.length} ===`);
newFights.forEach(f => console.log(`  + ${f.jurisdiction}, ${f.state} (${f.action_type})`));

console.log(`\n=== ENRICHMENT UPDATES: ${enrichmentUpdates.length} ===`);
enrichmentUpdates.forEach(e => console.log(`  ~ ${e.jurisdiction}, ${e.state} — ${Object.keys(e.updates).join(', ')}`));

// Add new fights
fights.push(...newFights);

// Write enrichment file
fs.writeFileSync(
  path.join(dataDir, 'enrichment-newresearch.json'),
  JSON.stringify(enrichmentUpdates, null, 2)
);

// Write updated fights
fs.writeFileSync(path.join(dataDir, 'fights.json'), JSON.stringify(fights, null, 2));

// Copy to site
const siteDataDir = path.join(__dirname, '..', 'site', 'data');
if (!fs.existsSync(siteDataDir)) fs.mkdirSync(siteDataDir, { recursive: true });
fs.writeFileSync(path.join(siteDataDir, 'fights.json'), JSON.stringify(fights));

console.log(`\nTotal fights: ${fights.length}`);
console.log('Enrichment file written: enrichment-newresearch.json');
console.log('Run apply-enrichments.js to merge enrichment updates');
