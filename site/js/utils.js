/**
 * Shared utilities for US Datacenter Fights
 */

const STATUS_TOOLTIPS = {
  active: 'A restriction or opposition measure is currently in effect',
  approved: 'The datacenter project was approved despite opposition',
  cancelled: 'The project was cancelled or the developer withdrew',
  delayed: 'The project or decision has been delayed',
  expired: 'The moratorium or restriction has expired',
  mixed: 'Mixed outcome — partial wins and losses',
  ongoing: 'The fight is still in progress with no resolution yet',
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
