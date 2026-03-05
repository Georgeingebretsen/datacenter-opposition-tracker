#!/usr/bin/env node
const fs = require('fs');
const f = JSON.parse(fs.readFileSync('data/fights.json', 'utf8'));
console.log('Total fights:', f.length);
console.log('No company:', f.filter(x => x.company == null && x.action_type !== 'legislative_action').length);
console.log('No groups:', f.filter(x => x.opposition_groups == null || x.opposition_groups.length === 0).length);
console.log('No MW:', f.filter(x => x.company && x.megawatts == null).length);
console.log('No social:', f.filter(x => x.opposition_groups && x.opposition_groups.length > 0 && x.opposition_facebook == null && x.opposition_website == null && x.opposition_twitter == null && x.opposition_instagram == null).length);
console.log('No investment:', f.filter(x => x.company && x.investment_million_usd == null).length);
