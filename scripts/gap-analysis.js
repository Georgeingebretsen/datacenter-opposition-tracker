#!/usr/bin/env node
const fights = JSON.parse(require('fs').readFileSync('data/fights.json','utf8'));
const local = fights.filter(f => f.lat && f.lng);

// Missing groups
const noGroups = local.filter(f => {
  return f.opposition_groups == null || f.opposition_groups.length === 0;
});
const batch1 = noGroups.filter(f => f.state <= 'M');
const batch2 = noGroups.filter(f => f.state > 'M');

console.log('=== MISSING GROUPS BATCH 1 (A-M): ' + batch1.length);
batch1.forEach(f => console.log(f.id + ' | ' + f.jurisdiction + ', ' + f.state + ' | ' + f.action_type + ' | ' + (f.company||'unknown')));

console.log('\n=== MISSING GROUPS BATCH 2 (N-Z): ' + batch2.length);
batch2.forEach(f => console.log(f.id + ' | ' + f.jurisdiction + ', ' + f.state + ' | ' + f.action_type + ' | ' + (f.company||'unknown')));

// Missing MW
const noMW = local.filter(f => f.megawatts == null);
const mwWithCo = noMW.filter(f => f.company && f.company !== 'unknown');
const mwNoCo = noMW.filter(f => f.company == null || f.company === 'unknown');

console.log('\n=== MISSING MW (company known): ' + mwWithCo.length);
mwWithCo.forEach(f => console.log(f.id + ' | ' + f.jurisdiction + ', ' + f.state + ' | ' + f.company));

console.log('\n=== MISSING MW+COMPANY: ' + mwNoCo.length);
mwNoCo.forEach(f => console.log(f.id + ' | ' + f.jurisdiction + ', ' + f.state + ' | ' + f.action_type));

// Has groups, no FB
const noFB = local.filter(f => f.opposition_groups && f.opposition_groups.length > 0 && f.opposition_facebook == null);
console.log('\n=== HAS GROUPS NO FB: ' + noFB.length);
noFB.forEach(f => console.log(f.id + ' | ' + f.jurisdiction + ', ' + f.state + ' | ' + (f.opposition_groups||[]).join('; ')));
