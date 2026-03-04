#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '..', 'data');
const fights = JSON.parse(fs.readFileSync(path.join(dataDir, 'fights.json'), 'utf8'));

let fixed = 0;
for (const fight of fights) {
  if (fight.opposition_groups && fight.opposition_groups.length > 1) {
    const seen = new Set();
    const deduped = [];
    for (const g of fight.opposition_groups) {
      const key = g.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (seen.has(key)) {
        fixed++;
        continue;
      }
      seen.add(key);
      deduped.push(g);
    }
    fight.opposition_groups = deduped;
  }
}

fs.writeFileSync(path.join(dataDir, 'fights.json'), JSON.stringify(fights, null, 2));
const siteDataDir = path.join(__dirname, '..', 'site', 'data');
fs.writeFileSync(path.join(siteDataDir, 'fights.json'), JSON.stringify(fights));
console.log(`Fixed ${fixed} duplicate group entries across ${fights.length} fights`);
