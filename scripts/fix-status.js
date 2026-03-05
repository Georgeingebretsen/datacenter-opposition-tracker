#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '..', 'data');
const fixes = JSON.parse(fs.readFileSync(path.join(dataDir, 'enrichment-status-fix.json'), 'utf8'));
const fights = JSON.parse(fs.readFileSync(path.join(dataDir, 'fights.json'), 'utf8'));

let fixed = 0;
for (const fix of fixes) {
  const f = fights.find(x => x.id === fix.id);
  if (f && f.status !== fix.status) {
    f.status = fix.status;
    f.last_updated = '2026-03-04';
    fixed++;
  }
}

fs.writeFileSync(path.join(dataDir, 'fights.json'), JSON.stringify(fights, null, 2));
const siteDataDir = path.join(__dirname, '..', 'site', 'data');
if (fs.existsSync(siteDataDir) === false) fs.mkdirSync(siteDataDir, { recursive: true });
fs.writeFileSync(path.join(siteDataDir, 'fights.json'), JSON.stringify(fights));

console.log('Fixed ' + fixed + ' status values');

const byStatus = {};
fights.forEach(x => { byStatus[x.status] = (byStatus[x.status] || 0) + 1; });
Object.entries(byStatus).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => console.log('  ' + k + ': ' + v));
