#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '..', 'data');
const fights = JSON.parse(fs.readFileSync(path.join(dataDir, 'fights.json'), 'utf8'));
const research = JSON.parse(fs.readFileSync(path.join(dataDir, 'new-fights-petitions-round3.json'), 'utf8'));

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

  const similar = fights.find(f =>
    f.state === entry.state &&
    f.jurisdiction.toLowerCase() === entry.jurisdiction.toLowerCase()
  );
  if (similar) {
    console.log(`  SKIP (similar exists): ${id} -> ${similar.id}`);
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
  if (entry.investment_million_usd) fight.investment_million_usd = entry.investment_million_usd;
  if (entry.acreage) fight.acreage = entry.acreage;
  if (entry.building_sq_ft) fight.building_sq_ft = entry.building_sq_ft;
  if (entry.jobs_promised) fight.jobs_promised = entry.jobs_promised;
  if (entry.petition_url) fight.petition_url = entry.petition_url;
  if (entry.petition_signatures) fight.petition_signatures = entry.petition_signatures;
  if (entry.project_name) fight.project_name = entry.project_name;

  fights.push(fight);
  added++;
  console.log(`  + ${entry.jurisdiction}, ${entry.state} (${entry.action_type}) - ${entry.petition_signatures || 0} sigs`);
}

console.log(`\nAdded ${added} new entries`);

// Write
fs.writeFileSync(path.join(dataDir, 'fights.json'), JSON.stringify(fights, null, 2));
const siteDataDir = path.join(__dirname, '..', 'site', 'data');
if (fs.existsSync(siteDataDir) === false) fs.mkdirSync(siteDataDir, { recursive: true });
fs.writeFileSync(path.join(siteDataDir, 'fights.json'), JSON.stringify(fights));

console.log(`Total fights: ${fights.length}`);
