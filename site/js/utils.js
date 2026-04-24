/**
 * Shared utilities for Tracking American AI Data Center Buildout
 */

const STATUS_TOOLTIPS = {
  active: 'A community action or restriction is currently in effect or in progress',
  approved: 'The data center project was approved despite community concerns',
  cancelled: 'The project was cancelled or the developer withdrew',
  defeated: 'The project, bill, or measure was rejected by the deciding body',
  delayed: 'The project or decision has been delayed',
  expired: 'The moratorium or restriction has expired',
  mixed: 'Mixed outcome — partial wins and losses',
  passed: 'The bill, ordinance, or community measure was officially enacted',
  pending: 'A decision is pending — awaiting vote or ruling',
};

const ACTION_TOOLTIPS = {
  moratorium: 'A temporary ban or pause on data center development, usually 6-12 months, to allow time for study or policy development',
  legislation: 'A bill introduced in a state legislature or Congress — distinct from local ordinances',
  ordinance: 'A local law passed by a city council, county commission, or township board',
  zoning_restriction: 'A change to local zoning codes — overlay districts, conditional use requirements, setbacks, or removing data centers from permitted uses',
  community_benefit_agreement: 'A negotiated agreement between a developer and the community, including host fees, impact payments, or performance guarantees',
  other_opposition: 'Organized community pushback that hasn\'t yet resulted in a specific formal government or legal action',
  lawsuit: 'A legal challenge — land use appeals, CEQA suits, Clean Air Act actions, conservation easement disputes',
  permit_denial: 'A government body denied a permit, rezoning application, or site plan',
  project_withdrawal: 'The developer voluntarily withdrew or cancelled the project, usually due to community pressure',
  infrastructure_opposition: 'Opposition to supporting infrastructure — transmission lines, substations, gas plants built to power data centers',
  regulatory_action: 'A decision by a regulatory agency (utility commission, PUC, FERC) — not legislation, but administrative proceedings by appointed officials',
  executive_action: 'An executive order or action by a governor or president',
  study_or_report: 'A commissioned study, environmental review, or federal impact assessment',
};

const AUTHORITY_TOOLTIPS = {
  city_council: 'City or town council — elected municipal governing body',
  county_commission: 'County board of commissioners or supervisors',
  township_board: 'Township board of trustees — governs unincorporated townships',
  village_board: 'Village council or board of trustees',
  planning_commission: 'Appointed planning or zoning board that reviews land use applications',
  state_legislature: 'State senate and/or house of representatives',
  governor: 'State governor — executive orders, vetoes, bill signings',
  utility_commission: 'Public utility/service commission (PSC, PUC, FERC) — appointed regulators',
  federal_legislature: 'U.S. Congress — Senate and House bills',
  federal_executive: 'President — executive orders and proclamations',
  federal_agency: 'Federal agency (EPA, Army Corps, FERC) — administrative rulings',
  court: 'State or federal court — lawsuits, injunctions, appeals',
  voters: 'Direct democracy — ballot initiatives, referendums, recall elections',
  developer: 'The developer themselves — voluntary withdrawal or cancellation',
  advocacy_org: 'Advocacy organization or coalition leading the action',
  tribal_government: 'Tribal nation government exercising sovereignty',
};

function getAuthorityTooltip(authority) {
  if (!authority) return '';
  return AUTHORITY_TOOLTIPS[authority] || authority.replace(/_/g, ' ');
}

function getActionTooltip(action) {
  if (!action) return '';
  return ACTION_TOOLTIPS[action] || action.replace(/_/g, ' ');
}

const ISSUE_TOOLTIPS = {
  zoning: 'Land use and zoning concerns — whether the site should be industrial, residential, mixed-use, or agricultural',
  water: 'Water consumption concerns — cooling demand, aquifer depletion, impacts on local supply, wetlands, or waterways',
  environmental: 'Environmental concerns — pollution, emissions, habitat destruction, wildlife impact, or ecosystem damage',
  community_impact: 'Broader community impacts — property values, rural character, displacement, noise, traffic, or quality of life for residents',
  grid_energy: 'Electric grid and energy concerns — strain on the grid, transmission infrastructure, reliability, or new power generation',
  transparency: 'Transparency concerns — NDAs, secret negotiations, hidden terms, or community being kept in the dark',
  ratepayer: 'Ratepayer protection — worries that data center costs will be passed on to residential electric customers',
  noise: 'Noise pollution concerns — hum from cooling fans, backup generators, or construction disturbance',
  tax_incentive: 'Tax incentive concerns — public subsidies, tax abatements, or giveaways to corporations',
  farmland: 'Farmland preservation — loss of working farms, prime agricultural soil, or rural open space',
  traffic: 'Traffic concerns — construction truck volume, road damage, or permanent increases in local traffic',
  design_standards: 'Building and site design requirements — height limits, setbacks, screening, sound barriers, and architectural rules',
  contract_guarantees: 'Contract guarantees — financial assurances, early termination fees, load ramp terms, or decommissioning bonds',
  anti_ai: 'Explicit opposition to AI as a technology — job displacement, AI energy footprint, or opposition to the AI industry specifically',
};

function getIssueTooltip(issue) {
  if (!issue) return '';
  return ISSUE_TOOLTIPS[issue] || issue.replace(/_/g, ' ');
}

// Custom tooltip — shared by main page and legislation page
function setupCustomTooltips() {
  let tooltipEl = document.getElementById('custom-tooltip');
  if (!tooltipEl) {
    tooltipEl = document.createElement('div');
    tooltipEl.id = 'custom-tooltip';
    document.body.appendChild(tooltipEl);
  }
  document.addEventListener('mouseover', (e) => {
    if (!e.target || typeof e.target.closest !== 'function') return;
    const target = e.target.closest('[data-tooltip]');
    if (!target) return;
    const text = target.dataset.tooltip;
    if (!text) return;
    tooltipEl.textContent = text;
    tooltipEl.classList.add('visible');
    _positionCustomTooltip(target, tooltipEl);
  });
  document.addEventListener('mouseout', (e) => {
    if (!e.target || typeof e.target.closest !== 'function') return;
    const target = e.target.closest('[data-tooltip]');
    if (!target) return;
    if (target.contains(e.relatedTarget)) return;
    tooltipEl.classList.remove('visible');
  });
  window.addEventListener('scroll', () => tooltipEl.classList.remove('visible'), true);
}

function _positionCustomTooltip(target, tooltipEl) {
  const rect = target.getBoundingClientRect();
  const tipRect = tooltipEl.getBoundingClientRect();
  let top = rect.top - tipRect.height - 10;
  let left = rect.left + rect.width / 2 - tipRect.width / 2;
  if (top < 8) top = rect.bottom + 10;
  if (left < 8) left = 8;
  if (left + tipRect.width > window.innerWidth - 8) {
    left = window.innerWidth - tipRect.width - 8;
  }
  tooltipEl.style.left = left + 'px';
  tooltipEl.style.top = top + 'px';
}

function capitalize(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, ' ') : '';
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
}

function getStatusTooltip(status) {
  if (!status) return '';
  const key = status.split(/[\s\-–]/)[0].toLowerCase();
  return STATUS_TOOLTIPS[key] || status;
}

// Render the "Updated X days ago" pill with a pulsing dot.
// Accepts a YYYY-MM-DD date string from the fights dataset.
function renderLastUpdated(dateStr) {
  if (!dateStr) return '';
  const then = new Date(dateStr + 'T00:00:00');
  const now = new Date();
  const days = Math.floor((now - then) / 86400000);
  let label;
  if (days <= 0) label = 'today';
  else if (days === 1) label = 'yesterday';
  else if (days < 7) label = `${days} days ago`;
  else if (days < 14) label = '1 week ago';
  else if (days < 60) label = `${Math.floor(days / 7)} weeks ago`;
  else label = then.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  return `<span class="live-dot" aria-hidden="true"></span>Updated ${label}`;
}
