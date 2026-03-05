#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const dataDir = path.join(__dirname, '..', 'data');
const fights = JSON.parse(fs.readFileSync(path.join(dataDir, 'fights.json'), 'utf8'));

const fixes = [
  { id: 'newport-news-va-2025-12-01', petition_url: 'https://www.change.org/p/raise-awareness-about-the-potential-data-center-in-newport-news', petition_signatures: 4292 },
  { id: 'claremore-ok-2026-01-15', petition_url: 'https://www.change.org/p/ban-ai-data-centers-in-rogers-county-permanently', petition_signatures: 1273 },
  { id: 'cumberland-county-nc-2025-11-01', petition_url: 'https://www.change.org/p/stop-data-centers-in-cumberland-county-protect-fayetteville-s-health-and-water', petition_signatures: 1457 },
  { id: 'college-station-tx-2025-09-12', petition_url: 'https://www.change.org/p/stop-college-station-land-sale-for-crypto-mine', petition_signatures: 5976 },
  { id: 'lawrence-county-oh-2025-12-01', petition_url: 'https://www.change.org/p/stop-the-ai-data-centers-in-lawrence-county-ohio', petition_signatures: 5295 },
  { id: 'lufkin-tx-2025-11-01', petition_url: 'https://www.change.org/p/stop-ai-data-center-lufkin-tx', petition_signatures: 2619 },
  { id: 'urbana-oh-2026-03-04', petition_url: 'https://www.change.org/p/no-data-centers-in-champaign-county-ohio', petition_signatures: 4493 },
  { id: 'charles-city-county-va-2025-08-01', opposition_facebook: 'https://www.facebook.com/groups/charlescitycitizensfirst', opposition_website: 'https://charlescitycitizensfirst.org' },
];

let updated = 0;
for (const fix of fixes) {
  const fight = fights.find(f => f.id === fix.id);
  if (fight == null) {
    console.log(`WARNING: No match for ${fix.id}`);
    continue;
  }
  let fields = 0;
  if (fix.petition_url && fight.petition_url == null) { fight.petition_url = fix.petition_url; fields++; }
  if (fix.petition_signatures && (fight.petition_signatures == null || fix.petition_signatures > fight.petition_signatures)) { fight.petition_signatures = fix.petition_signatures; fields++; }
  if (fix.opposition_facebook && fight.opposition_facebook == null) { fight.opposition_facebook = fix.opposition_facebook; fields++; }
  if (fix.opposition_website && fight.opposition_website == null) { fight.opposition_website = fix.opposition_website; fields++; }
  if (fields > 0) {
    fight.last_updated = new Date().toISOString().split('T')[0];
    updated++;
    console.log(`Updated: ${fight.jurisdiction}, ${fight.state} (${fields} fields)`);
  } else {
    console.log(`No new data for: ${fight.jurisdiction}, ${fight.state}`);
  }
}

console.log(`\nFixed ${updated} entries`);
fs.writeFileSync(path.join(dataDir, 'fights.json'), JSON.stringify(fights, null, 2));
const siteDataDir = path.join(__dirname, '..', 'site', 'data');
fs.writeFileSync(path.join(siteDataDir, 'fights.json'), JSON.stringify(fights));
