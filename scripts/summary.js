#!/usr/bin/env node
const fs = require('fs');
const fights = JSON.parse(fs.readFileSync('data/fights.json', 'utf8'));

const noGroups = fights.filter(f => f.opposition_groups == null || f.opposition_groups.length === 0);
const noMW = fights.filter(f => f.megawatts == null);
const noCompany = fights.filter(f => f.company == null || f.company === '' || f.company === 'unknown');
const noHyperscaler = fights.filter(f => f.hyperscaler == null && f.company != null && f.company !== 'unknown' && f.company !== '');
const withGroupsNoFB = fights.filter(f => f.opposition_groups && f.opposition_groups.length > 0 && (f.opposition_facebook == null && f.opposition_website == null));
const hasMW = fights.filter(f => f.megawatts != null);
const hasCompany = fights.filter(f => f.company != null && f.company !== '' && f.company !== 'unknown');
const hasHyperscaler = fights.filter(f => f.hyperscaler != null);
const hasInvestment = fights.filter(f => f.investment_million_usd != null);
const hasGroups = fights.filter(f => f.opposition_groups && f.opposition_groups.length > 0);

console.log('=== DATABASE SUMMARY ===');
console.log('Total fights:', fights.length);
console.log('');
console.log('=== COVERAGE ===');
console.log('Has company:', hasCompany.length, '(' + Math.round(hasCompany.length / fights.length * 100) + '%)');
console.log('Has MW:', hasMW.length, '(' + Math.round(hasMW.length / fights.length * 100) + '%)');
console.log('Has hyperscaler:', hasHyperscaler.length, '(' + Math.round(hasHyperscaler.length / fights.length * 100) + '%)');
console.log('Has investment:', hasInvestment.length, '(' + Math.round(hasInvestment.length / fights.length * 100) + '%)');
console.log('Has groups:', hasGroups.length, '(' + Math.round(hasGroups.length / fights.length * 100) + '%)');
console.log('');
console.log('=== GAPS ===');
console.log('Missing groups:', noGroups.length);
console.log('Missing MW:', noMW.length);
console.log('Missing company:', noCompany.length);
console.log('Has company but no hyperscaler:', noHyperscaler.length);
console.log('Has groups but no FB/website:', withGroupsNoFB.length);

// Total investment tracked
const totalInvestment = fights.reduce((sum, f) => sum + (f.investment_million_usd || 0), 0);
console.log('');
console.log('=== TOTALS ===');
console.log('Total investment tracked: $' + Math.round(totalInvestment / 1000) + 'B');
const totalMW = fights.reduce((sum, f) => sum + (f.megawatts || 0), 0);
console.log('Total MW tracked:', totalMW.toLocaleString(), 'MW (' + Math.round(totalMW / 1000) + ' GW)');
