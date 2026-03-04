#!/usr/bin/env node
const fs = require('fs');
const fights = JSON.parse(fs.readFileSync('data/fights.json', 'utf8'));

const updates = [
  { match: 'fredonia', status: 'approved', company: 'Vantage Data Centers', hyperscaler: 'OpenAI', note: 'Under construction, Stargate/Lighthouse campus' },
  { match: 'amarillo', status: 'approved', note: 'TCEQ granted Clean Air permit Feb 2026' },
  { match: 'abilene-tx-2025', status: 'approved', note: 'Phase 1 operational, Phase 2 underway' },
  { match: 'kenosha', status: 'approved', note: 'Rezoning approved Dec 2024' },
  { match: 'laramie', status: 'approved', note: 'Commissioners unanimously approved Jan 2026' },
  { match: 'toronto-sd', status: 'delayed', note: 'Tax exemption bill killed, project stalled' },
  { match: 'saline-township', status: 'approved', note: 'Township settlement approved, DTE contracts approved' },
  { match: 'milam-county-tx', status: 'approved', note: 'Ground broken on Stargate campus' },
];

for (const u of updates) {
  const fight = fights.find(f => f.id && f.id.includes(u.match));
  if (!fight) { console.log('NOT FOUND: ' + u.match); continue; }

  if (u.status && fight.status !== u.status) {
    console.log(`${fight.jurisdiction}: ${fight.status} -> ${u.status} (${u.note})`);
    fight.status = u.status;
    fight.last_updated = new Date().toISOString().split('T')[0];
  }
  if (u.company && !fight.company) fight.company = u.company;
  if (u.hyperscaler && !fight.hyperscaler) fight.hyperscaler = u.hyperscaler;
}

fs.writeFileSync('data/fights.json', JSON.stringify(fights, null, 2));
fs.writeFileSync('site/data/fights.json', JSON.stringify(fights));
console.log('Done. Total: ' + fights.length);
