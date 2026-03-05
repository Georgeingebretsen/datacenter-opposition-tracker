#!/usr/bin/env node
/**
 * Apply enrichment data from research agents to the main fights.json
 * Merges new sources, opposition groups, specs, etc. into existing entries
 */
const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '..', 'data');
const fightsPath = path.join(dataDir, 'fights.json');

const ENRICHMENT_FILES = [
  'enrichment-round1.json',
  'enrichment-midwest.json',
  'enrichment-specs.json',
  'enrichment-hyperscalers.json',
  'enrichment-southeast.json',
  'enrichment-social.json',
  'enrichment-west.json',
  'enrichment-facebook.json',
  'enrichment-newresearch.json',
  'enrichment-ga-oh-in.json',
  'enrichment-facebook2.json',
  'enrichment-highvalue.json',
  'enrichment-companies.json',
  'enrichment-oh-pa-in.json',
  'enrichment-tx-va-nc-wi-mo.json',
  'enrichment-remaining.json',
  'enrichment-petitions.json',
  'enrichment-groups-batch3a.json',
  'enrichment-groups-batch3b.json',
  'enrichment-groups-batch3c.json',
  'enrichment-specs2a.json',
  'enrichment-specs2b.json',
  'enrichment-facebook3.json',
  'enrichment-legislation.json',
  'enrichment-groups-batch4.json',
  'enrichment-specs3a.json',
  'enrichment-specs3b.json',
  'enrichment-companies2.json',
  'enrichment-hyperscalers2.json',
  'enrichment-groups-batch5.json',
  'enrichment-facebook4.json',
  'enrichment-specs4a.json',
  'enrichment-investment1.json',
  'enrichment-status-march2026.json',
  'enrichment-social2.json',
  'enrichment-specs4b.json',
  'enrichment-legislation2.json',
  'enrichment-highvalue2.json',
  'enrichment-groups-batch6.json',
  'enrichment-petitions2.json',
  'enrichment-specs5a.json',
  'enrichment-specs5b.json',
  'enrichment-investment2.json',
  'enrichment-highvalue3.json',
  'enrichment-social3.json',
  'enrichment-social4.json',
  'enrichment-social5.json',
  'enrichment-specs6.json',
  'enrichment-groups-batch7.json',
  'enrichment-hyperscalers3.json',
  'enrichment-social6.json',
  'enrichment-groups-batch8.json',
  'enrichment-specs7.json',
  'enrichment-petitions3.json',
  'enrichment-social7.json',
  'enrichment-groups-batch9.json',
  'enrichment-specs8.json',
  'enrichment-companies3.json',
  'enrichment-groups-batch10.json',
  'enrichment-social9.json',
  'enrichment-investment3.json',
  'enrichment-specs9.json',
  'enrichment-idfix-r12.json',
  'enrichment-groups-batch11.json',
  'enrichment-social10.json',
  'enrichment-investment4.json',
  'enrichment-specs10.json',
  'enrichment-hyperscalers4.json',
  'enrichment-companies4.json',
  'enrichment-groups-batch12.json',
  'enrichment-social11.json',
  'enrichment-companies5.json',
  'enrichment-groups-batch13.json',
  'enrichment-specs11.json',
  'enrichment-investment5.json',
  'enrichment-companies6.json',
  'enrichment-groups-batch14.json',
  'enrichment-specs12.json',
  'enrichment-investment6.json',
  'enrichment-social12.json',
  'enrichment-companies7.json',
  'enrichment-hyperscalers5.json',
  'enrichment-petitions4.json',
  'enrichment-social13.json',
  'enrichment-idfix-r17.json',
];

let fights = JSON.parse(fs.readFileSync(fightsPath, 'utf8'));
console.log(`Loaded ${fights.length} fights`);

let totalUpdated = 0;
let totalFieldsUpdated = 0;

for (const file of ENRICHMENT_FILES) {
  const filePath = path.join(dataDir, file);
  if (!fs.existsSync(filePath)) {
    console.log(`Skipping ${file} (not found)`);
    continue;
  }

  const enrichments = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  console.log(`\nProcessing ${file}: ${enrichments.length} entries`);

  for (const enrichment of enrichments) {
    let fight = fights.find(f => f.id === enrichment.id);
    // Fallback: try partial ID match (agent IDs sometimes miss date suffix)
    if (!fight) {
      fight = fights.find(f => f.id && f.id.startsWith(enrichment.id + '-'));
    }
    // Fallback: try matching by jurisdiction+state if provided
    if (!fight && enrichment.jurisdiction && enrichment.state) {
      fight = fights.find(f =>
        f.jurisdiction.toLowerCase() === enrichment.jurisdiction.toLowerCase() &&
        f.state === enrichment.state
      );
    }
    if (!fight) {
      console.log(`  WARNING: No match for id="${enrichment.id}"`);
      continue;
    }

    // Support both formats: { id, updates: {...} } and { id, field1, field2, ... }
    let updates = enrichment.updates;
    if (!updates) {
      // Treat the whole object (minus id) as updates
      const { id, ...rest } = enrichment;
      if (Object.keys(rest).length === 0) continue;
      updates = rest;
    }
    // Normalize investment_million -> investment_million_usd
    if (updates.investment_million && !updates.investment_million_usd) {
      updates.investment_million_usd = updates.investment_million;
    }

    let fieldsUpdated = 0;

    // Merge sources (append new ones, deduplicate)
    if (updates.sources && updates.sources.length) {
      const existing = new Set(fight.sources || []);
      const newSources = updates.sources.filter(s => !existing.has(s));
      if (newSources.length) {
        fight.sources = [...(fight.sources || []), ...newSources];
        fieldsUpdated++;
      }
    }

    // Merge opposition groups (append new ones, deduplicate)
    if (updates.opposition_groups && updates.opposition_groups.length) {
      const existing = new Set((fight.opposition_groups || []).map(g => g.toLowerCase()));
      const newGroups = updates.opposition_groups.filter(g => !existing.has(g.toLowerCase()));
      if (newGroups.length) {
        fight.opposition_groups = [...(fight.opposition_groups || []), ...newGroups];
        fieldsUpdated++;
      }
    }

    // Merge concerns (append new ones, deduplicate)
    if (updates.concerns && updates.concerns.length) {
      const existing = new Set(fight.concerns || []);
      const newConcerns = updates.concerns.filter(c => !existing.has(c));
      if (newConcerns.length) {
        fight.concerns = [...(fight.concerns || []), ...newConcerns];
        fieldsUpdated++;
      }
    }

    // Update summary only if the new one is longer
    if (updates.summary && (!fight.summary || updates.summary.length > fight.summary.length)) {
      fight.summary = updates.summary;
      fieldsUpdated++;
    }

    // Set scalar fields only if currently empty/missing
    const scalarFields = [
      'opposition_website', 'opposition_facebook', 'opposition_instagram', 'opposition_twitter',
      'opposition_facebook_members',
      'petition_url', 'petition_signatures',
      'company', 'project_name', 'hyperscaler',
      'megawatts', 'investment_million_usd', 'acreage',
      'building_sq_ft', 'water_usage_gallons_per_day', 'jobs_promised',
    ];

    for (const field of scalarFields) {
      if (updates[field] != null && !fight[field]) {
        fight[field] = updates[field];
        fieldsUpdated++;
      }
    }

    // Special: more_perfect_union_video (always set if provided)
    if (updates.more_perfect_union_video) {
      fight.more_perfect_union_video = updates.more_perfect_union_video;
      fieldsUpdated++;
    }

    // Special: petition_signatures (take the higher value)
    if (updates.petition_signatures && (!fight.petition_signatures || updates.petition_signatures > fight.petition_signatures)) {
      fight.petition_signatures = updates.petition_signatures;
      fieldsUpdated++;
    }

    // Special: opposition_facebook_members (take the higher value)
    if (updates.opposition_facebook_members && (!fight.opposition_facebook_members || updates.opposition_facebook_members > fight.opposition_facebook_members)) {
      fight.opposition_facebook_members = updates.opposition_facebook_members;
      fieldsUpdated++;
    }

    // Special: status (update if provided — for status change tracking)
    if (updates.status && updates.status !== fight.status) {
      fight.status = updates.status;
      fieldsUpdated++;
    }

    if (fieldsUpdated > 0) {
      fight.last_updated = new Date().toISOString().split('T')[0];
      totalUpdated++;
      totalFieldsUpdated += fieldsUpdated;
      console.log(`  Updated "${fight.jurisdiction}, ${fight.state}" — ${fieldsUpdated} fields`);
    }
  }
}

// Write back
fs.writeFileSync(fightsPath, JSON.stringify(fights, null, 2));

// Copy to site
const siteDataDir = path.join(__dirname, '..', 'site', 'data');
if (!fs.existsSync(siteDataDir)) fs.mkdirSync(siteDataDir, { recursive: true });
fs.writeFileSync(path.join(siteDataDir, 'fights.json'), JSON.stringify(fights));

console.log(`\n=== DONE ===`);
console.log(`Updated ${totalUpdated} entries with ${totalFieldsUpdated} total field updates`);
console.log(`Output: ${fights.length} fights`);
