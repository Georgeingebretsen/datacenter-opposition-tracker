/**
 * Tracking American AI Data Center Buildout — Interactive map and database viewer
 */

let fights = [];
let map;
let markers = [];
let currentSort = { key: 'date', dir: 'desc' };
let selectedHyperscalers = new Set();

const ACTION_LABELS = {
  moratorium: 'Moratorium',
  legislation: 'Legislation',
  zoning_restriction: 'Zoning Restriction',
  public_comment: 'Public Comment',
  community_benefit_agreement: 'Community Benefit Agreement',
  lawsuit: 'Lawsuit',
  project_withdrawal: 'Project Withdrawal',
  utility_regulation: 'Utility Regulation',
  executive_order: 'Executive Order',
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

// Outcome-based map colors (matches the top bar legend exactly)
// Intentionally avoiding green/red so the colors don't read as a value judgement
const OUTCOME_COLORS = {
  win: '#205EA6',     // blue — favorable to communities
  loss: '#BC5215',    // orange — unfavorable to communities
  pending: '#AD8301', // yellow — awaiting decision
  mixed: '#878580',   // gray — mixed result
};

const STATUS_LEGEND = [
  { color: '#205EA6', label: 'Resolved – Favorable for communities' },
  { color: '#AD8301', label: 'Pending' },
  { color: '#BC5215', label: 'Resolved – Unfavorable for communities' },
  { color: '#878580', label: 'Resolved – Mixed' },
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

  // Show last updated from most recent entry, with a pulsing live dot
  const dates = fights.map(f => f.last_updated || f.date).filter(Boolean).sort();
  if (dates.length) {
    const latest = dates[dates.length - 1];
    document.getElementById('last-updated').innerHTML = renderLastUpdated(latest);
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

  // Collapsible filters toggle
  const filtersToggle = document.getElementById('filters-toggle');
  const filtersWrapper = document.getElementById('filters-wrapper');
  if (filtersToggle && filtersWrapper) {
    filtersToggle.addEventListener('click', () => {
      const expanded = filtersToggle.getAttribute('aria-expanded') === 'true';
      filtersToggle.setAttribute('aria-expanded', (!expanded).toString());
      filtersWrapper.hidden = expanded;
    });
  }
  const searchInput = document.getElementById('search-input');
  const searchClear = document.getElementById('search-clear');
  const searchBar = searchInput && searchInput.closest('.search-bar');
  const updateSearchClearVisibility = () => {
    if (searchBar) searchBar.classList.toggle('has-text', !!searchInput.value);
  };
  searchInput.addEventListener('input', () => {
    updateSearchClearVisibility();
    render();
  });
  if (searchClear) {
    searchClear.addEventListener('click', () => {
      searchInput.value = '';
      updateSearchClearVisibility();
      searchInput.focus();
      render();
    });
  }
  updateSearchClearVisibility();
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

  // Custom tooltip system for [data-tooltip] elements
  // Used in the detail panel for action category and authority level info
  setupCustomTooltips();

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
  fights.forEach(f => { if (f.state && f.state !== 'US') stateCounts[f.state] = (stateCounts[f.state] || 0) + 1; });
  const states = Object.keys(stateCounts).sort();
  const stateSelect = document.getElementById('filter-state');
  states.forEach(s => {
    const opt = document.createElement('option');
    opt.value = s;
    opt.textContent = `${s} (${stateCounts[s]})`;
    stateSelect.appendChild(opt);
  });

  const years = [...new Set(fights.map(f => f.date.substring(0, 4)))].sort();
  const yearSelect = document.getElementById('filter-year');
  years.forEach(y => {
    const opt = document.createElement('option');
    opt.value = y;
    opt.textContent = y;
    yearSelect.appendChild(opt);
  });

  // Status filter is hardcoded in HTML with community_outcome values (pending/win/loss/mixed)

  // Populate hyperscaler filter
  const hyperCounts = {};
  fights.forEach(f => { if (f.hyperscaler) hyperCounts[f.hyperscaler] = (hyperCounts[f.hyperscaler] || 0) + 1; });
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
    if (type && !(f.action_type || []).includes(type)) return false;
    if (year && !f.date.startsWith(year)) return false;
    if (lean && f.county_lean !== lean) return false;
    if (status && (f.community_outcome || 'pending') !== status) return false;
    if (issue && !(f.issue_category || []).includes(issue)) return false;
    if (hyperscaler && f.hyperscaler !== hyperscaler) return false;
    if (selectedHyperscalers.size > 0 && !selectedHyperscalers.has(f.hyperscaler)) return false;
    if (search) {
      const haystack = [
        f.jurisdiction, f.state, f.company, f.project_name, f.summary,
        ...(f.action_type || []).map(a => ACTION_LABELS[a] || a),
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
  const localOnly = filtered.filter(f => f.scope !== 'statewide' && f.scope !== 'federal');
  updateStats(filtered);
  updateMap(localOnly);
  updateTable(filtered);
  updateSortIndicators();
  updateSizeLegend(localOnly);
  // legislation strip removed — statewide entries are already in the table
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
  const noData = filtered.length - values.length;

  // Per-metric formatters (values are in metric-native units)
  const formatters = {
    investment: (v) => {
      // v is in millions of USD
      if (v >= 1000) return '$' + (v/1000).toFixed(v >= 10000 ? 0 : 1) + 'B';
      return '$' + Math.round(v) + 'M';
    },
    energy: (v) => {
      // v is in megawatts
      if (v >= 1000) return (v/1000).toFixed(1) + ' GW';
      return Math.round(v) + ' MW';
    },
    acreage: (v) => {
      if (v >= 1000) return (v/1000).toFixed(1) + 'K acres';
      return Math.round(v).toLocaleString() + ' acres';
    },
    petitions: (v) => {
      if (v >= 1e3) return (v/1e3).toFixed(1) + 'K sigs';
      return Math.round(v) + ' sigs';
    },
  };
  const fmt = formatters[sizeBy] || ((v) => Math.round(v).toLocaleString());

  // Pick 3 reference values: small, medium, large (use min and max for end labels)
  const sorted = values.slice().sort((a, b) => a - b);
  const refSmall = sorted[Math.floor(sorted.length * 0.1)];
  const refMid = sorted[Math.floor(sorted.length * 0.5)];
  const refLarge = sorted[Math.floor(sorted.length * 0.9)];

  // Calculate radii for reference values using same logic as getMarkerRadius
  // Mirror getMarkerRadius() exactly so legend matches map
  const calcR = (val) => {
    if (val == null || val <= 0) return 3;
    if (metric.logScale) {
      const logVal = Math.log10(Math.max(val, 1));
      const t = Math.min(1, logVal / 6);
      const curved = Math.pow(t, 1.6);
      return metric.minR + curved * (metric.maxR - metric.minR);
    }
    return metric.minR + (val / 1) * (metric.maxR - metric.minR);
  };

  // Pick reference circles based on how many unique values we have
  const uniqueValues = [...new Set(values)].sort((a, b) => a - b);
  let circles;
  if (uniqueValues.length === 1) {
    // Only 1 unique value: show single circle
    const v = uniqueValues[0];
    circles = [{ val: v, r: calcR(v), label: fmt(v) }];
  } else if (uniqueValues.length === 2) {
    // 2 values: show min and max
    circles = [
      { val: uniqueValues[0], r: calcR(uniqueValues[0]), label: fmt(uniqueValues[0]) },
      { val: uniqueValues[1], r: calcR(uniqueValues[1]), label: fmt(uniqueValues[1]) },
    ];
  } else {
    // 3+ values: small/mid/large with ≤ ≥ signs
    circles = [
      { val: refSmall, r: calcR(refSmall), label: '≤ ' + fmt(refSmall) },
      { val: refMid, r: calcR(refMid), label: fmt(refMid) },
      { val: refLarge, r: calcR(refLarge), label: '≥ ' + fmt(refLarge) },
    ];
  }

  legend.innerHTML = `
    <div class="size-legend-visual">
      <div class="size-legend-circles">
        ${circles.map(c => `
          <div class="size-legend-item">
            <span class="size-legend-circle" style="width:${c.r * 2}px;height:${c.r * 2}px"></span>
            <span class="size-legend-label">${c.label}</span>
          </div>
        `).join('')}
        <div class="size-legend-item">
          <span class="size-legend-circle size-legend-nodata" style="width:6px;height:6px"></span>
          <span class="size-legend-label">no data</span>
        </div>
      </div>
    </div>
  `;
  // The "N of M entries have X data" line is rendered separately beneath the circle-size row
  const countFooter = document.getElementById('size-legend-count-footer');
  if (countFooter) {
    const dataTypeLabel = ({investment:'investment',energy:'energy',acreage:'acreage',petitions:'petition'}[sizeBy] || '');
    countFooter.textContent = `${values.length} of ${filtered.length} entries have ${dataTypeLabel} data`;
  }
}

function updateStats(filtered) {
  // Total actions — count-up animation on first render, direct swap on re-filter
  setStatNumber('stat-total', filtered.length, v => v.toLocaleString());

  const totalInvestment = filtered.filter(f => f.investment_million_usd).reduce((s, f) => s + f.investment_million_usd, 0);
  setStatNumber('stat-investment', totalInvestment, v => (v > 0 ? formatInvestment(v) : '—'));

  const totalPower = filtered.filter(f => f.megawatts).reduce((s, f) => s + f.megawatts, 0);
  setStatNumber('stat-power', totalPower, v => (v > 0 ? formatPower(v) : '—'));

  const rCount = filtered.filter(f => f.county_lean === 'R').length;
  const dCount = filtered.filter(f => f.county_lean === 'D').length;
  document.querySelector('.partisan-r').textContent = rCount + 'R';
  document.querySelector('.partisan-d').textContent = dCount + 'D';
  document.getElementById('fights-count').textContent = filtered.length;
  updateOutcomeBar(filtered);
  updateHyperscalerBar(filtered);
  updateFiltersActiveBadge();
}

// Count-up animation state — animates on first render, direct set on re-renders
const _statAnimState = {};
function setStatNumber(elId, value, formatter) {
  const el = document.getElementById(elId);
  if (!el) return;
  const first = !_statAnimState[elId];
  _statAnimState[elId] = true;
  if (first && typeof value === 'number' && value > 0) {
    animateStat(el, value, formatter);
  } else {
    el.textContent = formatter(value);
  }
}

function animateStat(el, target, formatter) {
  const duration = 1100;
  const start = performance.now();
  function tick(now) {
    const t = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - t, 3);
    const current = target * eased;
    el.textContent = formatter(current);
    if (t < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

function updateFiltersActiveBadge() {
  const badge = document.getElementById('filters-active-count');
  let active = 0;
  if (document.getElementById('filter-state').value) active++;
  if (document.getElementById('filter-type').value) active++;
  if (document.getElementById('filter-year').value) active++;
  if (document.getElementById('filter-lean').value) active++;
  if (document.getElementById('filter-status').value) active++;
  if (document.getElementById('filter-issue').value) active++;
  if (document.getElementById('filter-hyperscaler').value) active++;
  if (badge) {
    if (active > 0) {
      badge.textContent = active;
      badge.hidden = false;
    } else {
      badge.hidden = true;
    }
  }
  // Show clear button only when filters are applied (search counts too)
  const searchVal = (document.getElementById('search-input') || {}).value || '';
  const hasSearch = !!searchVal.trim();
  const clearBtn = document.getElementById('clear-filters');
  if (clearBtn) {
    const show = active > 0 || hasSearch || selectedHyperscalers.size > 0;
    clearBtn.hidden = !show;
  }
}

function updateOutcomeBar(filtered) {
  const bar = document.getElementById('outcome-bar');

  let won = 0, pending = 0, lost = 0, mixed = 0;
  filtered.forEach(f => {
    const o = f.community_outcome;
    if (o === 'win') won++;
    else if (o === 'loss') lost++;
    else if (o === 'mixed') mixed++;
    else pending++;
  });
  const total = filtered.length || 1;
  const pWon = Math.round(won/total*100);
  const pPending = Math.round(pending/total*100);
  const pLost = Math.round(lost/total*100);
  const pMixed = 100 - pWon - pPending - pLost;

  bar.innerHTML = `
    <div class="outcome-labels">
      <span class="outcome-label" style="color:#205EA6">Resolved – Favorable for communities: ${won} (${pWon}%)</span>
      <span class="outcome-label" style="color:#BC5215">Resolved – Unfavorable for communities: ${lost} (${pLost}%)</span>
      ${mixed > 0 ? `<span class="outcome-label" style="color:#878580">Resolved – Mixed: ${mixed} (${pMixed}%)</span>` : ''}
      <span class="outcome-label" style="color:#AD8301">Pending: ${pending} (${pPending}%)</span>
    </div>
    <div class="outcome-track">
      <div class="outcome-segment" style="width:${pWon}%;background:#205EA6" title="Resolved – Favorable for communities: ${won}"></div>
      <div class="outcome-segment" style="width:${pLost}%;background:#BC5215" title="Resolved – Unfavorable for communities: ${lost}"></div>
      <div class="outcome-segment" style="width:${pMixed}%;background:#878580" title="Resolved – Mixed: ${mixed}"></div>
      <div class="outcome-segment" style="width:${pPending}%;background:#AD8301" title="Pending: ${pending}"></div>
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
    getValue: f => f.megawatts,
    minR: 1, maxR: 23, logScale: true,
    label: 'project power',
    formatTip: (f) => f.megawatts ? formatPower(f.megawatts) : (f.investment_million_usd ? formatInvestment(f.investment_million_usd) : null),
  },
  investment: {
    getValue: f => f.investment_million_usd,
    minR: 1, maxR: 23, logScale: true,
    label: 'investment',
    formatTip: (f) => f.investment_million_usd ? formatInvestment(f.investment_million_usd) : null,
  },
  acreage: {
    getValue: f => f.acreage,
    minR: 1, maxR: 23, logScale: true,
    label: 'land usage (acres)',
    formatTip: (f) => f.acreage ? f.acreage.toLocaleString() + ' acres' : null,
  },
  petitions: {
    getValue: f => f.petition_signatures,
    minR: 1, maxR: 23, logScale: true,
    label: 'petition signatures',
    formatTip: (f) => f.petition_signatures ? f.petition_signatures.toLocaleString() + ' sigs' : null,
  },
};

// Compute marker radius based on selected size-by metric
function getMarkerRadius(f) {
  const sizeBy = document.getElementById('size-by').value;
  const metric = SIZE_METRICS[sizeBy] || SIZE_METRICS.energy;
  const val = metric.getValue(f);
  if (val == null || val <= 0) return 3;

  if (metric.logScale) {
    const logVal = Math.log10(Math.max(val, 1));
    const t = Math.min(1, logVal / 6);
    // Use power curve to push small values smaller (more visual contrast)
    const curved = Math.pow(t, 1.6);
    return metric.minR + curved * (metric.maxR - metric.minR);
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
    // Color dots by community_outcome so the map legend matches the top bar exactly
    const color = OUTCOME_COLORS[f.community_outcome] || '#8888a0';
    const radius = getMarkerRadius(f);
    const companyLabel = f.hyperscaler || f.company || '';
    const sizeTip = getSizeTooltipLabel(f);
    const scaleLabel = sizeTip ? ` &middot; ${sizeTip}` : '';
    // Outcome is already conveyed by the dot color, so we don't repeat it in the hover text.
    const tooltipHtml = `<strong>${escapeHtml(f.jurisdiction)}, ${f.state}</strong>${companyLabel ? ' &middot; ' + escapeHtml(companyLabel) : ''}${scaleLabel}`;
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
    // For arrays (action_type), sort by first element
    if (Array.isArray(va)) va = va[0] || null;
    if (Array.isArray(vb)) vb = vb[0] || null;
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
    const outcomeLabel = f.community_outcome === 'win' ? 'Resolved – Favorable for communities' : f.community_outcome === 'loss' ? 'Resolved – Unfavorable for communities' : f.community_outcome === 'mixed' ? 'Resolved – Mixed' : 'Pending';
    return `
      <tr data-id="${f.id}">
        <td>${formatDate(f.date)}</td>
        <td class="jurisdiction-cell" title="${escapeHtml(f.jurisdiction)}"><strong>${f.jurisdiction}</strong></td>
        <td>${f.state}</td>
        <td class="action-cell">${(() => {
          const actions = f.action_type || [];
          const shown = actions.slice(0, 2).map(a => `<span class="action-tag-sm">${ACTION_LABELS[a] || a}</span>`).join(' ');
          const more = actions.length > 2 ? `<span class="action-tag-sm action-tag-more">+${actions.length - 2}</span>` : '';
          return shown + (more ? ' ' + more : '');
        })()}</td>
        <td class="issue-cell">${(() => {
          const cats = f.issue_category || [];
          const shown = cats.slice(0, 2).map(c => `<span class="issue-tag-sm">${c.replace(/_/g,' ')}</span>`).join(' ');
          const more = cats.length > 2 ? `<span class="issue-tag-sm issue-tag-more">+${cats.length - 2}</span>` : '';
          return shown + (more ? ' ' + more : '');
        })()}</td>
        <td><span class="outcome-badge-sm outcome-${f.community_outcome || 'pending'}">${outcomeLabel}</span></td>
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
    <th data-sort="action_type">Action</th>
    <th>Issue</th>
    <th data-sort="community_outcome">Status</th>
  `;

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

  const outcomeLabel = f.community_outcome === 'win' ? 'Resolved – Favorable for communities' :
    f.community_outcome === 'loss' ? 'Resolved – Unfavorable for communities' :
    f.community_outcome === 'mixed' ? 'Resolved – Mixed' :
    'Pending';

  // Build a compact stakes grid instead of a bullet list for specs
  const stakesHtml = specs.length ? (() => {
    const tiles = [];
    if (f.investment_million_usd) tiles.push(`<div class="stake-tile"><span class="stake-label">Investment</span><span class="stake-value">${formatInvestment(f.investment_million_usd)}</span></div>`);
    if (f.megawatts) tiles.push(`<div class="stake-tile"><span class="stake-label">Power</span><span class="stake-value">${formatPower(f.megawatts)}</span></div>`);
    if (f.acreage) tiles.push(`<div class="stake-tile"><span class="stake-label">Land</span><span class="stake-value">${f.acreage.toLocaleString()} ac</span></div>`);
    if (f.building_sq_ft) tiles.push(`<div class="stake-tile"><span class="stake-label">Building</span><span class="stake-value">${f.building_sq_ft.toLocaleString()} sq ft</span></div>`);
    if (f.water_usage_gallons_per_day) {
      const w = f.water_usage_gallons_per_day;
      const waterStr = w >= 1000000 ? (w / 1000000).toFixed(1).replace(/\.0$/, '') + 'M' : w >= 1000 ? Math.round(w / 1000) + 'K' : w.toLocaleString();
      tiles.push(`<div class="stake-tile"><span class="stake-label">Water</span><span class="stake-value">${waterStr} gal/day</span></div>`);
    }
    return tiles.join('');
  })() : '';

  // Group chips for opposition_groups (same style family as stats-story)
  const groupChipsHtml = (f.opposition_groups && f.opposition_groups.length)
    ? f.opposition_groups.map(g => `<span class="group-chip">${escapeHtml(g)}</span>`).join('')
    : '';

  // External link row: website, facebook, instagram, twitter, petition, bill
  const linkButtons = [];
  if (f.bill_url) linkButtons.push({ url: f.bill_url, label: f.bill_name || 'Official Bill', kind: 'bill' });
  if (f.opposition_website) linkButtons.push({ url: f.opposition_website, label: 'Website', kind: 'web' });
  if (f.opposition_facebook) {
    const fbLabel = f.opposition_facebook_members ? `Facebook · ${f.opposition_facebook_members.toLocaleString()}` : 'Facebook';
    linkButtons.push({ url: f.opposition_facebook, label: fbLabel, kind: 'fb' });
  }
  if (f.opposition_instagram) {
    const igUrl = f.opposition_instagram.startsWith('http') ? f.opposition_instagram : `https://instagram.com/${f.opposition_instagram.replace('@','')}`;
    const igLabel = f.opposition_instagram_followers ? `Instagram · ${f.opposition_instagram_followers.toLocaleString()}` : 'Instagram';
    linkButtons.push({ url: igUrl, label: igLabel, kind: 'ig' });
  }
  if (f.opposition_twitter) {
    const twUrl = f.opposition_twitter.startsWith('http') ? f.opposition_twitter : `https://x.com/${f.opposition_twitter.replace('@','')}`;
    linkButtons.push({ url: twUrl, label: 'X / Twitter', kind: 'x' });
  }
  if (f.petition_url) {
    const petLabel = f.petition_signatures ? `Petition · ${f.petition_signatures.toLocaleString()}` : 'Petition';
    linkButtons.push({ url: f.petition_url, label: petLabel, kind: 'petition' });
  }

  const linkRowHtml = linkButtons.length
    ? `<div class="detail-link-row">${linkButtons.map(l => `<a class="detail-link-btn detail-link-${l.kind}" href="${l.url}" target="_blank" rel="noopener">${escapeHtml(l.label)} <span class="detail-link-arrow" aria-hidden="true">↗</span></a>`).join('')}</div>`
    : '';

  // Identify project title — prefer project_name for editorial weight, fall back to jurisdiction
  const hasProjectName = !!f.project_name;
  const projectTitle = hasProjectName ? f.project_name : `${f.jurisdiction}, ${f.state}`;
  const locationSubtitle = hasProjectName
    ? `${f.jurisdiction}, ${f.state}${f.county && f.scope !== 'statewide' && f.scope !== 'federal' ? ` · ${f.county} County` : ''}`
    : (f.county && f.scope !== 'statewide' && f.scope !== 'federal' ? `${f.county} County` : '');

  const companyLine = f.hyperscaler
    ? `<span class="detail-company" style="color:${(HYPERSCALER_INFO[f.hyperscaler]||{}).color||'var(--text)'}">${escapeHtml(f.hyperscaler)}</span>${f.company && f.company !== f.hyperscaler ? ` <span class="detail-company-muted">· developer ${escapeHtml(f.company)}</span>` : ''}`
    : (f.company ? `<span class="detail-company">${escapeHtml(f.company)}</span>` : '');

  content.innerHTML = `
    <div class="detail-toolbar">
      <button class="btn-share" onclick="copyShareLink()" title="Copy link to this entry">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M6 3H3a1 1 0 00-1 1v9a1 1 0 001 1h9a1 1 0 001-1v-3M9 1h6m0 0v6m0-6L8 8"/></svg>
        <span class="share-label">Share</span>
      </button>
      <button class="btn-expand" onclick="toggleFullscreen('${f.id}')" title="Full screen view">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M2 6V2h4M14 6V2h-4M2 10v4h4M14 10v4h-4"/></svg>
      </button>
    </div>

    <div class="detail-hero">
      <span class="outcome-badge outcome-${f.community_outcome || 'pending'}">${outcomeLabel}</span>
      <h2 class="detail-title">${escapeHtml(projectTitle)}</h2>
      ${locationSubtitle ? `<div class="detail-location">${escapeHtml(locationSubtitle)}</div>` : ''}
      <div class="detail-hero-meta">
        ${companyLine ? `<span class="detail-hero-meta-item">${companyLine}</span>` : ''}
        <span class="detail-hero-meta-item">${formatDate(f.date)}</span>
      </div>
    </div>

    ${stakesHtml ? `<div class="detail-stakes-grid">${stakesHtml}</div>` : ''}

    ${f.summary ? `<div class="detail-section detail-summary"><h3>Summary</h3><p>${f.summary}</p></div>` : ''}

    ${f.objective ? `<div class="detail-section"><h3>Objective</h3><p class="detail-objective">${f.objective}</p></div>` : ''}

    ${f.action_type && f.action_type.length ? `<div class="detail-section"><h3>Action Categories</h3><div class="issue-tags">${f.action_type.map(a => `<span class="issue-tag" data-tooltip="${escapeHtml(getActionTooltip(a))}">${ACTION_LABELS[a] || a}<span class="info-icon-detail">i</span></span>`).join('')}</div></div>` : ''}

    ${f.issue_category && f.issue_category.length ? `<div class="detail-section"><h3>Issue Categories</h3><div class="issue-tags">${f.issue_category.map(c => `<span class="issue-tag" data-tooltip="${escapeHtml(getIssueTooltip(c))}">${c.replace(/_/g, ' ')}<span class="info-icon-detail">i</span></span>`).join('')}</div></div>` : ''}

    ${f.authority_level ? `<div class="detail-section"><h3>Authority Level</h3><p><span class="status-badge" data-tooltip="${escapeHtml(getAuthorityTooltip(f.authority_level))}" style="text-transform:capitalize;background:var(--border);color:var(--text)">${f.authority_level.replace(/_/g, ' ')}<span class="info-icon-detail">i</span></span></p></div>` : ''}

    ${Array.isArray(f.sponsors) && f.sponsors.length ? `<div class="detail-section"><h3>Sponsors</h3><div class="sponsors-list">${f.sponsors.map(s => `<span class="sponsor-badge">${escapeHtml(s)}</span>`).join('')}</div></div>` : ''}

    ${groupChipsHtml ? `<div class="detail-section">
      <h3>${f.scope === 'statewide' || f.scope === 'federal' ? 'Supporting Organizations' : 'Opposition Groups'}</h3>
      <div class="detail-group-chips">${groupChipsHtml}</div>
    </div>` : ''}

    ${linkRowHtml ? `<div class="detail-section"><h3>External Links</h3>${linkRowHtml}</div>` : ''}

    <div class="detail-section">
      <h3>Sources</h3>
      <div class="detail-sources">${sources}</div>
    </div>

    <div class="detail-section detail-last-updated">
      ${f.last_updated ? `Last updated: ${f.last_updated}` : ''}
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
  document.getElementById('size-by').value = 'investment';
  document.getElementById('search-input').value = '';
  document.querySelectorAll('.col-filter-input').forEach(inp => { inp.value = ''; });
  render();
}

// Custom tooltip functions (setupCustomTooltips, _positionCustomTooltip) are now in utils.js

// Download functions
function downloadCSV() {
  const filtered = getFiltered();
  const headers = [
    'date', 'jurisdiction', 'state', 'county', 'county_lean', 'scope',
    'action_type', 'issue_category', 'objective', 'authority_level',
    'status', 'community_outcome',
    'hyperscaler', 'company', 'project_name',
    'investment_million_usd', 'megawatts', 'acreage',
    'sponsors', 'opposition_groups', 'summary', 'sources',
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
  csvRows.push('"License: CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/) — Tracking American AI Data Center Buildout — datacentertracker.org"');
  downloadFile('data-center-tracker.csv', csvRows.join('\n'), 'text/csv');
}

function downloadJSON() {
  const filtered = getFiltered();
  const output = {
    license: 'CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/)',
    attribution: 'Tracking American AI Data Center Buildout — datacentertracker.org',
    data: filtered
  };
  downloadFile('data-center-tracker.json', JSON.stringify(output, null, 2), 'application/json');
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
