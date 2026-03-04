#!/usr/bin/env node
const fs = require('fs');
const fights = JSON.parse(fs.readFileSync('data/fights.json', 'utf8'));

// MW gaps with known company (best targets for MW research)
const mwGapsWithCompany = fights.filter(f =>
  f.megawatts == null &&
  f.company != null && f.company !== '' && f.company !== 'unknown' &&
  f.action_type !== 'legislative_action'
);
console.log('=== MW GAPS WITH COMPANY (non-legislative):', mwGapsWithCompany.length);
for (const f of mwGapsWithCompany) {
  console.log(`${f.id} | ${f.jurisdiction}, ${f.state} | ${f.company} | ${f.action_type}`);
}

// Entries with groups but no FB/website (good for social media research)
const groupsNoSocial = fights.filter(f =>
  f.opposition_groups && f.opposition_groups.length > 0 &&
  f.opposition_facebook == null && f.opposition_website == null &&
  f.petition_url == null
);
console.log('\n=== GROUPS BUT NO FB/WEBSITE/PETITION:', groupsNoSocial.length);
for (const f of groupsNoSocial) {
  const groups = f.opposition_groups.join('; ');
  console.log(`${f.id} | ${f.jurisdiction}, ${f.state} | ${groups}`);
}

// Status check candidates (active fights from 2025+ that may have updates)
const activeOld = fights.filter(f =>
  f.status === 'active' &&
  f.last_updated != null &&
  f.last_updated < '2026-03-01'
);
console.log('\n=== ACTIVE FIGHTS WITH STALE UPDATES:', activeOld.length);
for (const f of activeOld.slice(0, 30)) {
  console.log(`${f.id} | ${f.jurisdiction}, ${f.state} | last_updated: ${f.last_updated}`);
}

// Investment gaps with known MW (can estimate from MW)
const mwNoInvestment = fights.filter(f =>
  f.megawatts != null && f.megawatts > 0 &&
  f.investment_million_usd == null
);
console.log('\n=== HAS MW BUT NO INVESTMENT:', mwNoInvestment.length);
for (const f of mwNoInvestment) {
  console.log(`${f.id} | ${f.jurisdiction}, ${f.state} | ${f.megawatts} MW | ${f.company || 'unknown'}`);
}
