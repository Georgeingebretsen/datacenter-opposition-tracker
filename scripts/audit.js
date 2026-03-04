#!/usr/bin/env node
const fights = JSON.parse(require('fs').readFileSync('data/fights.json','utf8'));
const total = fights.length;

const noOppGroups = fights.filter(f => !f.opposition_groups || f.opposition_groups.length === 0);
const noSummary = fights.filter(f => !f.summary || f.summary === '');
const noSources = fights.filter(f => !f.sources || f.sources.length === 0);
const noMW = fights.filter(f => f.megawatts == null);
const noCompany = fights.filter(f => !f.company || f.company === '');
const noHyperscaler = fights.filter(f => !f.hyperscaler || f.hyperscaler === '');

const hasGroups = fights.filter(f => f.opposition_groups && f.opposition_groups.length > 0);
const hasGroupsNoFB = hasGroups.filter(f => !f.opposition_facebook || f.opposition_facebook === '');

const noSocial = fights.filter(f =>
  (!f.opposition_facebook || f.opposition_facebook === '') &&
  (!f.opposition_instagram || f.opposition_instagram === '') &&
  (!f.opposition_twitter || f.opposition_twitter === '') &&
  (!f.opposition_website || f.opposition_website === '')
);

const statewide = fights.filter(f => f.scope === 'statewide' || f.jurisdiction === 'Statewide');
const local = fights.filter(f => f.scope !== 'statewide' && f.jurisdiction !== 'Statewide');

console.log('=== DATABASE HEALTH AUDIT ===');
console.log('Total entries:', total, '('+local.length+' local, '+statewide.length+' statewide)');
console.log('');
console.log('GAPS (local entries only):');
const noOppLocal = noOppGroups.filter(f => f.scope !== 'statewide' && f.jurisdiction !== 'Statewide');
const noSumLocal = noSummary.filter(f => f.scope !== 'statewide' && f.jurisdiction !== 'Statewide');
const noSrcLocal = noSources.filter(f => f.scope !== 'statewide' && f.jurisdiction !== 'Statewide');
const noMWLocal = noMW.filter(f => f.scope !== 'statewide' && f.jurisdiction !== 'Statewide');
const noCmpLocal = noCompany.filter(f => f.scope !== 'statewide' && f.jurisdiction !== 'Statewide');

console.log('  No opposition groups:', noOppLocal.length, '/' + local.length);
console.log('  No summary:', noSumLocal.length, '/' + local.length);
console.log('  No sources:', noSrcLocal.length, '/' + local.length);
console.log('  No megawatts:', noMWLocal.length, '/' + local.length);
console.log('  No company:', noCmpLocal.length, '/' + local.length);
console.log('  No hyperscaler:', noHyperscaler.length, '/' + total);
console.log('');
console.log('SOCIAL (local entries only):');
const hasGroupsNoFBLocal = hasGroupsNoFB.filter(f => f.scope !== 'statewide' && f.jurisdiction !== 'Statewide');
const noSocialLocal = noSocial.filter(f => f.scope !== 'statewide' && f.jurisdiction !== 'Statewide');
console.log('  Has groups but no Facebook:', hasGroupsNoFBLocal.length);
console.log('  No social links at all:', noSocialLocal.length);
console.log('');

console.log('=== HAS GROUPS, NO FACEBOOK (local) ===');
hasGroupsNoFBLocal.forEach(f => {
  console.log('  ' + f.id + ' | ' + f.jurisdiction + ', ' + f.state + ' | Groups: ' + (f.opposition_groups || []).join('; '));
});

console.log('');
console.log('=== NO OPPOSITION GROUPS (local, first 40) ===');
noOppLocal.slice(0,40).forEach(f => {
  console.log('  ' + f.id + ' | ' + f.jurisdiction + ', ' + f.state + ' | ' + (f.action_type || '?') + ' | ' + (f.company || 'unknown'));
});
if (noOppLocal.length > 40) console.log('  ... and ' + (noOppLocal.length - 40) + ' more');

console.log('');
console.log('=== HIGH-VALUE GAPS (>500MW or >$1B, missing key data) ===');
const bigProjects = local.filter(f => (f.megawatts && f.megawatts >= 500) || (f.investment_million_usd && f.investment_million_usd >= 1000));
bigProjects.forEach(f => {
  const gaps = [];
  if (!f.opposition_groups || f.opposition_groups.length === 0) gaps.push('no_groups');
  if (!f.opposition_facebook) gaps.push('no_fb');
  if (!f.summary) gaps.push('no_summary');
  if (!f.sources || f.sources.length === 0) gaps.push('no_sources');
  if (gaps.length > 0) {
    console.log('  ' + f.jurisdiction + ', ' + f.state + ' | ' + (f.megawatts ? f.megawatts+'MW' : '') + ' ' + (f.investment_million_usd ? '$'+f.investment_million_usd+'M' : '') + ' | GAPS: ' + gaps.join(', '));
  }
});
