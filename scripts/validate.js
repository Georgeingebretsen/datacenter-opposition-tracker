#!/usr/bin/env node
/*
 * Pre-deploy validation for site/data/fights.json.
 * Runs as the Netlify build command — a non-zero exit FAILS the deploy,
 * so render-breaking data (e.g. a null `date`, which once blanked the whole
 * homepage) can never reach production.
 *
 * Run locally:  node scripts/validate.js
 */
const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, '..', 'site', 'data', 'fights.json');

const VALID_ACTION = new Set(['moratorium','legislation','ordinance','zoning_restriction',
  'community_benefit_agreement','other_opposition','lawsuit','permit_denial','project_withdrawal',
  'infrastructure_opposition','regulatory_action','executive_action','study_or_report',
  'public_comment','utility_regulation','executive_order']);
const VALID_ISSUE = new Set(['zoning','water','environmental','air_quality','community_impact',
  'property_values','grid_energy','transparency','ratepayer','noise','tax_incentive','farmland',
  'traffic','design_standards','contract_guarantees','anti_ai']);
const VALID_OUTCOME = new Set(['win','loss','pending','mixed']);
const VALID_SCOPE = new Set(['local','statewide','federal']);
const VALID_FLAG = new Set(['url_unverifiable','source_conflict','attribution_uncertain',
  'figure_unverified','jurisdiction_ambiguous','status_uncertain','needs_update','other']);
const NUMERIC = ['investment_million_usd','megawatts','acreage','building_sq_ft',
  'water_usage_gallons_per_day','jobs_promised','petition_signatures'];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function main() {
  let raw, data;
  try { raw = fs.readFileSync(FILE, 'utf8'); }
  catch (e) { fail([`Cannot read ${FILE}: ${e.message}`]); }
  try { data = JSON.parse(raw); }
  catch (e) { fail([`fights.json is not valid JSON: ${e.message}`]); }
  if (!Array.isArray(data)) fail(['fights.json is not a JSON array']);

  const issues = [];
  const seen = new Set();
  for (const d of data) {
    const id = (d && d.id) || '(no id)';
    if (!d || typeof d !== 'object') { issues.push(`${id}: entry is not an object`); continue; }
    if (!d.id || typeof d.id !== 'string') issues.push(`${id}: missing/invalid id`);
    else if (seen.has(d.id)) issues.push(`${d.id}: duplicate id`);
    else seen.add(d.id);

    // RENDER-CRITICAL: date must be a non-empty YYYY-MM-DD string.
    // (A null date crashed app.js f.date.substring and blanked the whole page.)
    if (typeof d.date !== 'string' || !DATE_RE.test(d.date))
      issues.push(`${id}: date must be a YYYY-MM-DD string (got ${JSON.stringify(d.date)})`);

    if (!Array.isArray(d.action_type)) issues.push(`${id}: action_type not an array`);
    else d.action_type.forEach(a => { if (!VALID_ACTION.has(a)) issues.push(`${id}: invalid action_type "${a}"`); });

    if (!Array.isArray(d.issue_category)) issues.push(`${id}: issue_category not an array`);
    else d.issue_category.forEach(c => { if (!VALID_ISSUE.has(c)) issues.push(`${id}: invalid issue_category "${c}"`); });

    if (!Array.isArray(d.sources) || d.sources.length === 0) issues.push(`${id}: sources empty or not an array`);

    if (!VALID_OUTCOME.has(d.community_outcome)) issues.push(`${id}: invalid community_outcome "${d.community_outcome}"`);
    if (!VALID_SCOPE.has(d.scope)) issues.push(`${id}: invalid scope "${d.scope}"`);

    if (d.scope === 'local' && d.county_lean !== 'R' && d.county_lean !== 'D')
      issues.push(`${id}: local entry missing county_lean (R/D)`);

    // RENDER-CRITICAL: markers need lat/lng for non-federal entries.
    if (d.scope !== 'federal') {
      if (typeof d.lat !== 'number' || typeof d.lng !== 'number') issues.push(`${id}: missing/invalid lat/lng`);
      else if (d.lat < 17 || d.lat > 72 || d.lng < -180 || d.lng > -64) issues.push(`${id}: lat/lng out of US bounds (${d.lat},${d.lng})`);
    }

    for (const nf of NUMERIC) {
      const v = d[nf];
      if (v != null && typeof v !== 'number') issues.push(`${id}: ${nf} must be a number (got ${JSON.stringify(v)})`);
    }

    if (d.flags != null) {
      if (!Array.isArray(d.flags)) issues.push(`${id}: flags not an array`);
      else d.flags.forEach(f => { if (!f || typeof f !== 'object' || !VALID_FLAG.has(f.type)) issues.push(`${id}: invalid flag ${JSON.stringify(f && f.type)}`); });
    }
  }

  if (issues.length) fail(issues, data.length);
  console.log(`✓ validate.js: ${data.length} entries OK — no render-breaking issues.`);
}

function fail(issues, total) {
  console.error(`✗ validate.js FAILED${total ? ` (${total} entries)` : ''}: ${issues.length} issue(s):`);
  issues.slice(0, 40).forEach(i => console.error(`  - ${i}`));
  if (issues.length > 40) console.error(`  ...and ${issues.length - 40} more`);
  process.exit(1);
}

main();
