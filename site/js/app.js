/**
 * US Datacenter Fights — Interactive map and database viewer
 */

let fights = [];
let map;
let markers = [];
let currentSort = { key: 'petition_signatures', dir: 'desc' };
let selectedHyperscalers = new Set();

const ACTION_LABELS = {
  moratorium: 'Moratorium',
  zoning_restriction: 'Zoning Restriction',
  lawsuit: 'Lawsuit',
  permit_denial: 'Permit Denial',
  legislation: 'Legislation',
  other: 'Other',
};

// Status-based map colors
const STATUS_COLORS = {
  active: '#66800B',
  cancelled: '#66800B',
  ongoing: '#AD8301',
  pending: '#BC5215',
  delayed: '#BC5215',
  approved: '#AF3029',
  expired: '#878580',
  mixed: '#878580',
};

const STATUS_LEGEND = [
  { color: '#66800B', label: 'Protected' },
  { color: '#AD8301', label: 'Ongoing' },
  { color: '#BC5215', label: 'Pending' },
  { color: '#AF3029', label: 'Approved' },
  { color: '#878580', label: 'Other' },
];

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

  // Apply URL params before first render
  // Read ?id= BEFORE render() which clears it
  const urlId = new URLSearchParams(window.location.search).get('id');

  applyUrlParams();
  render();

  // If URL had ?id=, open that fight's detail panel in fullscreen
  if (urlId) {
    const fight = fights.find(f => f.id === urlId);
    if (fight) {
      setTimeout(() => {
        openDetail(fight);
        toggleFullscreen(fight.id);
      }, 100);
    }
  }

  // Show last updated from most recent entry
  const dates = fights.map(f => f.last_updated || f.date).filter(Boolean).sort();
  if (dates.length) {
    const latest = dates[dates.length - 1];
    document.getElementById('last-updated').textContent = 'Last updated: ' + new Date(latest + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  }

  document.getElementById('filter-state').addEventListener('change', render);
  document.getElementById('filter-type').addEventListener('change', render);
  document.getElementById('filter-year').addEventListener('change', render);
  document.getElementById('filter-lean').addEventListener('change', render);
  document.getElementById('filter-status').addEventListener('change', render);
  document.getElementById('filter-issue').addEventListener('change', render);
  document.getElementById('filter-hyperscaler').addEventListener('change', render);
  document.getElementById('size-by').addEventListener('change', render);
  document.getElementById('clear-filters').addEventListener('click', clearFilters);
  document.getElementById('search-input').addEventListener('input', render);
  document.getElementById('close-panel').addEventListener('click', closePanel);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closePanel();
  });

  document.getElementById('download-csv').addEventListener('click', downloadCSV);
  document.getElementById('download-json').addEventListener('click', downloadJSON);

  // Delegated hover for status-tip tooltips (position: fixed)
  document.addEventListener('mouseenter', (e) => {
    const badge = e.target.closest('.status-badge');
    if (!badge) return;
    const tip = badge.querySelector('.status-tip');
    if (!tip) return;
    const rect = badge.getBoundingClientRect();
    tip.style.left = rect.left + rect.width / 2 + 'px';
    tip.style.top = rect.top - 8 + 'px';
    tip.style.transform = 'translate(-50%, -100%)';
    tip.style.display = 'block';
  }, true);
  document.addEventListener('mouseleave', (e) => {
    const badge = e.target.closest('.status-badge');
    if (!badge) return;
    const tip = badge.querySelector('.status-tip');
    if (tip) tip.style.display = 'none';
  }, true);

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
  window._mapIsDark = false;

  map = new maplibregl.Map({
    container: 'map',
    style: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
    center: [-96.0, 39.0],
    zoom: 3.5,
    minZoom: 3,
    maxZoom: 18,
    maxBounds: [[-180, -10], [-30, 75]],
    attributionControl: true,
    dragRotate: false,
    pitchWithRotate: false,
    touchPitch: false,
  });

  map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');

  // Tooltip element for hover
  window._mapTooltip = document.createElement('div');
  window._mapTooltip.className = 'map-tooltip';
  window._mapTooltip.style.display = 'none';
  document.getElementById('map').appendChild(window._mapTooltip);

  map.on('load', () => {
    // Add US mask to grey out non-US areas
    fetch('data/us-mask.json')
      .then(r => r.json())
      .then(maskData => {
        map.addSource('us-mask', { type: 'geojson', data: maskData });
        map.addLayer({
          id: 'us-mask-fill',
          type: 'fill',
          source: 'us-mask',
          paint: {
            'fill-color': '#CECDC3',
            'fill-opacity': 0.55,
          },
        });
      })
      .catch(() => {});

    // Add empty GeoJSON source for fight circles
    map.addSource('fights', {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
    });

    // Circle layer
    map.addLayer({
      id: 'fights-circles',
      type: 'circle',
      source: 'fights',
      paint: {
        'circle-radius': ['get', 'radius'],
        'circle-color': ['get', 'color'],
        'circle-opacity': 0.7,
        'circle-stroke-width': 2,
        'circle-stroke-color': ['get', 'color'],
        'circle-stroke-opacity': 0.9,
      },
    });

    // Hover interactivity for circles
    map.on('mouseenter', 'fights-circles', (e) => {
      map.getCanvas().style.cursor = 'pointer';
      if (e.features.length > 0) {
        const props = e.features[0].properties;
        window._mapTooltip.innerHTML = props.tooltipHtml;
        window._mapTooltip.style.display = 'block';
      }
    });
    map.on('mousemove', 'fights-circles', (e) => {
      const rect = map.getContainer().getBoundingClientRect();
      window._mapTooltip.style.left = (e.point.x) + 'px';
      window._mapTooltip.style.top = (e.point.y) + 'px';
    });
    map.on('mouseleave', 'fights-circles', () => {
      map.getCanvas().style.cursor = '';
      window._mapTooltip.style.display = 'none';
    });

    // Click handler for circles
    map.on('click', 'fights-circles', (e) => {
      if (e.features.length > 0) {
        const fightId = e.features[0].properties.fightId;
        const fight = fights.find(f => f.id === fightId);
        if (fight) openDetail(fight);
      }
    });

    // Signal that the map is ready for data
    window._mapReady = true;
    if (window._pendingMapUpdate) {
      window._pendingMapUpdate();
      window._pendingMapUpdate = null;
    }
  });
}


function reapplyMapData() {
  // Re-add mask
  fetch('data/us-mask.json')
    .then(r => r.json())
    .then(maskData => {
      map.addSource('us-mask', { type: 'geojson', data: maskData });
      map.addLayer({
        id: 'us-mask-fill',
        type: 'fill',
        source: 'us-mask',
        paint: {
          'fill-color': window._mapIsDark ? '#000000' : '#d5d0c8',
          'fill-opacity': window._mapIsDark ? 0.6 : 0.55,
        },
      });
    })
    .catch(() => {});

  // Re-add fights source and layer
  map.addSource('fights', {
    type: 'geojson',
    data: { type: 'FeatureCollection', features: [] },
  });
  map.addLayer({
    id: 'fights-circles',
    type: 'circle',
    source: 'fights',
    paint: {
      'circle-radius': ['get', 'radius'],
      'circle-color': ['get', 'color'],
      'circle-opacity': window._mapIsDark ? 0.85 : 0.7,
      'circle-stroke-width': window._mapIsDark ? 1.5 : 2,
      'circle-stroke-color': window._mapIsDark ? '#ffffff' : ['get', 'color'],
      'circle-stroke-opacity': window._mapIsDark ? 0.6 : 0.9,
    },
  });

  // Re-wire hover/click
  map.on('mouseenter', 'fights-circles', (e) => {
    map.getCanvas().style.cursor = 'pointer';
    if (e.features.length > 0) {
      window._mapTooltip.innerHTML = e.features[0].properties.tooltipHtml;
      window._mapTooltip.style.display = 'block';
    }
  });
  map.on('mousemove', 'fights-circles', (e) => {
    window._mapTooltip.style.left = (e.point.x) + 'px';
    window._mapTooltip.style.top = (e.point.y) + 'px';
  });
  map.on('mouseleave', 'fights-circles', () => {
    map.getCanvas().style.cursor = '';
    window._mapTooltip.style.display = 'none';
  });
  map.on('click', 'fights-circles', (e) => {
    if (e.features.length > 0) {
      const fight = fights.find(f => f.id === e.features[0].properties.fightId);
      if (fight) openDetail(fight);
    }
  });

  // Trigger a re-render to populate data
  render();
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

  // Populate status filter
  const statusCounts = {};
  localFights.forEach(f => { if (f.status) statusCounts[f.status] = (statusCounts[f.status] || 0) + 1; });
  const statusSelect = document.getElementById('filter-status');
  Object.keys(statusCounts).sort().forEach(s => {
    const opt = document.createElement('option');
    opt.value = s;
    opt.textContent = `${s.charAt(0).toUpperCase() + s.slice(1)} (${statusCounts[s]})`;
    statusSelect.appendChild(opt);
  });

  // Populate hyperscaler filter
  const hyperCounts = {};
  localFights.forEach(f => { if (f.hyperscaler) hyperCounts[f.hyperscaler] = (hyperCounts[f.hyperscaler] || 0) + 1; });
  const hyperSelect = document.getElementById('filter-hyperscaler');
  Object.keys(hyperCounts).sort().forEach(h => {
    const opt = document.createElement('option');
    opt.value = h;
    opt.textContent = `${h} (${hyperCounts[h]})`;
    hyperSelect.appendChild(opt);
  });
}

function getFiltered() {
  const state = document.getElementById('filter-state').value;
  const type = document.getElementById('filter-type').value;
  const year = document.getElementById('filter-year').value;
  const lean = document.getElementById('filter-lean').value;
  const status = document.getElementById('filter-status').value;
  const hyperscaler = document.getElementById('filter-hyperscaler').value;
  const search = document.getElementById('search-input').value.toLowerCase();

  const issue = document.getElementById('filter-issue').value;

  const base = fights.filter(f => {
    if (state && f.state !== state) return false;
    if (type && f.action_type !== type) return false;
    if (year && !f.date.startsWith(year)) return false;
    if (lean && f.county_lean !== lean) return false;
    if (status && f.status !== status) return false;
    if (issue && !(f.issue_category || []).includes(issue)) return false;
    if (hyperscaler && f.hyperscaler !== hyperscaler) return false;
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

  // Apply spreadsheet column filters so map stays in sync
  return applyColumnFilters(base);
}

function render() {
  const filtered = getFiltered();
  updateStats(filtered);
  updateMap(filtered);
  updateTable(filtered);
  updateSortIndicators();
  updateSizeLegend(filtered);
  // Update URL to reflect current filters (skip on initial load)
  if (typeof updateUrlFromFilters === 'function') updateUrlFromFilters();
}

function updateSizeLegend(filtered) {
  const sizeBy = document.getElementById('size-by').value;
  const metric = SIZE_METRICS[sizeBy] || SIZE_METRICS.energy;
  const values = filtered.map(f => metric.getValue(f)).filter(v => v != null && v > 0);
  const legend = document.getElementById('size-legend');
  if (!legend || values.length === 0) { if (legend) legend.textContent = ''; return; }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const fmt = (v) => {
    if (v >= 1e9) return '$' + (v/1e9).toFixed(0) + 'B';
    if (v >= 1e6) return '$' + (v/1e6).toFixed(0) + 'M';
    if (v >= 1e3) return (v/1e3).toFixed(0) + 'K';
    return v.toLocaleString();
  };
  legend.innerHTML = `<span class="legend-range">${metric.label}: ${fmt(min)} – ${fmt(max)} (${values.length} entries)</span>`;
}

function updateStats(filtered) {
  document.getElementById('stat-total').textContent = filtered.length;
  document.getElementById('stat-states').textContent = new Set(filtered.map(f => f.state)).size;
  const totalInvestment = filtered.filter(f => f.investment_million_usd).reduce((s, f) => s + f.investment_million_usd, 0);
  document.getElementById('stat-investment').textContent = totalInvestment > 0 ? formatInvestment(totalInvestment) : '—';
  document.getElementById('stat-moratoria').textContent = filtered.filter(f => f.action_type === 'moratorium').length;
  const rCount = filtered.filter(f => f.county_lean === 'R').length;
  const dCount = filtered.filter(f => f.county_lean === 'D').length;
  document.querySelector('.partisan-r').textContent = rCount + 'R';
  document.querySelector('.partisan-d').textContent = dCount + 'D';
  document.getElementById('fights-count').textContent = filtered.length;
  updateOutcomeBar(filtered);
  updateHyperscalerBar(filtered);
}

function updateOutcomeBar(filtered) {
  const bar = document.getElementById('outcome-bar');
  const wonStatuses = new Set(['active','cancelled']);
  const ongoingStatuses = new Set(['ongoing','pending','delayed']);
  const lostStatuses = new Set(['approved']);

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
      <span class="outcome-label" style="color:#66800B">Protected: ${won} (${pWon}%)</span>
      <span class="outcome-label" style="color:#AD8301">Ongoing: ${ongoing} (${pOngoing}%)</span>
      <span class="outcome-label" style="color:#AF3029">Approved: ${lost} (${pLost}%)</span>
    </div>
    <div class="outcome-track">
      <div class="outcome-segment" style="width:${pWon}%;background:#66800B" title="Protected: ${won}"></div>
      <div class="outcome-segment" style="width:${pOngoing}%;background:#AD8301" title="Ongoing: ${ongoing}"></div>
      <div class="outcome-segment" style="width:${pLost}%;background:#AF3029" title="Approved: ${lost}"></div>
      <div class="outcome-segment" style="width:${100-pWon-pOngoing-pLost}%;background:#878580" title="Other: ${other}"></div>
    </div>
  `;
}

function updateHyperscalerBar(filtered) {
  const bar = document.getElementById('hyperscaler-bar');
  if (!bar) return;
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
      return `<span class="hs-chip${isActive ? ' hs-active' : ''}" data-hs="${name}">${name} <span class="hs-count">${count}</span></span>`;
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
  if (!window._mapReady) {
    window._pendingMapUpdate = () => updateMap(filtered);
    return;
  }

  // Remove old HTML markers (if any from previous render)
  markers.forEach(m => m.remove());
  markers = [];

  // Build GeoJSON features — all dots use status color
  const features = [];
  filtered.forEach(f => {
    if (!f.lat || !f.lng) return;
    const color = STATUS_COLORS[f.status] || '#8888a0';
    const radius = getMarkerRadius(f);
    const companyLabel = f.hyperscaler || f.company || '';
    const sizeTip = getSizeTooltipLabel(f);
    const scaleLabel = sizeTip ? ` &middot; ${sizeTip}` : '';
    const tooltipHtml = `<strong>${escapeHtml(f.jurisdiction)}, ${f.state}</strong> &middot; ${capitalize(f.status)}${companyLabel ? ' &middot; ' + escapeHtml(companyLabel) : ''}${scaleLabel}`;
    features.push({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [f.lng, f.lat] },
      properties: {
        fightId: f.id,
        color: color,
        radius: radius,
        tooltipHtml: tooltipHtml,
      },
    });
  });

  // Update the GeoJSON source
  const source = map.getSource('fights');
  if (source) {
    source.setData({ type: 'FeatureCollection', features });
  }

  // Update paint for dark mode
  if (map.getLayer('fights-circles')) {
    map.setPaintProperty('fights-circles', 'circle-opacity', window._mapIsDark ? 0.85 : 0.7);
    map.setPaintProperty('fights-circles', 'circle-stroke-width', window._mapIsDark ? 1.5 : 2);
    map.setPaintProperty('fights-circles', 'circle-stroke-color', window._mapIsDark ? '#ffffff' : ['get', 'color']);
    map.setPaintProperty('fights-circles', 'circle-stroke-opacity', window._mapIsDark ? 0.6 : 0.9);
  }

  // Fit bounds when any filter is active
  const hasColFilter = Array.from(document.querySelectorAll('.col-filter-input')).some(inp => inp.value.trim());
  const hasActiveFilter = document.getElementById('filter-state').value ||
    document.getElementById('filter-type').value ||
    document.getElementById('filter-year').value ||
    document.getElementById('filter-lean').value ||
    document.getElementById('filter-status').value ||
    document.getElementById('filter-hyperscaler').value ||
    document.getElementById('search-input').value.trim() ||
    selectedHyperscalers.size > 0 ||
    hasColFilter;
  if (hasActiveFilter && features.length > 0) {
    const allCoords = filtered.filter(f => f.lat && f.lng).map(f => [f.lng, f.lat]);
    if (allCoords.length > 0) {
      const bounds = allCoords.reduce((b, coord) => b.extend(coord), new maplibregl.LngLatBounds(allCoords[0], allCoords[0]));
      map.fitBounds(bounds, { padding: 50, maxZoom: 10 });
    }
  } else if (!hasActiveFilter) {
    // Reset to full US view when filters are cleared
    map.fitBounds([[-128, 23], [-65, 50]], { padding: 20 });
  }

  updateMapLegend();
}

function updateMapLegend() {
  const sizeBy = document.getElementById('size-by').value;
  const metric = SIZE_METRICS[sizeBy] || SIZE_METRICS.energy;
  const sizeNote = `Dot size = ${metric.label}`;

  const existing = document.getElementById('map-legend');
  if (existing) {
    const noteEl = existing.querySelector('.legend-size-note');
    if (noteEl) noteEl.textContent = sizeNote;
    return;
  }

  const div = document.createElement('div');
  div.className = 'map-legend';
  div.id = 'map-legend';
  div.innerHTML = STATUS_LEGEND.map(item =>
    `<div class="legend-item"><span class="legend-dot" style="background:${item.color}"></span>${item.label}</div>`
  ).join('') + `<div class="legend-size-note">${sizeNote}</div>`;
  document.getElementById('map').appendChild(div);
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
    let va = a[currentSort.key];
    let vb = b[currentSort.key];
    // Push nulls/undefined to the end regardless of sort direction
    if (va == null && vb == null) return 0;
    if (va == null) return 1;
    if (vb == null) return -1;
    if (typeof va === 'string') va = va.toLowerCase();
    if (typeof vb === 'string') vb = vb.toLowerCase();
    if (va < vb) return currentSort.dir === 'asc' ? -1 : 1;
    if (va > vb) return currentSort.dir === 'asc' ? 1 : -1;
    return 0;
  });

  const tbody = document.getElementById('fights-tbody');

  updateSpreadsheetHeader();
  tbody.innerHTML = sorted.map(f => {
    const groups = (f.opposition_groups || []).join('; ');
    const links = [];
    if (f.opposition_website) links.push(`<a href="${f.opposition_website}" target="_blank">web</a>`);
    if (f.opposition_facebook) links.push(`<a href="${f.opposition_facebook}" target="_blank">fb</a>`);
    if (f.opposition_instagram) links.push(`<a href="${f.opposition_instagram.startsWith('http') ? f.opposition_instagram : 'https://instagram.com/'+f.opposition_instagram.replace('@','')}" target="_blank">ig</a>`);
    if (f.opposition_twitter) links.push(`<a href="${f.opposition_twitter.startsWith('http') ? f.opposition_twitter : 'https://x.com/'+f.opposition_twitter.replace('@','')}" target="_blank">x</a>`);
    const petition = f.petition_url ? `<a href="${f.petition_url}" target="_blank">${f.petition_signatures ? f.petition_signatures.toLocaleString()+' sigs' : 'link'}</a>` : (f.petition_signatures ? f.petition_signatures.toLocaleString()+' sigs' : '');
    const srcCount = (f.sources || []).length;
    const srcTooltip = (f.sources || []).map(function(s) { try { return new URL(s).hostname.replace('www.',''); } catch(e) { return s; } }).join(', ');
    const sourcesHtml = srcCount ? `<span title="${escapeHtml(srcTooltip)}">${srcCount} source${srcCount !== 1 ? 's' : ''}</span>` : '';
    const statusWord = (f.status || '').split(/[\s\-–]/)[0];
    return `
      <tr data-id="${f.id}">
        <td>${formatDate(f.date)}</td>
        <td><strong>${f.jurisdiction}</strong></td>
        <td>${f.state}</td>
        <td>${f.county || ''}</td>
        <td><span class="badge badge-${f.action_type}">${ACTION_LABELS[f.action_type] || f.action_type}</span></td>
        <td><span class="status-badge status-${statusWord.toLowerCase()}">${capitalize(statusWord)}<span class="info-icon">i</span><span class="status-tip">${escapeHtml(getStatusTooltip(f.status))}</span></span></td>
        <td class="issue-cell">${(f.issue_category || []).map(c => `<span class="issue-tag-sm">${c.replace(/_/g,' ')}</span>`).join(' ')}</td>
        <td class="objective-cell" title="${escapeHtml(f.objective || '')}">${f.objective || ''}</td>
        <td class="petition-cell">${petition}</td>
        <td class="links-cell">${links.join(' ')}</td>
        <td class="truncate-cell" title="${escapeHtml(f.hyperscaler || '')}" style="${f.hyperscaler ? 'font-weight:700' : ''}">${f.hyperscaler || ''}</td>
        <td class="truncate-cell" title="${escapeHtml(f.company || '')}">${f.company || ''}</td>
        <td>${formatInvestment(f.investment_million_usd)}</td>
        <td>${formatPower(f.megawatts)}</td>
        <td>${f.acreage ? f.acreage.toLocaleString() : ''}</td>
        <td style="text-align:center">${f.county_lean ? `<span class="status-badge ${f.county_lean === 'R' ? 'partisan-r' : 'partisan-d'}" style="font-weight:600">${f.county_lean}<span class="info-icon">i</span><span class="status-tip">Based on 2024 presidential election results in ${escapeHtml(f.county || 'this county')}</span></span>` : ''}</td>
        <td class="groups-cell" title="${escapeHtml(groups)}">${groups}</td>
        <td class="summary-cell" title="${escapeHtml(f.summary || '')}">${f.summary || ''}</td>
        <td class="sources-cell">${sourcesHtml}</td>
      </tr>
    `;
  }).join('');

  // Row click
  tbody.querySelectorAll('tr').forEach(tr => {
    tr.addEventListener('click', (e) => {
      if (e.target.tagName === 'BUTTON') return;
      const fight = fights.find(f => f.id === tr.dataset.id);
      if (fight) openDetail(fight);
    });
  });
}


function updateSpreadsheetHeader() {
  const thead = document.querySelector('#fights-table thead');
  const headerRow = document.getElementById('table-header-row');
  headerRow.innerHTML = `
    <th data-sort="date">Date</th>
    <th data-sort="jurisdiction">Jurisdiction</th>
    <th data-sort="state">State</th>
    <th data-sort="county">County</th>
    <th data-sort="action_type">Action</th>
    <th data-sort="status">Status</th>
    <th>Issue</th>
    <th>Objective</th>
    <th data-sort="petition_signatures">Petition</th>
    <th>Links</th>
    <th data-sort="hyperscaler">Company</th>
    <th data-sort="company">Developer</th>
    <th data-sort="investment_million_usd">Investment</th>
    <th data-sort="megawatts">Power</th>
    <th data-sort="acreage">Acres</th>
    <th data-sort="county_lean">Lean</th>
    <th>Groups</th>
    <th>Summary</th>
    <th>Sources</th>
  `;

  // Add filter row if not present
  let filterRow = thead.querySelector('.col-filter-row');
  if (!filterRow) {
    filterRow = document.createElement('tr');
    filterRow.className = 'col-filter-row';
    const filterCols = [
      { key: 'date', ph: 'Year...' },       // Date
      { key: 'jurisdiction', ph: 'Filter...' }, // Jurisdiction
      { key: 'state', ph: 'ST' },            // State
      { key: 'county', ph: 'County...' },    // County
      { key: 'action_type', ph: 'Type...' }, // Action
      { key: 'status', ph: 'Status...' },    // Status
      { key: 'issue_category', ph: 'Issue...' }, // Issue
      { key: 'objective', ph: 'Objective...' }, // Objective
      { key: '', ph: '' },                   // Petition
      { key: '', ph: '' },                   // Links
      { key: 'hyperscaler', ph: 'Company...' }, // Company
      { key: 'company', ph: 'Dev...' },      // Developer
      { key: '', ph: '' },                   // Investment
      { key: 'megawatts_filter', ph: 'Min MW' }, // Power
      { key: '', ph: '' },                   // Acres
      { key: 'county_lean', ph: 'R/D' },     // Lean
      { key: 'groups', ph: 'Group...' },     // Groups
      { key: 'summary', ph: 'Keyword...' },  // Summary
      { key: '', ph: '' },                   // Sources
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
    // Clone-replace to remove any stacked listeners from previous renders
    const clone = th.cloneNode(true);
    th.parentNode.replaceChild(clone, th);
    clone.addEventListener('click', () => {
      const key = clone.dataset.sort;
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
      } else if (col === 'groups') {
        const groupText = (f.opposition_groups || []).join(' ').toLowerCase();
        if (!groupText.includes(val)) return false;
      } else if (col === 'issue_category') {
        const issueText = (f.issue_category || []).join(' ').toLowerCase();
        if (!issueText.includes(val)) return false;
      } else if (col === 'objective') {
        if (!(f.objective || '').toLowerCase().includes(val)) return false;
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


function openDetail(f) {
  const panel = document.getElementById('detail-panel');
  const content = document.getElementById('detail-content');

  // Update URL with ?id= for shareable links
  const url = new URL(window.location);
  url.searchParams.set('id', f.id);
  history.replaceState(null, '', url.pathname + url.search);

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
    groupsHtml = f.opposition_groups.map(g =>
      `<div class="group-card"><span class="group-name">${escapeHtml(g)}</span></div>`
    ).join('');
    if (links.length) {
      groupsHtml += `<div class="group-links" style="margin-top:0.5rem;">${links.map(l =>
        `<a href="${l.url}" target="_blank" class="group-link-btn" title="${l.label}">${l.icon}</a>`
      ).join('')}</div>`;
    }
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

  content.innerHTML = `
    <div class="detail-toolbar">
      <button class="btn-share" onclick="copyShareLink()" title="Copy link to this fight">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M6 3H3a1 1 0 00-1 1v9a1 1 0 001 1h9a1 1 0 001-1v-3M9 1h6m0 0v6m0-6L8 8"/></svg>
        <span class="share-label">Share</span>
      </button>
      <button class="btn-expand" onclick="toggleFullscreen('${f.id}')" title="Full screen view">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M2 6V2h4M14 6V2h-4M2 10v4h4M14 10v4h-4"/></svg>
      </button>
    </div>
    <h2>${f.jurisdiction}, ${f.state}</h2>
    ${f.county ? `<div class="detail-county">${f.county}, ${f.state}</div>` : ''}
    <div class="detail-meta">
      <span class="badge badge-${f.action_type}">${ACTION_LABELS[f.action_type] || f.action_type}</span>
      &nbsp;&middot;&nbsp;
      <span class="status-badge status-${f.status}">${capitalize(f.status)}<span class="info-icon">i</span><span class="status-tip">${escapeHtml(getStatusTooltip(f.status))}</span></span>
      &nbsp;&middot;&nbsp;
      ${formatDate(f.date)}
    </div>

    ${f.objective ? `<div class="detail-section"><h3>Objective</h3><p style="font-weight:600;font-size:1.05rem;">${f.objective}</p></div>` : ''}

    ${f.issue_category && f.issue_category.length ? `<div class="detail-section"><h3>Issue Categories</h3><div class="issue-tags">${f.issue_category.map(c => `<span class="issue-tag">${c.replace(/_/g, ' ')}</span>`).join('')}</div></div>` : ''}

    ${f.authority_level ? `<div class="detail-section"><h3>Authority Level</h3><p style="text-transform:capitalize">${f.authority_level.replace(/_/g, ' ')}</p></div>` : ''}

    ${f.community_outcome ? `<div class="detail-section"><h3>Community Outcome</h3><p><span class="outcome-badge outcome-${f.community_outcome}">${f.community_outcome === 'win' ? 'Community Won' : f.community_outcome === 'win_withdrawal' ? 'Developer Withdrew' : f.community_outcome === 'loss' ? 'Project Approved' : f.community_outcome === 'partial' ? 'Delayed' : f.community_outcome === 'expired' ? 'Expired' : 'Pending'}</span></p></div>` : ''}

    ${f.summary ? `<div class="detail-section"><h3>Summary</h3><p>${f.summary}</p></div>` : ''}

    ${f.bill_url ? `<div class="detail-section bill-link-section"><h3>Official Bill</h3><a href="${f.bill_url}" target="_blank" class="bill-link">${f.bill_name || 'View Bill Text'} ↗</a></div>` : ''}

    ${f.hyperscaler ? `<div class="detail-section"><h3>Hyperscaler / End User</h3><p style="font-size:1.1rem;font-weight:700;color:${(HYPERSCALER_INFO[f.hyperscaler]||{}).color||'var(--text)'}">${f.hyperscaler}</p>${f.company && f.company !== f.hyperscaler ? `<p style="color:var(--text-muted);font-size:0.85rem;">Developer: ${f.company}</p>` : ''}</div>` : (f.company ? `<div class="detail-section"><h3>Company</h3><p>${f.company}</p></div>` : '')}
    ${f.project_name ? `<div class="detail-section"><h3>Project</h3><p>${f.project_name}</p></div>` : ''}

    ${specs.length ? `<div class="detail-section"><h3>Project Specs</h3><ul>${specs.join('')}</ul></div>` : ''}

    <div class="detail-section">
      <h3>${f.scope === 'statewide' || f.scope === 'federal' ? 'Supporting Organizations' : 'Opposition Groups'}</h3>
      <div class="groups-container">${groupsHtml}</div>
    </div>

    ${oppLinks.length ? `<div class="detail-section"><h3>${f.scope === 'statewide' || f.scope === 'federal' ? 'Advocacy Links' : 'Opposition Links'}</h3><div class="opp-links">${oppLinks.map(l => `<span class="opp-link">${l}</span>`).join('')}</div></div>` : ''}

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
  document.getElementById('detail-panel').classList.remove('fullscreen');
  document.body.classList.remove('detail-fullscreen');
  // Remove ?id= from URL
  const url = new URL(window.location);
  if (url.searchParams.has('id')) {
    url.searchParams.delete('id');
    history.replaceState(null, '', url.pathname + (url.search || ''));
  }
}

function copyShareLink() {
  const url = window.location.href;
  navigator.clipboard.writeText(url).then(() => {
    const btn = document.querySelector('.btn-share .share-label');
    if (btn) {
      const orig = btn.textContent;
      btn.textContent = 'Copied!';
      setTimeout(() => { btn.textContent = orig; }, 1500);
    }
  });
}

function toggleFullscreen(fightId) {
  const panel = document.getElementById('detail-panel');
  const isFs = panel.classList.toggle('fullscreen');
  document.body.classList.toggle('detail-fullscreen', isFs);

  // Swap expand icon to back arrow when fullscreen
  const btn = panel.querySelector('.btn-expand');
  if (btn) {
    btn.innerHTML = isFs
      ? '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M10 2L4 8l6 6"/></svg>'
      : '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M2 6V2h4M14 6V2h-4M2 10v4h4M14 10v4h-4"/></svg>';
  }
}

// --- Shareable URL support ---

function applyUrlParams() {
  const params = new URLSearchParams(window.location.search);
  if (params.get('state')) document.getElementById('filter-state').value = params.get('state');
  if (params.get('type')) document.getElementById('filter-type').value = params.get('type');
  if (params.get('year')) document.getElementById('filter-year').value = params.get('year');
  if (params.get('lean')) document.getElementById('filter-lean').value = params.get('lean');
  if (params.get('status')) document.getElementById('filter-status').value = params.get('status');
  if (params.get('issue')) document.getElementById('filter-issue').value = params.get('issue');
  if (params.get('search')) document.getElementById('search-input').value = params.get('search');
}

function updateUrlFromFilters() {
  const url = new URL(window.location);
  const filters = {
    state: document.getElementById('filter-state').value,
    type: document.getElementById('filter-type').value,
    year: document.getElementById('filter-year').value,
    lean: document.getElementById('filter-lean').value,
    status: document.getElementById('filter-status').value,
    issue: document.getElementById('filter-issue').value,
    search: document.getElementById('search-input').value,
  };

  // Remove id param when filtering
  url.searchParams.delete('id');

  for (const [key, val] of Object.entries(filters)) {
    if (val) url.searchParams.set(key, val);
    else url.searchParams.delete(key);
  }

  const newUrl = url.pathname + (url.search || '');
  history.replaceState(null, '', newUrl);
}

function clearFilters() {
  document.getElementById('filter-state').value = '';
  document.getElementById('filter-type').value = '';
  document.getElementById('filter-year').value = '';
  document.getElementById('filter-lean').value = '';
  document.getElementById('filter-status').value = '';
  document.getElementById('filter-issue').value = '';
  document.getElementById('filter-hyperscaler').value = '';
  selectedHyperscalers.clear();
  document.getElementById('size-by').value = 'petitions';
  document.getElementById('search-input').value = '';
  document.querySelectorAll('.col-filter-input').forEach(inp => { inp.value = ''; });
  render();
}

// Download functions
function downloadCSV() {
  const filtered = getFiltered();
  const headers = [
    'date', 'jurisdiction', 'state', 'county', 'county_lean', 'action_type', 'status', 'hyperscaler', 'company',
    'project_name', 'investment_million_usd', 'megawatts', 'acreage',
    'opposition_groups', 'summary', 'sources',
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
  csvRows.push('');
  csvRows.push('"License: CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/) — US Datacenter Fights — datacenterfights.org"');
  downloadFile('datacenter-fights.csv', csvRows.join('\n'), 'text/csv');
}

function downloadJSON() {
  const filtered = getFiltered();
  const output = {
    license: 'CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/)',
    attribution: 'US Datacenter Fights — datacenterfights.org',
    data: filtered
  };
  downloadFile('datacenter-fights.json', JSON.stringify(output, null, 2), 'application/json');
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
  if (millions >= 1000000) {
    const t = millions / 1000000;
    return '$' + (t % 1 === 0 ? t.toLocaleString() : t.toFixed(1).replace(/\.0$/, '')) + 'T';
  }
  if (millions >= 1000) {
    const b = millions / 1000;
    return '$' + (b % 1 === 0 ? b.toLocaleString() : b.toFixed(1).replace(/\.0$/, '')) + 'B';
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

// capitalize, escapeHtml, formatDate, getStatusTooltip, STATUS_TOOLTIPS
// are provided by utils.js
