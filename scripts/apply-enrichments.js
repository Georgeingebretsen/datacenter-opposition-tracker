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
    const fight = fights.find(f => f.id === enrichment.id);
    if (!fight) {
      console.log(`  WARNING: No match for id="${enrichment.id}" (${enrichment.jurisdiction}, ${enrichment.state})`);
      continue;
    }

    const updates = enrichment.updates;
    if (!updates) continue;

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
