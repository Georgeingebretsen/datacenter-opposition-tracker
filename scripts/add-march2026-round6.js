#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '..', 'data');
const fights = JSON.parse(fs.readFileSync(path.join(dataDir, 'fights.json'), 'utf8'));
const research = JSON.parse(fs.readFileSync(path.join(dataDir, 'new-fights-march2026-round6.json'), 'utf8'));

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

  // Check for similar entries (same jurisdiction base + state)
  const jurisdBase = entry.jurisdiction.toLowerCase().split('(')[0].trim();
  const similar = fights.find(f =>
    f.state === entry.state &&
    f.jurisdiction.toLowerCase().includes(jurisdBase)
  );
  if (similar) {
    console.log(`  SKIP (similar exists): ${id} -> ${similar.id}`);
    continue;
  }

  // Normalize action_type
  let actionType = entry.action_type;
  const actionNorm = {
    'regulatory_bypass': 'other',
    'zoning_denied': 'permit_denial',
    'legislation': 'legislative_action',
    'zoning_appeal': 'zoning_restriction',
  };
  if (actionNorm[actionType]) actionType = actionNorm[actionType];

  // Normalize status
  let status = entry.status;
  const statusNorm = {
    'bypassed': 'approved',
    'active_lawsuit': 'active',
    'construction_underway': 'approved',
    'appealed_to_council': 'active',
    'moratoria_requested': 'pending',
  };
  if (statusNorm[status]) status = statusNorm[status];

  // Normalize concerns
  const concernNorm = {
    'agriculture': 'agricultural_land',
    'local_control': 'process_fairness',
  };
  const concerns = (entry.concerns || []).map(c => concernNorm[c] || c);

  const fight = {
    id,
    jurisdiction: entry.jurisdiction,
    state: entry.state,
    lat: entry.lat,
    lng: entry.lng,
    action_type: actionType,
    status: status,
    date: entry.date,
    summary: entry.summary,
    sources: entry.sources || [],
    concerns: concerns,
    opposition_groups: entry.opposition_groups || [],
    last_updated: new Date().toISOString().split('T')[0],
  };

  if (entry.company) fight.company = entry.company;
  if (entry.hyperscaler) fight.hyperscaler = entry.hyperscaler;
  if (entry.megawatts) fight.megawatts = entry.megawatts;
  if (entry.investment_million_usd) fight.investment_million_usd = entry.investment_million_usd;
  if (entry.acreage) fight.acreage = entry.acreage;
  if (entry.building_sq_ft) fight.building_sq_ft = entry.building_sq_ft;
  if (entry.jobs_promised) fight.jobs_promised = entry.jobs_promised;
  if (entry.project_name) fight.project_name = entry.project_name;

  fights.push(fight);
  added++;
  console.log(`  + ${entry.jurisdiction}, ${entry.state} (${actionType})`);
}

console.log(`\nAdded ${added} new entries`);

// Apply updates
const updates = research.updates || [];
let updated = 0;
for (const upd of updates) {
  const fight = fights.find(f => f.id === upd.id);
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
    console.log(`  Updated: ${fight.jurisdiction}, ${fight.state} (${fields} fields)`);
  }
}

console.log(`Updated ${updated} existing entries`);

// Write
fs.writeFileSync(path.join(dataDir, 'fights.json'), JSON.stringify(fights, null, 2));
const siteDataDir = path.join(__dirname, '..', 'site', 'data');
if (fs.existsSync(siteDataDir) === false) fs.mkdirSync(siteDataDir, { recursive: true });
fs.writeFileSync(path.join(siteDataDir, 'fights.json'), JSON.stringify(fights));

console.log(`\nTotal fights: ${fights.length}`);
