#!/usr/bin/env node
const fs = require('fs');
const fights = JSON.parse(fs.readFileSync('data/fights.json', 'utf8'));

// MW gaps with company that we haven't researched yet (exclude ones agents already checked)
const researched = new Set([
  // specs3a, specs3b, specs4a already researched these
]);

const mwGaps = fights.filter(f =>
  f.megawatts == null &&
  f.company != null && f.company !== '' && f.company !== 'unknown' &&
  f.action_type !== 'legislative_action'
);
console.log('=== REMAINING MW GAPS WITH COMPANY (non-legislative):', mwGaps.length);
for (const f of mwGaps.slice(0, 40)) {
  console.log(`${f.id} | ${f.jurisdiction}, ${f.state} | ${f.company} | ${f.action_type}`);
}

// Entries with no summary or very short summary
const shortSummary = fights.filter(f => (f.summary || '').length < 50);
console.log('\n=== SHORT/MISSING SUMMARIES:', shortSummary.length);
for (const f of shortSummary.slice(0, 20)) {
  console.log(`${f.id} | ${f.jurisdiction}, ${f.state} | summary: "${(f.summary || '').substring(0, 40)}..."`);
}

// Statewide/legislative entries without bill numbers in summary
const legislative = fights.filter(f => f.action_type === 'legislative_action');
const legNoBill = legislative.filter(f => {
  const s = (f.summary || '').toLowerCase();
  return s.indexOf('hb ') === -1 && s.indexOf('sb ') === -1 && s.indexOf('ab ') === -1 && s.indexOf('bill') === -1;
});
console.log('\n=== LEGISLATIVE WITHOUT BILL NUMBERS:', legNoBill.length);
for (const f of legNoBill) {
  console.log(`${f.id} | ${f.jurisdiction}, ${f.state}`);
}

// High-value projects (has MW or investment) missing key data
const highValue = fights.filter(f =>
  (f.megawatts > 100 || f.investment_million_usd > 1000) &&
  (f.opposition_groups == null || f.opposition_groups.length === 0)
);
console.log('\n=== HIGH-VALUE PROJECTS WITHOUT GROUPS:', highValue.length);
for (const f of highValue) {
  console.log(`${f.id} | ${f.jurisdiction}, ${f.state} | ${f.megawatts || '?'} MW | $${f.investment_million_usd || '?'}M | ${f.company || 'unknown'}`);
}

// States with most entries
const stateCounts = {};
for (const f of fights) {
  stateCounts[f.state] = (stateCounts[f.state] || 0) + 1;
}
const sorted = Object.entries(stateCounts).sort((a, b) => b[1] - a[1]);
console.log('\n=== TOP STATES:');
for (const [state, count] of sorted.slice(0, 15)) {
  console.log(`${state}: ${count}`);
}
