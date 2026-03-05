#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const dataDir = path.join(__dirname, '..', 'data');
const fights = JSON.parse(fs.readFileSync(path.join(dataDir, 'fights.json'), 'utf8'));

const fixes = [
  {
    id: 'sedgwick-county-ks-2026-01-15',
    notes: 'Sedgwick County Commission unanimously extended data center permit moratorium to June 11, 2026. State Senator Chase Blasi (Senate majority leader) asked for a three-year moratorium. Town hall scheduled for March 31. Planning department studying zoning protocols.'
  },
  {
    id: 'hood-county-tx-2026-02-10',
    append: 'Hood County commissioners rejected the moratorium a second time on Feb 25, 2026, in a 3-2 vote. Instead, they voted to seek an opinion from TX Attorney General Ken Paxton on whether counties have authority to enact development moratoriums. State Sen. Paul Bettencourt warned counties lack constitutional authority for moratoriums. Residents called for commissioner resignations after the second defeat.'
  },
  {
    id: 'hays-county-tx-2026-02-17',
    append: 'Hays County Judge Ruben Becerra proposed a moratorium on permits for large industrial water users (>20,000 gal/day) but the Commissioners Court tabled it on Feb 25 after county attorneys warned it would trigger a lawsuit the county would lose. State Sen. Bettencourt warned counties lack authority for moratoriums. Water advocates have identified 5 potential data center developments in the region and continue organizing.'
  },
  {
    id: 'wilmington-oh-2025-11-26',
    notes: 'Wilmington City Council approved annexation and rezoning of ~545 acres for AWS despite continued opposition. However, separate site-plan, utility, and tax-incentive reviews are still required before construction. The site plan was tabled after city staff identified missing details on water service demands, cooling methods, noise mitigation, and pollution -- which AWS called \'proprietary information.\''
  }
];

let updated = 0;
for (const fix of fixes) {
  const fight = fights.find(f => f.id === fix.id);
  if (fight == null) {
    console.log(`WARNING: No match for ${fix.id}`);
    continue;
  }
  if (fix.append) {
    fight.summary = (fight.summary || '') + ' ' + fix.append;
  }
  if (fix.notes) {
    fight.summary = (fight.summary || '') + ' ' + fix.notes;
  }
  fight.last_updated = new Date().toISOString().split('T')[0];
  updated++;
  console.log(`Updated: ${fight.jurisdiction}, ${fight.state}`);
}

console.log(`\nFixed ${updated} entries`);
fs.writeFileSync(path.join(dataDir, 'fights.json'), JSON.stringify(fights, null, 2));
const siteDataDir = path.join(__dirname, '..', 'site', 'data');
fs.writeFileSync(path.join(siteDataDir, 'fights.json'), JSON.stringify(fights));
