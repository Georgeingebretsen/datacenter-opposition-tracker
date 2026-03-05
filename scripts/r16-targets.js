#!/usr/bin/env node
const fs = require('fs');
const f = JSON.parse(fs.readFileSync('data/fights.json', 'utf8'));

// Companies still missing (non-legislative)
const noCo = f.filter(x => x.company == null && x.action_type !== 'legislative_action')
  .sort((a, b) => (b.investment_million_usd || 0) - (a.investment_million_usd || 0))
  .slice(0, 25);
console.log('=== COMPANY TARGETS (25 of ' + f.filter(x => x.company == null && x.action_type !== 'legislative_action').length + ') ===');
noCo.forEach(x => console.log(x.id + ' | ' + x.jurisdiction + ', ' + x.state + ' | ' + (x.summary || '').substring(0, 80)));

// Groups still missing (non-legislative)
const noGr = f.filter(x => (x.opposition_groups == null || x.opposition_groups.length === 0) && x.action_type !== 'legislative_action')
  .slice(0, 25);
console.log('\n=== GROUPS TARGETS (25 of ' + f.filter(x => (x.opposition_groups == null || x.opposition_groups.length === 0) && x.action_type !== 'legislative_action').length + ') ===');
noGr.forEach(x => console.log(x.id + ' | ' + x.jurisdiction + ', ' + x.state));

// Social still missing (has groups but no social links)
const noSoc = f.filter(x => x.opposition_groups && x.opposition_groups.length > 0
  && x.opposition_facebook == null && x.opposition_website == null
  && x.opposition_twitter == null && x.opposition_instagram == null)
  .slice(0, 25);
console.log('\n=== SOCIAL TARGETS (25 of ' + f.filter(x => x.opposition_groups && x.opposition_groups.length > 0 && x.opposition_facebook == null && x.opposition_website == null && x.opposition_twitter == null && x.opposition_instagram == null).length + ') ===');
noSoc.forEach(x => console.log(x.id + ' | ' + x.jurisdiction + ', ' + x.state + ' | ' + (x.opposition_groups || []).slice(0, 2).join(', ')));

// MW still missing with company
const noMW = f.filter(x => x.company && x.megawatts == null)
  .sort((a, b) => (b.investment_million_usd || 0) - (a.investment_million_usd || 0))
  .slice(0, 25);
console.log('\n=== MW TARGETS (25 of ' + f.filter(x => x.company && x.megawatts == null).length + ') ===');
noMW.forEach(x => console.log(x.id + ' | ' + x.jurisdiction + ', ' + x.state + ' | ' + x.company));

// Investment still missing with company
const noInv = f.filter(x => x.company && x.investment_million_usd == null)
  .sort((a, b) => (b.megawatts || 0) - (a.megawatts || 0))
  .slice(0, 25);
console.log('\n=== INVESTMENT TARGETS (25 of ' + f.filter(x => x.company && x.investment_million_usd == null).length + ') ===');
noInv.forEach(x => console.log(x.id + ' | ' + x.jurisdiction + ', ' + x.state + ' | ' + x.company + ' | ' + (x.megawatts ? x.megawatts + 'MW' : 'no MW')));
