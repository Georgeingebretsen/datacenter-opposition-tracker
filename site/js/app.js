/**
 * US Datacenter Fights — Interactive map and database viewer
 */

let fights = [];
let map;
let markers = [];
let currentSort = { key: 'date', dir: 'desc' };
let selectedHyperscalers = new Set();
let spreadsheetMode = true;

const ACTION_LABELS = {
  moratorium: 'Moratorium',
  full_ban: 'Full Ban',
  zoning_restriction: 'Zoning Restriction',
  cancellation: 'Cancellation',
  permit_denial: 'Permit Denial',
  resolution_opposing: 'Resolution Opposing',
  lawsuit: 'Lawsuit',
  protest: 'Protest',
  petition: 'Petition',
  legislative_action: 'Legislative Action',
  other: 'Other',
};

// Status-based map colors
const STATUS_COLORS = {
  // Community won / protection in place
  active: '#3da55e',
  permanent: '#2d8a4e',
  blocked: '#3da55e',
  withdrawn: '#3da55e',
  resolved: '#3da55e',
  denied: '#3da55e',
  // Fight in progress
  ongoing: '#d4a020',
  pending: '#d07830',
  delayed: '#d07830',
  legal_challenge: '#d4a020',
  // Community lost
  approved: '#d03030',
  defeated: '#d03030',
  expired: '#9a9080',
  overturned: '#d03030',
  // Other
  moratorium: '#3da55e',
  no_active_proposal: '#9a9080',
};

const STATUS_LEGEND = [
  { color: '#3da55e', label: 'Won / Protected' },
  { color: '#d4a020', label: 'Fight Ongoing' },
  { color: '#d07830', label: 'Pending Decision' },
  { color: '#d03030', label: 'Project Approved' },
  { color: '#9a9080', label: 'Expired / Other' },
];

const CONCERN_LABELS = {
  water: 'Water Usage',
  noise: 'Noise',
  electricity_rates: 'Electricity Rates',
  air_quality: 'Air Quality',
  property_values: 'Property Values',
  traffic: 'Traffic',
  agricultural_land: 'Agricultural Land',
  environment: 'Environment',
  grid_reliability: 'Grid Reliability',
  health: 'Health',
  community_character: 'Community Character',
  process_fairness: 'Process Fairness',
  light_pollution: 'Light Pollution',
  tax_fairness: 'Tax Fairness',
  wildlife: 'Wildlife',
  jobs_quality: 'Jobs Quality',
};

// Hyperscaler short labels and brand colors for map markers
const HYPERSCALER_INFO = {
  'Amazon/AWS': { label: 'AWS', color: '#FF9900' },
  'Google':     { label: 'G',   color: '#4285F4' },
  'Microsoft':  { label: 'MS',  color: '#00A4EF' },
  'Meta':       { label: 'M',   color: '#0668E1' },
  'OpenAI':     { label: 'AI',  color: '#10A37F' },
  'xAI':        { label: 'xAI', color: '#1DA1F2' },
  'CoreWeave':  { label: 'CW',  color: '#6C63FF' },
};

// Init
document.addEventListener('DOMContentLoaded', async () => {
  const resp = await fetch('data/fights.json');
  fights = await resp.json();

  initMap();
  populateFilters();
  render();

  // Theme toggle
  document.getElementById('theme-toggle').addEventListener('click', toggleTheme);

  // Show last updated from most recent entry
  const dates = fights.map(f => f.last_updated || f.date).filter(Boolean).sort();
  if (dates.length) {
    const latest = dates[dates.length - 1];
    document.getElementById('last-updated').textContent = 'Last updated: ' + new Date(latest + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  }

  document.getElementById('filter-state').addEventListener('change', render);
  document.getElementById('filter-type').addEventListener('change', render);
  document.getElementById('filter-year').addEventListener('change', render);
  document.getElementById('filter-concern').addEventListener('change', render);
  document.getElementById('size-by').addEventListener('change', render);
  document.getElementById('clear-filters').addEventListener('click', clearFilters);
  document.getElementById('search-input').addEventListener('input', render);
  document.getElementById('close-panel').addEventListener('click', closePanel);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closePanel();
  });

  document.getElementById('toggle-view').addEventListener('click', toggleSpreadsheet);
  document.getElementById('download-csv').addEventListener('click', downloadCSV);
  document.getElementById('download-json').addEventListener('click', downloadJSON);

  document.querySelectorAll('#fights-table thead th[data-sort]').forEach(th => {
    th.addEventListener('click', () => {
      const key = th.dataset.sort;
      if (currentSort.key === key) {
        currentSort.dir = currentSort.dir === 'asc' ? 'desc' : 'asc';
      } else {
        currentSort = { key, dir: 'asc' };
      }
      render();
    });
  });
});

function initMap() {
  map = L.map('map', {
    zoomControl: true,
    scrollWheelZoom: true,
    zoomSnap: 0,
    zoomDelta: 1,
    wheelPxPerZoomLevel: 80,
    minZoom: 3,
    maxZoom: 18,
    maxBounds: [[-10, -180], [75, -30]],
    maxBoundsViscosity: 0.8,
  }).setView([39.0, -96.0], 4);

  // Prepare both tile layers
  window._mapLightTiles = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
    maxZoom: 18,
  });
  window._mapDarkTiles = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
    maxZoom: 18,
  });

  // Default to light
  window._mapLightTiles.addTo(map);
  window._mapIsDark = false;

  // Grey out everything outside the US
  fetch('data/us-mask.json')
    .then(r => r.json())
    .then(maskData => {
      window._mapMask = L.geoJSON(maskData, {
        style: {
          fillColor: '#d5d0c8',
          fillOpacity: 0.55,
          stroke: false,
        },
        interactive: false,
      }).addTo(map);
    })
    .catch(() => {});
}

function toggleTheme() {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const btn = document.getElementById('theme-toggle');

  if (isDark) {
    // Switch to light
    document.documentElement.removeAttribute('data-theme');
    btn.textContent = 'Dark Mode';
    if (map) {
      map.removeLayer(window._mapDarkTiles);
      window._mapLightTiles.addTo(map);
      window._mapLightTiles.bringToBack();
      if (window._mapMask) {
        window._mapMask.setStyle({ fillColor: '#d5d0c8', fillOpacity: 0.55 });
      }
    }
    window._mapIsDark = false;
  } else {
    // Switch to dark
    document.documentElement.setAttribute('data-theme', 'dark');
    btn.textContent = 'Light Mode';
    if (map) {
      map.removeLayer(window._mapLightTiles);
      window._mapDarkTiles.addTo(map);
      window._mapDarkTiles.bringToBack();
      if (window._mapMask) {
        window._mapMask.setStyle({ fillColor: '#000000', fillOpacity: 0.6 });
      }
    }
    window._mapIsDark = true;
  }
}

function populateFilters() {
  const localFights = fights.filter(f => f.scope !== 'statewide' && f.scope !== 'federal');
  const stateCounts = {};
  localFights.forEach(f => { stateCounts[f.state] = (stateCounts[f.state] || 0) + 1; });
  const states = Object.keys(stateCounts).sort();
  const stateSelect = document.getElementById('filter-state');
  states.forEach(s => {
    const opt = document.createElement('option');
    opt.value = s;
    opt.textContent = `${s} (${stateCounts[s]})`;
    stateSelect.appendChild(opt);
  });

  const years = [...new Set(localFights.map(f => f.date.substring(0, 4)))].sort();
  const yearSelect = document.getElementById('filter-year');
  years.forEach(y => {
    const opt = document.createElement('option');
    opt.value = y;
    opt.textContent = y;
    yearSelect.appendChild(opt);
  });
}

function getFiltered() {
  const state = document.getElementById('filter-state').value;
  const type = document.getElementById('filter-type').value;
  const year = document.getElementById('filter-year').value;
  const concern = document.getElementById('filter-concern').value;
  const search = document.getElementById('search-input').value.toLowerCase();

  return fights.filter(f => {
    if (f.scope === 'statewide' || f.scope === 'federal') return false;
    if (state && f.state !== state) return false;
    if (type && f.action_type !== type) return false;
    if (year && !f.date.startsWith(year)) return false;
    if (concern && (!f.concerns || !f.concerns.includes(concern))) return false;
    if (selectedHyperscalers.size > 0 && !selectedHyperscalers.has(f.hyperscaler)) return false;
    if (search) {
      const haystack = [
        f.jurisdiction, f.state, f.company, f.project_name, f.summary,
        ACTION_LABELS[f.action_type],
        ...(f.opposition_groups || []),
      ].filter(Boolean).join(' ').toLowerCase();
      if (!haystack.includes(search)) return false;
    }
    return true;
  });
}

function getLegislation() {
  return fights.filter(f => f.scope === 'statewide' || f.scope === 'federal');
}

function render() {
  const filtered = getFiltered();
  updateStats(filtered);
  updateMap(filtered);
  updateLegislation();
  updateTable(filtered);
  updateSortIndicators();
}

function updateStats(filtered) {
  document.getElementById('stat-total').textContent = filtered.length;
  document.getElementById('stat-states').textContent = new Set(filtered.map(f => f.state)).size;
  const totalInvestment = filtered.filter(f => f.investment_million_usd).reduce((s, f) => s + f.investment_million_usd, 0);
  document.getElementById('stat-investment').textContent = totalInvestment > 0 ? '$' + Math.round(totalInvestment / 1000) + 'B' : '—';
  document.getElementById('stat-moratoria').textContent = filtered.filter(f => f.action_type === 'moratorium').length;
  document.getElementById('fights-count').textContent = filtered.length;
  updateOutcomeBar(filtered);
  updateHyperscalerBar(filtered);
}

function updateOutcomeBar(filtered) {
  const bar = document.getElementById('outcome-bar');
  const wonStatuses = new Set(['active','permanent','blocked','withdrawn','resolved','denied','moratorium']);
  const ongoingStatuses = new Set(['ongoing','pending','delayed','legal_challenge']);
  const lostStatuses = new Set(['approved','defeated','overturned']);

  let won = 0, ongoing = 0, lost = 0, other = 0;
  filtered.forEach(f => {
    if (wonStatuses.has(f.status)) won++;
    else if (ongoingStatuses.has(f.status)) ongoing++;
    else if (lostStatuses.has(f.status)) lost++;
    else other++;
  });
  const total = filtered.length || 1;
  const pWon = Math.round(won/total*100);
  const pOngoing = Math.round(ongoing/total*100);
  const pLost = Math.round(lost/total*100);

  bar.innerHTML = `
    <div class="outcome-labels">
      <span class="outcome-label" style="color:#3d7a4e">Won/Protected: ${won} (${pWon}%)</span>
      <span class="outcome-label" style="color:#c49525">Ongoing: ${ongoing} (${pOngoing}%)</span>
      <span class="outcome-label" style="color:#b5362a">Approved: ${lost} (${pLost}%)</span>
    </div>
    <div class="outcome-track">
      <div class="outcome-segment" style="width:${pWon}%;background:#3d7a4e" title="Won/Protected: ${won}"></div>
      <div class="outcome-segment" style="width:${pOngoing}%;background:#c49525" title="Ongoing: ${ongoing}"></div>
      <div class="outcome-segment" style="width:${pLost}%;background:#b5362a" title="Approved: ${lost}"></div>
      <div class="outcome-segment" style="width:${100-pWon-pOngoing-pLost}%;background:#9a9080" title="Other: ${other}"></div>
    </div>
  `;
}

function updateHyperscalerBar(filtered) {
  const bar = document.getElementById('hyperscaler-bar');
  // Count from ALL local fights (not just filtered) so chips don't disappear when filtered
  const localFights = fights.filter(f => f.scope !== 'statewide' && f.scope !== 'federal');
  const counts = {};
  localFights.forEach(f => {
    if (f.hyperscaler) counts[f.hyperscaler] = (counts[f.hyperscaler] || 0) + 1;
  });
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  if (sorted.length === 0) {
    bar.innerHTML = '';
    return;
  }

  const DEFAULT_SHOW = 7;
  const expanded = bar.dataset.expanded === 'true';
  const visible = expanded ? sorted : sorted.slice(0, DEFAULT_SHOW);
  const hasMore = sorted.length > DEFAULT_SHOW;

  bar.innerHTML = '<span class="hs-label">Companies:</span>' +
    visible.map(([name, count]) => {
      const info = HYPERSCALER_INFO[name] || { color: '#888', label: name };
      const isActive = selectedHyperscalers.has(name);
      return `<span class="hs-chip${isActive ? ' hs-active' : ''}" style="background:${info.color}${isActive ? '44' : '22'};color:${info.color};${isActive ? 'border-color:'+info.color : ''}" data-hs="${name}">${name} <span class="hs-count">${count}</span></span>`;
    }).join('') +
    (hasMore ? `<span class="hs-toggle" id="hs-toggle">${expanded ? 'show less' : '+ ' + (sorted.length - DEFAULT_SHOW) + ' more'}</span>` : '');

  // Bind chip clicks (multi-select toggle)
  bar.querySelectorAll('.hs-chip[data-hs]').forEach(chip => {
    chip.addEventListener('click', () => {
      const name = chip.dataset.hs;
      if (selectedHyperscalers.has(name)) {
        selectedHyperscalers.delete(name);
      } else {
        selectedHyperscalers.add(name);
      }
      render();
    });
  });

  // Bind show more/less
  const toggle = document.getElementById('hs-toggle');
  if (toggle) {
    toggle.addEventListener('click', () => {
      bar.dataset.expanded = expanded ? 'false' : 'true';
      updateHyperscalerBar(filtered);
    });
  }
}

// Size-by metric configuration
const SIZE_METRICS = {
  energy: {
    getValue: f => f.megawatts || (f.investment_million_usd ? f.investment_million_usd * 0.5 : null),
    minR: 4, maxR: 26, logScale: true,
    label: 'project power',
    formatTip: (f) => f.megawatts ? formatPower(f.megawatts) : (f.investment_million_usd ? formatInvestment(f.investment_million_usd) : null),
  },
  investment: {
    getValue: f => f.investment_million_usd,
    minR: 4, maxR: 24, logScale: true,
    label: 'investment',
    formatTip: (f) => f.investment_million_usd ? formatInvestment(f.investment_million_usd) : null,
  },
  acreage: {
    getValue: f => f.acreage,
    minR: 4, maxR: 24, logScale: true,
    label: 'land usage (acres)',
    formatTip: (f) => f.acreage ? f.acreage.toLocaleString() + ' acres' : null,
  },
  water: {
    getValue: f => f.water_usage_gallons_per_day,
    minR: 4, maxR: 24, logScale: true,
    label: 'water usage',
    formatTip: (f) => {
      const w = f.water_usage_gallons_per_day;
      if (!w) return null;
      return (w >= 1000000 ? (w/1000000).toFixed(1).replace(/\.0$/,'') + 'M' : w >= 1000 ? Math.round(w/1000) + 'K' : w.toLocaleString()) + ' gal/day';
    },
  },
  grassroots: {
    getValue: f => getGrassrootsScore(f),
    minR: 4, maxR: 24, logScale: false,
    label: 'grassroots support',
    formatTip: (f) => {
      const s = getGrassrootsScore(f);
      return s ? Math.round(s * 100) + '% grassroots score' : null;
    },
  },
  petitions: {
    getValue: f => f.petition_signatures,
    minR: 4, maxR: 24, logScale: true,
    label: 'petition signatures',
    formatTip: (f) => f.petition_signatures ? f.petition_signatures.toLocaleString() + ' sigs' : null,
  },
  facebook: {
    getValue: f => f.opposition_facebook_members,
    minR: 4, maxR: 24, logScale: true,
    label: 'Facebook members',
    formatTip: (f) => f.opposition_facebook_members ? f.opposition_facebook_members.toLocaleString() + ' members' : null,
  },
  instagram: {
    getValue: f => f.opposition_instagram_followers,
    minR: 4, maxR: 24, logScale: true,
    label: 'Instagram followers',
    formatTip: (f) => f.opposition_instagram_followers ? f.opposition_instagram_followers.toLocaleString() + ' followers' : null,
  },
};

// Grassroots composite score (0-1): normalized average of petition sigs, FB members, IG followers, group count
function getGrassrootsScore(f) {
  const components = [];
  if (f.petition_signatures) components.push(Math.log10(f.petition_signatures + 1) / Math.log10(100000));
  if (f.opposition_facebook_members) components.push(Math.log10(f.opposition_facebook_members + 1) / Math.log10(50000));
  if (f.opposition_instagram_followers) components.push(Math.log10(f.opposition_instagram_followers + 1) / Math.log10(25000));
  if (f.opposition_groups && f.opposition_groups.length) components.push(Math.log10(f.opposition_groups.length + 1) / Math.log10(10));
  if (components.length === 0) return null;
  const avg = components.reduce((a, b) => a + b, 0) / components.length;
  return Math.min(1, Math.max(0, avg));
}

// Compute marker radius based on selected size-by metric
function getMarkerRadius(f) {
  const sizeBy = document.getElementById('size-by').value;
  const metric = SIZE_METRICS[sizeBy] || SIZE_METRICS.energy;
  const val = metric.getValue(f);
  if (val == null || val <= 0) return 5;

  if (metric.logScale) {
    const logVal = Math.log10(Math.max(val, 1));
    const logMin = 0;
    const logMax = Math.log10(Math.max(val, 1)) > 0 ? 6 : 1; // auto-scale
    const t = Math.min(1, logVal / 6);
    return metric.minR + t * (metric.maxR - metric.minR);
  }
  // Linear (0-1 range, used for grassroots)
  return metric.minR + val * (metric.maxR - metric.minR);
}

// Tooltip label for the current size-by metric
function getSizeTooltipLabel(f) {
  const sizeBy = document.getElementById('size-by').value;
  const metric = SIZE_METRICS[sizeBy] || SIZE_METRICS.energy;
  return metric.formatTip(f);
}

function updateMap(filtered) {
  markers.forEach(m => map.removeLayer(m));
  markers = [];

  filtered.forEach(f => {
    if (!f.lat || !f.lng) return;
    const color = STATUS_COLORS[f.status] || '#8888a0';
    const radius = getMarkerRadius(f);

    // Use branded marker if hyperscaler is known, otherwise circle marker
    const hyperscaler = f.hyperscaler;
    const hsInfo = hyperscaler ? HYPERSCALER_INFO[hyperscaler] : null;
    let marker;
    if (hsInfo) {
      // Size branded markers proportionally too
      const size = Math.max(22, Math.min(48, radius * 1.8));
      const fontSize = Math.max(7, Math.min(13, size * 0.3));
      const icon = L.divIcon({
        className: 'logo-marker',
        html: `<div class="logo-dot" style="width:${size}px;height:${size}px;border-color:${color};background:${hsInfo.color}"><span style="font-size:${fontSize}px">${hsInfo.label}</span></div>`,
        iconSize: [size, size],
        iconAnchor: [size/2, size/2],
      });
      marker = L.marker([f.lat, f.lng], { icon });
    } else {
      marker = L.circleMarker([f.lat, f.lng], {
        radius: radius,
        fillColor: color,
        color: window._mapIsDark ? '#ffffff' : color,
        fillOpacity: window._mapIsDark ? 0.85 : 0.7,
        weight: window._mapIsDark ? 1.5 : 2,
        opacity: window._mapIsDark ? 0.6 : 0.9,
      });
    }

    // Hover tooltip
    const companyLabel = f.hyperscaler || f.company || '';
    const sizeTip = getSizeTooltipLabel(f);
    const scaleLabel = sizeTip ? ` · ${sizeTip}` : '';
    const tooltipContent = `<strong>${f.jurisdiction}, ${f.state}</strong> · ${capitalize(f.status)}${companyLabel ? ' · ' + companyLabel : ''}${scaleLabel}`;
    marker.bindTooltip(tooltipContent, {
      direction: 'top',
      offset: [0, -10],
    });

    // Click popup
    marker.bindPopup(`
      <h3>${f.jurisdiction}, ${f.state}</h3>
      <p><span class="badge badge-${f.action_type}">${ACTION_LABELS[f.action_type] || f.action_type}</span>
         <span class="status-badge status-${f.status}">${capitalize(f.status)}</span></p>
      ${f.hyperscaler ? `<p style="font-weight:600;">${f.hyperscaler}</p>` : ''}
      <p>${f.summary || ''}</p>
      <p style="opacity: 0.6; font-size: 0.8rem;">${formatDate(f.date)}</p>
    `);

    marker.on('click', () => openDetail(f));
    marker.addTo(map);
    markers.push(marker);
  });

  // Fit bounds when filtering (but not on initial full load)
  const stateFilter = document.getElementById('filter-state').value;
  if ((stateFilter || selectedHyperscalers.size > 0) && markers.length > 0) {
    const group = L.featureGroup(markers);
    map.fitBounds(group.getBounds().pad(0.1), { maxZoom: 10 });
  }

  // Add/update legend
  updateMapLegend();
}

function updateMapLegend() {
  const sizeBy = document.getElementById('size-by').value;
  const metric = SIZE_METRICS[sizeBy] || SIZE_METRICS.energy;
  const sizeNote = `Dot size = ${metric.label}`;

  const existing = document.getElementById('map-legend');
  if (existing) {
    // Update just the size note text
    const noteEl = existing.querySelector('.legend-size-note');
    if (noteEl) noteEl.textContent = sizeNote;
    return;
  }

  const legend = L.control({ position: 'bottomright' });
  legend.onAdd = function() {
    const div = L.DomUtil.create('div', 'map-legend');
    div.id = 'map-legend';
    div.innerHTML = STATUS_LEGEND.map(item =>
      `<div class="legend-item"><span class="legend-dot" style="background:${item.color}"></span>${item.label}</div>`
    ).join('') + `<div class="legend-size-note">${sizeNote}</div>`;
    return div;
  };
  legend.addTo(map);
}


// Legislation status simplified for display
const LEG_STATUS_MAP = {
  enacted: { label: 'Enacted', cls: 'leg-enacted' },
  active: { label: 'Active', cls: 'leg-active' },
  advancing: { label: 'Advancing', cls: 'leg-active' },
  pending: { label: 'Pending', cls: 'leg-pending' },
  ongoing: { label: 'Ongoing', cls: 'leg-pending' },
  defeated: { label: 'Defeated', cls: 'leg-defeated' },
  mixed: { label: 'Mixed', cls: 'leg-pending' },
  stalled: { label: 'Stalled', cls: 'leg-defeated' },
};

function getLegStatus(f) {
  const raw = (f.status || '').toLowerCase();
  for (const [key, val] of Object.entries(LEG_STATUS_MAP)) {
    if (raw.startsWith(key) || raw.includes(key)) return val;
  }
  return { label: capitalize(f.status), cls: 'leg-pending' };
}

function updateLegislation() {
  const legislation = getLegislation();
  document.getElementById('legislation-count').textContent = legislation.length;

  const federal = legislation.filter(f => f.scope === 'federal').sort((a, b) => b.date.localeCompare(a.date));
  const statewide = legislation.filter(f => f.scope === 'statewide');

  // Group statewide by state
  const byState = {};
  statewide.forEach(f => {
    byState[f.state] = byState[f.state] || [];
    byState[f.state].push(f);
  });
  const stateKeys = Object.keys(byState).sort();

  // Federal section
  const fedEl = document.getElementById('legislation-federal');
  if (federal.length) {
    fedEl.innerHTML = `
      <h3 class="leg-group-title">Federal</h3>
      <div class="leg-cards">${federal.map(f => renderLegCard(f)).join('')}</div>
    `;
  } else {
    fedEl.innerHTML = '';
  }

  // States section
  const statesEl = document.getElementById('legislation-states');
  statesEl.innerHTML = `
    <h3 class="leg-group-title">State Legislation <span class="leg-state-count">${stateKeys.length} states</span></h3>
    <div class="leg-grid">${stateKeys.map(st => {
      const entries = byState[st].sort((a, b) => b.date.localeCompare(a.date));
      return `
        <div class="leg-state-group">
          <div class="leg-state-name">${st}</div>
          ${entries.map(f => renderLegCard(f)).join('')}
        </div>
      `;
    }).join('')}</div>
  `;

  // Wire click handlers for detail
  document.querySelectorAll('.leg-card[data-id]').forEach(card => {
    card.addEventListener('click', () => {
      const fight = fights.find(f => f.id === card.dataset.id);
      if (fight) openDetail(fight);
    });
  });
}

function renderLegCard(f) {
  const st = getLegStatus(f);
  // Clean jurisdiction for display
  let title = f.jurisdiction
    .replace(/\(statewide[^)]*\)/i, '')
    .replace(/\(federal\)/i, '')
    .trim();
  // Remove state name if it's just the prefix
  const statePrefix = f.state + ' ';
  if (title.startsWith(statePrefix)) title = title.slice(statePrefix.length);
  if (title.startsWith('(')) title = title.slice(1);
  if (title.endsWith(')')) title = title.slice(0, -1);
  title = title.replace(/^[\s,]+|[\s,]+$/g, '').trim();
  if (!title || title === f.state) title = f.action_type;

  // First sentence of summary
  const rawSummary = f.summary || '';
  const firstDot = rawSummary.indexOf('. ');
  const summary = firstDot > 0 ? rawSummary.slice(0, firstDot + 1) : rawSummary.slice(0, 200);

  return `
    <div class="leg-card" data-id="${f.id}">
      <div class="leg-card-top">
        <span class="leg-status ${st.cls}">${st.label}</span>
        <span class="leg-date">${formatDate(f.date)}</span>
      </div>
      <div class="leg-card-title">${title}</div>
      <div class="leg-card-summary">${summary}</div>
    </div>
  `;
}

function updateSortIndicators() {
  document.querySelectorAll('#fights-table thead th[data-sort]').forEach(th => {
    th.classList.remove('sorted-asc', 'sorted-desc');
    if (th.dataset.sort === currentSort.key) {
      th.classList.add(currentSort.dir === 'asc' ? 'sorted-asc' : 'sorted-desc');
    }
  });
}

function updateTable(filtered) {
  const sorted = [...filtered].sort((a, b) => {
    let va = a[currentSort.key] || '';
    let vb = b[currentSort.key] || '';
    if (typeof va === 'string') va = va.toLowerCase();
    if (typeof vb === 'string') vb = vb.toLowerCase();
    if (va < vb) return currentSort.dir === 'asc' ? -1 : 1;
    if (va > vb) return currentSort.dir === 'asc' ? 1 : -1;
    return 0;
  });

  const tbody = document.getElementById('fights-tbody');

  if (spreadsheetMode) {
    // Spreadsheet: show all data columns
    updateSpreadsheetHeader();
    // Apply column filters
    const colFiltered = applyColumnFilters(sorted);
    tbody.innerHTML = colFiltered.map(f => {
      const groups = (f.opposition_groups || []).join('; ');
      const concernsList = (f.concerns || []).map(c => CONCERN_LABELS[c] || c);
      const concernsShort = concernsList.length ? concernsList.length + ' issues' : '';
      const concernsFull = concernsList.join(', ');
      // Build links column
      const links = [];
      if (f.opposition_website) links.push(`<a href="${f.opposition_website}" target="_blank">web</a>`);
      if (f.opposition_facebook) links.push(`<a href="${f.opposition_facebook}" target="_blank">fb</a>`);
      if (f.opposition_instagram) links.push(`<a href="${f.opposition_instagram.startsWith('http') ? f.opposition_instagram : 'https://instagram.com/'+f.opposition_instagram.replace('@','')}" target="_blank">ig</a>`);
      if (f.opposition_twitter) links.push(`<a href="${f.opposition_twitter.startsWith('http') ? f.opposition_twitter : 'https://x.com/'+f.opposition_twitter.replace('@','')}" target="_blank">x</a>`);
      // Petition column
      const petition = f.petition_url ? `<a href="${f.petition_url}" target="_blank">${f.petition_signatures ? f.petition_signatures.toLocaleString()+' sigs' : 'link'}</a>` : (f.petition_signatures ? f.petition_signatures.toLocaleString()+' sigs' : '');
      // Sources column — show count with tooltip
      const srcCount = (f.sources || []).length;
      const srcTooltip = (f.sources || []).map(function(s) { try { return new URL(s).hostname.replace('www.',''); } catch(e) { return s; } }).join(', ');
      const sourcesHtml = srcCount ? `<span title="${escapeHtml(srcTooltip)}">${srcCount} source${srcCount !== 1 ? 's' : ''}</span>` : '';
      // Truncate status to first word, show full on hover
      const statusWord = (f.status || '').split(/[\s\-–]/)[0];
      return `
        <tr data-id="${f.id}">
          <td>${formatDate(f.date)}</td>
          <td><strong>${f.jurisdiction}</strong></td>
          <td>${f.state}</td>
          <td><span class="badge badge-${f.action_type}">${ACTION_LABELS[f.action_type] || f.action_type}</span></td>
          <td><span class="status-badge status-${statusWord.toLowerCase()}" title="${escapeHtml(f.status || '')}">${capitalize(statusWord)}</span></td>
          <td class="links-cell">${links.join(' ')}</td>
          <td class="petition-cell">${petition}</td>
          <td class="truncate-cell" title="${escapeHtml(f.hyperscaler || '')}" style="${f.hyperscaler ? 'font-weight:700;color:'+(HYPERSCALER_INFO[f.hyperscaler]||{}).color : ''}">${f.hyperscaler || ''}</td>
          <td class="truncate-cell" title="${escapeHtml(f.company || '')}">${f.company || ''}</td>
          <td class="truncate-cell" title="${escapeHtml(f.project_name || '')}">${f.project_name || ''}</td>
          <td>${formatInvestment(f.investment_million_usd)}</td>
          <td>${formatPower(f.megawatts)}</td>
          <td>${f.acreage ? f.acreage.toLocaleString() : ''}</td>
          <td class="groups-cell" title="${escapeHtml(groups)}">${groups}</td>
          <td class="summary-cell" title="${escapeHtml(f.summary || '')}">${f.summary || ''}</td>
          <td class="concerns-cell" title="${escapeHtml(concernsFull)}">${concernsShort}</td>
          <td class="sources-cell">${sourcesHtml}</td>
        </tr>
      `;
    }).join('');
  } else {
    // Default compact view
    updateDefaultHeader();
    tbody.innerHTML = sorted.map(f => {
      const statusWord = (f.status || '').split(/[\s\-–]/)[0];
      return `
      <tr data-id="${f.id}">
        <td>${formatDate(f.date)}</td>
        <td><strong>${f.jurisdiction}</strong></td>
        <td>${f.state}</td>
        <td><span class="badge badge-${f.action_type}">${ACTION_LABELS[f.action_type] || f.action_type}</span></td>
        <td><span class="status-badge status-${statusWord.toLowerCase()}" title="${escapeHtml(f.status || '')}">${capitalize(statusWord)}</span></td>
      </tr>
    `}).join('');
  }

  // Row click
  tbody.querySelectorAll('tr').forEach(tr => {
    tr.addEventListener('click', (e) => {
      if (e.target.tagName === 'BUTTON') return;
      const fight = fights.find(f => f.id === tr.dataset.id);
      if (fight) openDetail(fight);
    });
  });
}

function updateDefaultHeader() {
  const thead = document.querySelector('#fights-table thead');
  const headerRow = document.getElementById('table-header-row');
  headerRow.innerHTML = `
    <th data-sort="date">Date</th>
    <th data-sort="jurisdiction">Jurisdiction</th>
    <th data-sort="state">State</th>
    <th data-sort="action_type">Action</th>
    <th data-sort="status">Status</th>
  `;
  // Remove column filter row if present
  const filterRow = thead.querySelector('.col-filter-row');
  if (filterRow) filterRow.remove();
  rebindSortHeaders();
}

function updateSpreadsheetHeader() {
  const thead = document.querySelector('#fights-table thead');
  const headerRow = document.getElementById('table-header-row');
  headerRow.innerHTML = `
    <th data-sort="date">Date</th>
    <th data-sort="jurisdiction">Jurisdiction</th>
    <th data-sort="state">State</th>
    <th data-sort="action_type">Action</th>
    <th data-sort="status">Status</th>
    <th>Links</th>
    <th data-sort="petition_signatures">Petition</th>
    <th data-sort="hyperscaler">Hyperscaler</th>
    <th data-sort="company">Developer</th>
    <th data-sort="project_name">Project</th>
    <th data-sort="investment_million_usd">Investment</th>
    <th data-sort="megawatts">Power</th>
    <th data-sort="acreage">Acres</th>
    <th>Groups</th>
    <th>Summary</th>
    <th>Concerns</th>
    <th>Sources</th>
  `;

  // Add filter row if not present
  let filterRow = thead.querySelector('.col-filter-row');
  if (!filterRow) {
    filterRow = document.createElement('tr');
    filterRow.className = 'col-filter-row';
    const filterCols = [
      { key: 'date', ph: 'Year...' },
      { key: 'jurisdiction', ph: 'Filter...' },
      { key: 'state', ph: 'ST' },
      { key: 'action_type', ph: 'Type...' },
      { key: 'status', ph: 'Status...' },
      { key: '', ph: '' },
      { key: '', ph: '' },
      { key: 'hyperscaler', ph: 'Company...' },
      { key: 'company', ph: 'Dev...' },
      { key: 'project_name', ph: 'Project...' },
      { key: '', ph: '' },
      { key: 'megawatts_filter', ph: 'Min MW' },
      { key: '', ph: '' },
      { key: 'groups', ph: 'Group...' },
      { key: 'summary', ph: 'Keyword...' },
      { key: 'concerns', ph: 'Concern...' },
      { key: '', ph: '' },
    ];
    filterRow.innerHTML = filterCols.map(c => {
      if (!c.key) return '<th></th>';
      return `<th><input class="col-filter-input" data-col="${c.key}" placeholder="${c.ph}" /></th>`;
    }).join('');
    thead.appendChild(filterRow);

    // Bind filter inputs
    filterRow.querySelectorAll('.col-filter-input').forEach(input => {
      input.addEventListener('input', () => render());
      input.addEventListener('click', (e) => e.stopPropagation());
    });
  }

  rebindSortHeaders();
}

function rebindSortHeaders() {
  document.querySelectorAll('#fights-table thead th[data-sort]').forEach(th => {
    th.addEventListener('click', () => {
      const key = th.dataset.sort;
      if (currentSort.key === key) {
        currentSort.dir = currentSort.dir === 'asc' ? 'desc' : 'asc';
      } else {
        currentSort = { key, dir: 'asc' };
      }
      render();
    });
  });
  updateSortIndicators();
}

function applyColumnFilters(rows) {
  if (!spreadsheetMode) return rows;
  const inputs = document.querySelectorAll('.col-filter-input');
  const filters = {};
  inputs.forEach(inp => {
    const val = inp.value.trim().toLowerCase();
    if (val) filters[inp.dataset.col] = val;
  });
  if (Object.keys(filters).length === 0) return rows;

  return rows.filter(f => {
    for (const [col, val] of Object.entries(filters)) {
      if (col === 'megawatts_filter') {
        const minMW = parseInt(val, 10);
        if (!isNaN(minMW) && (!f.megawatts || f.megawatts < minMW)) return false;
      } else if (col === 'concerns') {
        const concernText = (f.concerns || []).map(c => (CONCERN_LABELS[c] || c).toLowerCase()).join(' ');
        if (!concernText.includes(val)) return false;
      } else if (col === 'groups') {
        const groupText = (f.opposition_groups || []).join(' ').toLowerCase();
        if (!groupText.includes(val)) return false;
      } else if (col === 'summary') {
        if (!(f.summary || '').toLowerCase().includes(val)) return false;
      } else {
        const fieldVal = String(f[col] || '').toLowerCase();
        if (!fieldVal.includes(val)) return false;
      }
    }
    return true;
  });
}

function toggleSpreadsheet() {
  spreadsheetMode = !spreadsheetMode;
  const btn = document.getElementById('toggle-view');
  const section = document.getElementById('fights-list');
  btn.textContent = spreadsheetMode ? 'Compact View' : 'Spreadsheet View';
  btn.classList.toggle('active', spreadsheetMode);
  section.classList.toggle('spreadsheet-mode', spreadsheetMode);
  render();
}

function openDetail(f) {
  const panel = document.getElementById('detail-panel');
  const content = document.getElementById('detail-content');

  // Build opposition groups with links
  let groupsHtml;
  if (f.opposition_groups && f.opposition_groups.length) {
    const links = [];
    if (f.opposition_website) links.push({ url: f.opposition_website, icon: 'web', label: 'Website' });
    if (f.opposition_facebook) links.push({ url: f.opposition_facebook, icon: 'fb', label: 'Facebook' });
    if (f.opposition_instagram) {
      const igUrl = f.opposition_instagram.startsWith('http') ? f.opposition_instagram : `https://instagram.com/${f.opposition_instagram.replace('@','')}`;
      const igLabel = f.opposition_instagram_followers ? `Instagram (${f.opposition_instagram_followers.toLocaleString()} followers)` : 'Instagram';
      links.push({ url: igUrl, icon: 'ig', label: igLabel });
    }
    if (f.opposition_twitter) {
      const twUrl = f.opposition_twitter.startsWith('http') ? f.opposition_twitter : `https://x.com/${f.opposition_twitter.replace('@','')}`;
      links.push({ url: twUrl, icon: 'x', label: 'X / Twitter' });
    }
    groupsHtml = f.opposition_groups.map(g => {
      let html = `<div class="group-card"><span class="group-name">${escapeHtml(g)}</span>`;
      if (links.length) {
        html += `<div class="group-links">${links.map(l =>
          `<a href="${l.url}" target="_blank" class="group-link-btn" title="${l.label}">${l.icon}</a>`
        ).join('')}</div>`;
      }
      html += '</div>';
      return html;
    }).join('');
  } else {
    groupsHtml = '<p style="color:var(--text-muted);font-size:0.9rem;">Not yet documented</p>';
  }

  const sources = f.sources && f.sources.length
    ? f.sources.map(s => {
        try { return `<a class="source-link" href="${s}" target="_blank">${new URL(s).hostname}</a>`; }
        catch { return `<a class="source-link" href="${s}" target="_blank">${s}</a>`; }
      }).join('')
    : '<span style="color:var(--text-muted)">No sources</span>';

  // Build project specs section
  const specs = [];
  if (f.investment_million_usd) specs.push(`<li><strong>Investment:</strong> ${formatInvestment(f.investment_million_usd)}</li>`);
  if (f.megawatts) specs.push(`<li><strong>Power:</strong> ${formatPower(f.megawatts)}</li>`);
  if (f.acreage) specs.push(`<li><strong>Acreage:</strong> ${f.acreage.toLocaleString()} acres</li>`);
  if (f.building_sq_ft) specs.push(`<li><strong>Building:</strong> ${f.building_sq_ft.toLocaleString()} sq ft</li>`);
  if (f.water_usage_gallons_per_day) {
    const w = f.water_usage_gallons_per_day;
    const waterStr = w >= 1000000 ? (w / 1000000).toFixed(1).replace(/\.0$/, '') + 'M' : w >= 1000 ? Math.round(w / 1000) + 'K' : w.toLocaleString();
    specs.push(`<li><strong>Water:</strong> ${waterStr} gal/day</li>`);
  }

  // Build opposition links section
  const oppLinks = [];
  if (f.opposition_website) oppLinks.push(`<a href="${f.opposition_website}" target="_blank">Website</a>`);
  if (f.opposition_facebook) {
    const fbLabel = f.opposition_facebook_members ? `Facebook (${f.opposition_facebook_members.toLocaleString()} members)` : 'Facebook';
    oppLinks.push(`<a href="${f.opposition_facebook}" target="_blank">${fbLabel}</a>`);
  }
  if (f.opposition_instagram) {
    const igUrl = f.opposition_instagram.startsWith('http') ? f.opposition_instagram : `https://instagram.com/${f.opposition_instagram.replace('@','')}`;
    const igLabel = f.opposition_instagram_followers ? `Instagram (${f.opposition_instagram_followers.toLocaleString()} followers)` : 'Instagram';
    oppLinks.push(`<a href="${igUrl}" target="_blank">${igLabel}</a>`);
  }
  if (f.opposition_twitter) {
    const twUrl = f.opposition_twitter.startsWith('http') ? f.opposition_twitter : `https://x.com/${f.opposition_twitter.replace('@','')}`;
    oppLinks.push(`<a href="${twUrl}" target="_blank">X/Twitter</a>`);
  }
  if (f.petition_url) {
    const petLabel = f.petition_signatures ? `Petition (${f.petition_signatures.toLocaleString()} signatures)` : 'Petition';
    oppLinks.push(`<a href="${f.petition_url}" target="_blank">${petLabel}</a>`);
  } else if (f.petition_signatures) {
    oppLinks.push(`<span>Petition (${f.petition_signatures.toLocaleString()} signatures)</span>`);
  }

  // Concerns
  const concerns = f.concerns && f.concerns.length
    ? f.concerns.map(c => `<span class="concern-tag">${CONCERN_LABELS[c] || capitalize(c)}</span>`).join(' ')
    : '';

  content.innerHTML = `
    <h2>${f.jurisdiction}, ${f.state}</h2>
    <div class="detail-meta">
      <span class="badge badge-${f.action_type}">${ACTION_LABELS[f.action_type] || f.action_type}</span>
      &nbsp;&middot;&nbsp;
      <span class="status-badge status-${f.status}">${capitalize(f.status)}</span>
      &nbsp;&middot;&nbsp;
      ${formatDate(f.date)}
    </div>

    ${f.summary ? `<div class="detail-section"><h3>Summary</h3><p>${f.summary}</p></div>` : ''}

    ${f.hyperscaler ? `<div class="detail-section"><h3>Hyperscaler / End User</h3><p style="font-size:1.1rem;font-weight:700;color:${(HYPERSCALER_INFO[f.hyperscaler]||{}).color||'var(--text)'}">${f.hyperscaler}</p>${f.company && f.company !== f.hyperscaler ? `<p style="color:var(--text-muted);font-size:0.85rem;">Developer: ${f.company}</p>` : ''}</div>` : (f.company ? `<div class="detail-section"><h3>Company</h3><p>${f.company}</p></div>` : '')}
    ${f.project_name ? `<div class="detail-section"><h3>Project</h3><p>${f.project_name}</p></div>` : ''}

    ${specs.length ? `<div class="detail-section"><h3>Project Specs</h3><ul>${specs.join('')}</ul></div>` : ''}

    ${concerns ? `<div class="detail-section"><h3>Community Concerns</h3><div class="concerns-list">${concerns}</div></div>` : ''}

    <div class="detail-section">
      <h3>Opposition Groups</h3>
      <div class="groups-container">${groupsHtml}</div>
    </div>

    ${oppLinks.length ? `<div class="detail-section"><h3>Opposition Links</h3><div class="opp-links">${oppLinks.map(l => `<span class="opp-link">${l}</span>`).join('')}</div></div>` : ''}

    <div class="detail-section">
      <h3>Sources</h3>
      ${sources}
    </div>

    <div class="detail-section" style="color:var(--text-muted); font-size:0.8rem;">
      Data source: ${f.data_source} &middot; Last updated: ${f.last_updated}
    </div>
  `;

  panel.classList.add('open');
}

function closePanel() {
  document.getElementById('detail-panel').classList.remove('open');
}

function clearFilters() {
  document.getElementById('filter-state').value = '';
  document.getElementById('filter-type').value = '';
  document.getElementById('filter-year').value = '';
  document.getElementById('filter-concern').value = '';
  selectedHyperscalers.clear();
  document.getElementById('size-by').value = 'energy';
  document.getElementById('search-input').value = '';
  render();
}

// Download functions
function downloadCSV() {
  const filtered = getFiltered();
  const headers = [
    'date', 'jurisdiction', 'state', 'action_type', 'status', 'hyperscaler', 'company',
    'project_name', 'investment_million_usd', 'megawatts', 'acreage',
    'opposition_groups', 'concerns', 'summary', 'sources',
    'opposition_website', 'opposition_facebook', 'opposition_instagram', 'petition_url', 'petition_signatures',
  ];
  const csvRows = [headers.join(',')];
  filtered.forEach(f => {
    const row = headers.map(h => {
      let val = f[h];
      if (Array.isArray(val)) val = val.join('; ');
      if (val == null) val = '';
      val = String(val).replace(/"/g, '""');
      return `"${val}"`;
    });
    csvRows.push(row.join(','));
  });
  downloadFile('datacenter-fights.csv', csvRows.join('\n'), 'text/csv');
}

function downloadJSON() {
  const filtered = getFiltered();
  downloadFile('datacenter-fights.json', JSON.stringify(filtered, null, 2), 'application/json');
}

function downloadFile(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function formatInvestment(millions) {
  if (!millions) return '';
  if (millions >= 1000) {
    const b = millions / 1000;
    return '$' + (b % 1 === 0 ? b.toLocaleString() : b.toFixed(1)) + 'B';
  }
  return '$' + millions.toLocaleString() + 'M';
}

function formatPower(mw) {
  if (!mw) return '';
  if (mw >= 1000) {
    const gw = mw / 1000;
    return (gw % 1 === 0 ? gw.toLocaleString() : gw.toFixed(1)) + ' GW';
  }
  return mw.toLocaleString() + ' MW';
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
}

function capitalize(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, ' ') : '';
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
