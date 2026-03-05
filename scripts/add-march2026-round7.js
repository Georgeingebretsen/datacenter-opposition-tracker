#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '..', 'data');
const fights = JSON.parse(fs.readFileSync(path.join(dataDir, 'fights.json'), 'utf8'));
const research = JSON.parse(fs.readFileSync(path.join(dataDir, 'new-fights-march2026-round7.json'), 'utf8'));

function makeId(jurisdiction, state, date) {
  const slug = jurisdiction.toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return `${slug}-${state.toLowerCase()}-${date}`;
}

const newEntries = research.new_entries || [];
let added = 0;
for (const entry of newEntries) {
  const id = makeId(entry.jurisdiction, entry.state, entry.date);

  if (fights.find(f => f.id === id)) {
    console.log(`  SKIP (exists): ${id}`);
    continue;
  }

  // Check for similar entries more carefully
  const jurisdBase = entry.jurisdiction.toLowerCase().split('(')[0].trim();
  const similar = fights.find(f =>
    f.state === entry.state &&
    f.jurisdiction.toLowerCase() === jurisdBase
  );
  if (similar) {
    console.log(`  SKIP (exact match): ${id} -> ${similar.id}`);
    continue;
  }

  // Normalize concerns
  const concernNorm = {
    'agriculture': 'agricultural_land',
    'local_control': 'process_fairness',
    'transparency': 'process_fairness',
    'cultural_heritage': 'community_character',
    'environmental_justice': 'environment',
  };
  const concerns = (entry.concerns || []).map(c => concernNorm[c] || c);
  // Deduplicate concerns
  const uniqueConcerns = [...new Set(concerns)];

  const fight = {
    id,
    jurisdiction: entry.jurisdiction,
    state: entry.state,
    lat: entry.lat,
    lng: entry.lng,
    action_type: entry.action_type,
    status: entry.status,
    date: entry.date,
    summary: entry.summary,
    sources: entry.sources || [],
    concerns: uniqueConcerns,
    opposition_groups: entry.opposition_groups || [],
    last_updated: new Date().toISOString().split('T')[0],
  };

  if (entry.company) fight.company = entry.company;
  if (entry.hyperscaler) fight.hyperscaler = entry.hyperscaler;
  if (entry.megawatts) fight.megawatts = entry.megawatts;
  if (entry.investment_million_usd) fight.investment_million_usd = entry.investment_million_usd;
  if (entry.acreage) fight.acreage = entry.acreage;

  fights.push(fight);
  added++;
  console.log(`  + ${entry.jurisdiction}, ${entry.state} (${entry.action_type})`);
}

console.log(`\nAdded ${added} new entries`);

// Apply updates - use fuzzy matching
const updates = research.updates || [];
let updated = 0;
for (const upd of updates) {
  // Try exact id match first
  let fight = fights.find(f => f.id === upd.id);
  // Try partial match
  if (fight == null) {
    fight = fights.find(f => f.id.startsWith(upd.id + '-') || f.id.includes(upd.id));
  }
  // Try jurisdiction+state
  if (fight == null && upd.id) {
    const parts = upd.id.split('-');
    const state = parts[parts.length - 1].toUpperCase();
    if (state.length === 2) {
      const jurisdPart = parts.slice(0, -1).join(' ');
      fight = fights.find(f =>
        f.state === state &&
        f.jurisdiction.toLowerCase().includes(jurisdPart.split(' ')[0])
      );
    }
  }

  if (fight == null) {
    console.log(`  WARNING: No match for id="${upd.id}"`);
    continue;
  }

  let fields = 0;

  if (upd.action === 'append_to_summary' && upd.new_value) {
    fight.summary = (fight.summary || '') + ' ' + upd.new_value;
    fields++;
  }
  if (upd.field === 'status' && upd.new_value && upd.new_value !== fight.status) {
    console.log(`  ${fight.jurisdiction}: ${fight.status} -> ${upd.new_value}`);
    fight.status = upd.new_value;
    fields++;
  }
  if (upd.notes) {
    fight.summary = (fight.summary || '') + ' ' + upd.notes;
    fields++;
  }

  if (fields > 0) {
    fight.last_updated = new Date().toISOString().split('T')[0];
    updated++;
    console.log(`  Updated: ${fight.jurisdiction}, ${fight.state}`);
  }
}

console.log(`Updated ${updated} existing entries`);

// Write
fs.writeFileSync(path.join(dataDir, 'fights.json'), JSON.stringify(fights, null, 2));
const siteDataDir = path.join(__dirname, '..', 'site', 'data');
if (fs.existsSync(siteDataDir) === false) fs.mkdirSync(siteDataDir, { recursive: true });
fs.writeFileSync(path.join(siteDataDir, 'fights.json'), JSON.stringify(fights));

console.log(`\nTotal fights: ${fights.length}`);
