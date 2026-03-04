#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '..', 'data');
const fights = JSON.parse(fs.readFileSync(path.join(dataDir, 'fights.json'), 'utf8'));
const michigan = JSON.parse(fs.readFileSync(path.join(dataDir, 'new-michigan.json'), 'utf8'));

function makeId(jurisdiction, state, date) {
  const slug = jurisdiction.toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return `${slug}-${state.toLowerCase()}-${date}`;
}

// Add new entries
const newEntries = michigan.new_entries || [];
let added = 0;
for (const entry of newEntries) {
  const id = makeId(entry.jurisdiction, entry.state, entry.date);

  // Check for duplicate
  if (fights.find(f => f.id === id)) {
    console.log(`  SKIP (exists): ${id}`);
    continue;
  }

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
    concerns: entry.concerns || [],
    opposition_groups: entry.opposition_groups || [],
    last_updated: new Date().toISOString().split('T')[0],
  };

  if (entry.company) fight.company = entry.company;
  if (entry.hyperscaler) fight.hyperscaler = entry.hyperscaler;
  if (entry.megawatts) fight.megawatts = entry.megawatts;
  if (entry.opposition_facebook) fight.opposition_facebook = entry.opposition_facebook;
  if (entry.opposition_website) fight.opposition_website = entry.opposition_website;

  fights.push(fight);
  added++;
  console.log(`  + ${entry.jurisdiction}, ${entry.state} (${entry.action_type})`);
}

console.log(`\nAdded ${added} new Michigan entries`);

// Process updates for existing entries
const updates = michigan.updates || [];
let updated = 0;
for (const upd of updates) {
  // Find matching fight
  let fight = fights.find(f => f.id === upd.id);
  if (!fight) {
    // Try matching by jurisdiction
    fight = fights.find(f =>
      f.jurisdiction.toLowerCase() === (upd.jurisdiction || '').toLowerCase() && f.state === 'MI'
    );
  }
  if (!fight) {
    // Partial match
    fight = fights.find(f => f.state === 'MI' && f.jurisdiction.toLowerCase().includes((upd.jurisdiction || '').toLowerCase().split(' ')[0]));
  }

  if (!fight) {
    console.log(`  WARNING: No match for update "${upd.jurisdiction}"`);
    continue;
  }

  const u = upd.updates || upd;
  let fields = 0;

  if (u.opposition_groups && u.opposition_groups.length) {
    const existing = new Set((fight.opposition_groups || []).map(g => g.toLowerCase()));
    const newGroups = u.opposition_groups.filter(g => !existing.has(g.toLowerCase()));
    if (newGroups.length) {
      fight.opposition_groups = [...(fight.opposition_groups || []), ...newGroups];
      fields++;
    }
  }
  if (u.sources && u.sources.length) {
    const existing = new Set(fight.sources || []);
    const newSources = u.sources.filter(s => !existing.has(s));
    if (newSources.length) {
      fight.sources = [...(fight.sources || []), ...newSources];
      fields++;
    }
  }
  if (u.concerns && u.concerns.length) {
    const existing = new Set(fight.concerns || []);
    const newC = u.concerns.filter(c => !existing.has(c));
    if (newC.length) {
      fight.concerns = [...(fight.concerns || []), ...newC];
      fields++;
    }
  }
  if (u.company && !fight.company) { fight.company = u.company; fields++; }
  if (u.hyperscaler && !fight.hyperscaler) { fight.hyperscaler = u.hyperscaler; fields++; }
  if (u.opposition_facebook && !fight.opposition_facebook) { fight.opposition_facebook = u.opposition_facebook; fields++; }
  if (u.opposition_website && !fight.opposition_website) { fight.opposition_website = u.opposition_website; fields++; }
  if (u.summary && (!fight.summary || u.summary.length > fight.summary.length)) { fight.summary = u.summary; fields++; }

  if (fields > 0) {
    fight.last_updated = new Date().toISOString().split('T')[0];
    updated++;
    console.log(`  ~ Updated "${fight.jurisdiction}" — ${fields} fields`);
  }
}

console.log(`Updated ${updated} existing entries`);

// Write
fs.writeFileSync(path.join(dataDir, 'fights.json'), JSON.stringify(fights, null, 2));
const siteDataDir = path.join(__dirname, '..', 'site', 'data');
if (!fs.existsSync(siteDataDir)) fs.mkdirSync(siteDataDir, { recursive: true });
fs.writeFileSync(path.join(siteDataDir, 'fights.json'), JSON.stringify(fights));

console.log(`\nTotal fights: ${fights.length}`);
const miCount = fights.filter(f => f.state === 'MI').length;
console.log(`Michigan entries: ${miCount}`);
