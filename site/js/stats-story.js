// ============================================================
// The Fight — scrollytelling stats page
// ============================================================

const DATA_URL = 'data/fights.json';

// --- Helpers ---
function hasAction(f, t) {
  const a = f.action_type;
  if (Array.isArray(a)) return a.includes(t);
  return a === t;
}
function getMW(f) {
  return Number(f.megawatts) || Number(f.energy_mw) || 0;
}
function getYear(f) {
  return (f.date || '').slice(0, 4);
}
function getMonthKey(f) {
  return (f.date || '').slice(0, 7);
}
function fmtNum(n) {
  if (n >= 1e9) return (n / 1e9).toFixed(1) + 'B';
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(n >= 1e4 ? 0 : 1) + 'K';
  return Math.round(n).toLocaleString();
}
function fmtMW(mw) {
  if (mw >= 1000) return (mw / 1000).toFixed(mw >= 10000 ? 0 : 1) + ' GW';
  return Math.round(mw).toLocaleString() + ' MW';
}

// --- Entry point ---
fetch(DATA_URL)
  .then(r => r.json())
  .then(fights => {
    initHero(fights);
    initAcceleration(fights);
    initStakes(fights);
    initToolkit(fights);
    initScorecard(fights);
    initGeography(fights);
    initSizeCorrelation(fights);
    initScoreboard(fights);
  })
  .catch(e => console.error('Failed to load fights:', e));

// ============================================================
// Hero
// ============================================================
function initHero(fights) {
  const total = fights.length;
  const states = new Set(fights.map(f => f.state).filter(Boolean)).size;
  const el1 = document.getElementById('lede-total');
  const el2 = document.getElementById('lede-states');
  if (el1) el1.textContent = total.toLocaleString();
  if (el2) el2.textContent = states;

  const step = document.getElementById('step-total-a');
  const stepStates = document.getElementById('step-states-a');
  if (step) step.textContent = total.toLocaleString();
  if (stepStates) stepStates.textContent = states;
}

// ============================================================
// CH 1 — Acceleration (timeline + year slider + scroll sync)
// ============================================================
function initAcceleration(fights) {
  // Group by month
  const monthCounts = {};
  fights.forEach(f => {
    const m = getMonthKey(f);
    if (!m || !/^\d{4}-\d{2}$/.test(m)) return;
    monthCounts[m] = (monthCounts[m] || 0) + 1;
  });

  // Restrict to 2018-01 → 2026-12
  const months = [];
  for (let y = 2018; y <= 2026; y++) {
    for (let m = 1; m <= 12; m++) {
      const key = `${y}-${String(m).padStart(2, '0')}`;
      months.push({ key, year: y, count: monthCounts[key] || 0 });
    }
  }
  const maxCount = Math.max(...months.map(m => m.count));

  renderTimeline(months, maxCount, 2026);

  // Slider
  const slider = document.getElementById('year-slider');
  const yearEl = document.getElementById('scrub-year');
  const countEl = document.getElementById('scrub-count');
  const titleEl = document.getElementById('timeline-title');

  function updateForYear(year) {
    year = Number(year);
    if (yearEl) yearEl.textContent = year;
    const cumulative = months.filter(m => m.year <= year).reduce((s, m) => s + m.count, 0);
    if (countEl) countEl.textContent = cumulative.toLocaleString();
    if (titleEl) titleEl.textContent = `Community actions through ${year}`;
    renderTimeline(months, maxCount, year);
  }

  if (slider) {
    slider.addEventListener('input', e => updateForYear(e.target.value));
    updateForYear(slider.value);
  }

  // IntersectionObserver — sync slider to step as user scrolls
  const steps = document.querySelectorAll('#ch-acceleration .step');
  let currentActive = null;
  const obs = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting && entry.intersectionRatio > 0.5) {
        if (currentActive) currentActive.classList.remove('is-active');
        entry.target.classList.add('is-active');
        currentActive = entry.target;
        const y = entry.target.dataset.year;
        if (y && slider) {
          slider.value = y;
          updateForYear(y);
        }
      }
    });
  }, { threshold: [0.5] });
  steps.forEach(s => obs.observe(s));
}

function renderTimeline(months, maxCount, activeYear) {
  const container = document.getElementById('timeline-chart');
  if (!container) return;
  const W = container.clientWidth || 500;
  const H = 320;
  const padL = 30, padR = 10, padT = 10, padB = 30;
  const chartW = W - padL - padR;
  const chartH = H - padT - padB;
  const bw = chartW / months.length;

  let svg = `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">`;

  // Y-axis ticks
  const yTicks = 4;
  for (let i = 0; i <= yTicks; i++) {
    const y = padT + (chartH / yTicks) * i;
    const val = Math.round(maxCount * (1 - i / yTicks));
    svg += `<line x1="${padL}" y1="${y}" x2="${W - padR}" y2="${y}" stroke="#E6E4D9" stroke-width="0.5"/>`;
    svg += `<text x="${padL - 4}" y="${y + 3}" text-anchor="end" class="tl-tick-label">${val}</text>`;
  }

  // Bars
  months.forEach((m, i) => {
    const x = padL + bw * i;
    const h = maxCount > 0 ? (m.count / maxCount) * chartH : 0;
    const y = padT + chartH - h;
    const isActive = m.year <= activeYear;
    svg += `<rect class="tl-bar ${isActive ? 'active' : ''}" x="${x + 0.5}" y="${y}" width="${Math.max(bw - 1, 1)}" height="${h}" rx="1"/>`;
  });

  // Year tick labels
  for (let y = 2018; y <= 2026; y++) {
    const idx = (y - 2018) * 12;
    const x = padL + bw * idx + bw * 6;
    svg += `<text x="${x}" y="${H - 8}" text-anchor="middle" class="tl-tick-label">${y}</text>`;
  }

  svg += '</svg>';
  container.innerHTML = svg;
}

// ============================================================
// CH 2 — Stakes (size slider, power comparisons)
// ============================================================
function initStakes(fights) {
  const slider = document.getElementById('size-slider');
  const sizeValEl = document.getElementById('size-value');
  const homesEl = document.getElementById('comp-homes');
  const seattleEl = document.getElementById('comp-seattle');
  const waterEl = document.getElementById('comp-water');

  // Constants
  const HOMES_PER_MW = 826;   // avg US home ~10.6 MWh/yr, 1 MW continuous = 8760 MWh/yr → 826 homes
  const SEATTLE_GW = 1.4;     // ~1.4 GW peak
  const GAL_PER_MW_DAY = 2500; // mid-estimate for evaporative cooling

  function update(mw) {
    mw = Number(mw);
    if (sizeValEl) sizeValEl.textContent = mw >= 1000 ? (mw / 1000).toFixed(mw >= 10000 ? 0 : 1) : mw;
    const unit = document.querySelector('.size-unit');
    if (unit) unit.textContent = mw >= 1000 ? 'GW' : 'MW';
    if (homesEl) homesEl.textContent = fmtNum(mw * HOMES_PER_MW);
    if (seattleEl) seattleEl.textContent = (mw / 1000 / SEATTLE_GW).toFixed(2) + '×';
    if (waterEl) waterEl.textContent = fmtNum(mw * GAL_PER_MW_DAY);

    // Preset active state
    document.querySelectorAll('.preset-btn').forEach(b => {
      b.classList.toggle('active', Number(b.dataset.mw) === mw);
    });
  }

  if (slider) {
    slider.addEventListener('input', e => update(e.target.value));
    update(slider.value);
  }

  document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const mw = Number(btn.dataset.mw);
      if (slider) slider.value = mw;
      update(mw);
    });
  });

  // Total MW in tracker
  const totalMW = fights.reduce((s, f) => s + getMW(f), 0);
  const el = document.getElementById('stakes-total-mw');
  if (el) el.textContent = fmtMW(totalMW);
}

// ============================================================
// CH 3 — Toolkit (win rate by action type)
// ============================================================
function initToolkit(fights) {
  const ACTION_NAMES = {
    moratorium: 'Moratorium',
    legislation: 'Legislation',
    ordinance: 'Ordinance',
    zoning_restriction: 'Zoning Restriction',
    other_opposition: 'Other Opposition',
    community_benefit_agreement: 'CBA',
    lawsuit: 'Lawsuit',
    permit_denial: 'Permit Denial',
    project_withdrawal: 'Project Withdrawal',
    infrastructure_opposition: 'Infrastructure',
    regulatory_action: 'Regulatory',
    executive_action: 'Executive',
    executive_order: 'Executive Order',
    public_comment: 'Public Comment',
    study_or_report: 'Study/Report',
    utility_regulation: 'Utility Regulation',
  };

  const stats = {};
  fights.forEach(f => {
    const types = Array.isArray(f.action_type)
      ? f.action_type
      : (f.action_type ? [f.action_type] : ['other']);
    const o = f.community_outcome || 'pending';
    types.forEach(at => {
      if (!stats[at]) stats[at] = { total: 0, wins: 0, losses: 0, pending: 0 };
      stats[at].total++;
      if (o === 'win') stats[at].wins++;
      else if (o === 'loss') stats[at].losses++;
      else stats[at].pending++;
    });
  });

  const display = Object.entries(stats)
    .filter(([, s]) => s.total >= 5)
    .sort((a, b) => (b[1].wins / b[1].total) - (a[1].wins / a[1].total));

  let html = '<table class="scorecard-table"><thead><tr><th>Action Type</th><th class="num">Total</th><th class="num">Won</th><th class="num">Lost</th><th class="num">Win Rate</th><th></th></tr></thead><tbody>';

  display.forEach(([at, s]) => {
    const winPct = s.total > 0 ? Math.round((s.wins / s.total) * 100) : 0;
    const lossPct = s.total > 0 ? Math.round((s.losses / s.total) * 100) : 0;
    const pendPct = 100 - winPct - lossPct;
    const name = ACTION_NAMES[at] || at;
    html += `<tr>
      <td style="font-weight:600">${name}</td>
      <td class="num">${s.total}</td>
      <td class="num" style="color:#24837B;font-weight:600">${s.wins}</td>
      <td class="num" style="color:#BC5215">${s.losses}</td>
      <td class="num" style="font-weight:700">${winPct}%</td>
      <td style="width:150px">
        <span class="scorecard-bar" style="width:${winPct}%;background:#24837B"></span><span class="scorecard-bar" style="width:${pendPct}%;background:#AD8301;opacity:0.35"></span><span class="scorecard-bar" style="width:${lossPct}%;background:#BC5215"></span>
      </td>
    </tr>`;
  });
  html += '</tbody></table>';
  const el = document.getElementById('winrate-chart');
  if (el) el.innerHTML = html;

  // Callout numbers
  const pw = stats.project_withdrawal;
  const pc = stats.public_comment;
  if (pw && document.getElementById('toolkit-withdraw-rate')) {
    document.getElementById('toolkit-withdraw-rate').textContent = Math.round(pw.wins / pw.total * 100);
  }
  if (pc && document.getElementById('toolkit-pc-rate')) {
    document.getElementById('toolkit-pc-rate').textContent = Math.round(pc.wins / pc.total * 100);
  }
}

// ============================================================
// CH 4 — Hyperscaler scorecard
// ============================================================
function initScorecard(fights) {
  const colors = {
    amazon: '#FF9900', google: '#4285F4', meta: '#0668E1',
    microsoft: '#00A4EF', openai: '#10A37F', coreweave: '#6C63FF',
    xai: '#1DA1F2', oracle: '#F80000', apple: '#A2AAAD',
  };

  const NAMES = {
    amazon: 'Amazon / AWS', google: 'Google', meta: 'Meta',
    microsoft: 'Microsoft', openai: 'OpenAI', coreweave: 'CoreWeave',
    xai: 'xAI', oracle: 'Oracle', apple: 'Apple',
  };

  const stats = {};
  fights.forEach(f => {
    const hs = Array.isArray(f.hyperscaler) ? f.hyperscaler : (f.hyperscaler ? [f.hyperscaler] : []);
    hs.forEach(h => {
      const key = String(h).toLowerCase();
      if (!NAMES[key]) return;
      if (!stats[key]) stats[key] = { total: 0, wins: 0, losses: 0, pending: 0 };
      stats[key].total++;
      const o = f.community_outcome || 'pending';
      if (o === 'win') stats[key].wins++;
      else if (o === 'loss') stats[key].losses++;
      else stats[key].pending++;
    });
  });

  const display = Object.entries(stats)
    .filter(([, s]) => s.total >= 3)
    .sort((a, b) => b[1].total - a[1].total);

  let html = '<table class="scorecard-table"><thead><tr><th>Hyperscaler</th><th class="num">Fights</th><th class="num">Community Won</th><th class="num">Community Lost</th><th class="num">Win Rate</th><th></th></tr></thead><tbody>';
  display.forEach(([key, s]) => {
    const winPct = s.total > 0 ? Math.round((s.wins / s.total) * 100) : 0;
    const lossPct = s.total > 0 ? Math.round((s.losses / s.total) * 100) : 0;
    const pendPct = 100 - winPct - lossPct;
    const color = colors[key] || '#878580';
    html += `<tr>
      <td><span class="scorecard-company"><span class="scorecard-dot" style="background:${color}"></span>${NAMES[key]}</span></td>
      <td class="num">${s.total}</td>
      <td class="num" style="color:#24837B;font-weight:600">${s.wins}</td>
      <td class="num" style="color:#BC5215">${s.losses}</td>
      <td class="num" style="font-weight:700">${winPct}%</td>
      <td style="width:140px">
        <span class="scorecard-bar" style="width:${winPct}%;background:#24837B"></span><span class="scorecard-bar" style="width:${pendPct}%;background:#AD8301;opacity:0.35"></span><span class="scorecard-bar" style="width:${lossPct}%;background:#BC5215"></span>
      </td>
    </tr>`;
  });
  html += '</tbody></table>';
  const el = document.getElementById('hyperscaler-scorecard');
  if (el) el.innerHTML = html;
}

// ============================================================
// CH 5 — Geography (top states, partisan)
// ============================================================
function initGeography(fights) {
  // Top states by count
  const counts = {};
  const sigs = {};
  fights.forEach(f => {
    if (!f.state) return;
    counts[f.state] = (counts[f.state] || 0) + 1;
    const s = Number(f.petition_signatures) || 0;
    if (s > 0) sigs[f.state] = (sigs[f.state] || 0) + s;
  });

  renderBarChart('state-count-chart',
    Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 10),
    v => v.toString(), '#AF3029');
  renderBarChart('state-sigs-chart',
    Object.entries(sigs).sort((a, b) => b[1] - a[1]).slice(0, 10),
    v => fmtNum(v), '#BC5215');

  // Partisan bar
  let R = 0, D = 0, NA = 0;
  fights.forEach(f => {
    const lean = (f.county_lean || '').toString().toUpperCase();
    if (lean === 'R' || lean.startsWith('R')) R++;
    else if (lean === 'D' || lean.startsWith('D')) D++;
    else NA++;
  });
  const total = R + D + NA;
  const rPct = (R / total) * 100;
  const dPct = (D / total) * 100;
  const nPct = 100 - rPct - dPct;

  const partisanEl = document.getElementById('partisan-bar');
  if (partisanEl) {
    partisanEl.innerHTML = `
      <div class="partisan-bar-outer">
        <div class="bar-r" style="width:${rPct}%">${rPct > 5 ? R + ' Republican-leaning' : ''}</div>
        <div class="bar-d" style="width:${dPct}%">${dPct > 5 ? D + ' Democratic-leaning' : ''}</div>
        <div class="bar-none" style="width:${nPct}%">${nPct > 5 ? NA + ' unknown' : ''}</div>
      </div>
      <div class="partisan-legend">
        <span><span class="legend-dot" style="background:#AF3029"></span>Republican-leaning county</span>
        <span><span class="legend-dot" style="background:#4385BE"></span>Democratic-leaning county</span>
        <span><span class="legend-dot" style="background:#CECDC3"></span>Unknown / statewide / federal</span>
      </div>
    `;
  }
}

function renderBarChart(elId, entries, fmt, color) {
  const el = document.getElementById(elId);
  if (!el) return;
  if (!entries.length) { el.innerHTML = '<p style="color:#878580">No data</p>'; return; }
  const max = entries[0][1];
  el.innerHTML = entries.map(([label, val]) => {
    const pct = (val / max) * 100;
    return `<div class="bar-row">
      <div class="bar-label">${label}</div>
      <div class="bar-track"><div class="bar-fill" style="width:${pct}%;background:${color}"></div></div>
      <div class="bar-value">${fmt(val)}</div>
    </div>`;
  }).join('');
}

// ============================================================
// CH 6 — Size vs attention correlation
// ============================================================
function initSizeCorrelation(fights) {
  const bins = [
    { label: '< 100 MW', test: m => m > 0 && m < 100, sigs: [] },
    { label: '100–500 MW', test: m => m >= 100 && m < 500, sigs: [] },
    { label: '500 MW – 1 GW', test: m => m >= 500 && m < 1000, sigs: [] },
    { label: '1 GW +', test: m => m >= 1000, sigs: [] },
  ];

  fights.forEach(f => {
    const mw = getMW(f);
    const s = Number(f.petition_signatures) || 0;
    if (!mw || !s) return;
    const bin = bins.find(b => b.test(mw));
    if (bin) bin.sigs.push(s);
  });

  function median(arr) {
    if (!arr.length) return 0;
    const s = [...arr].sort((a, b) => a - b);
    const m = Math.floor(s.length / 2);
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
  }

  const data = bins.map(b => ({
    label: b.label,
    n: b.sigs.length,
    median: Math.round(median(b.sigs)),
  }));
  const maxMed = Math.max(...data.map(d => d.median), 1);

  const el = document.getElementById('size-corr-chart');
  if (!el) return;
  el.innerHTML = `
    <div class="viz-title" style="margin-bottom:1rem">Median petition signatures, by project size</div>
    <div class="bar-chart">
      ${data.map(d => {
        const pct = (d.median / maxMed) * 100;
        return `<div class="bar-row">
          <div class="bar-label" style="width:160px">${d.label}</div>
          <div class="bar-track"><div class="bar-fill" style="width:${pct}%;background:#24837B"></div></div>
          <div class="bar-value" style="min-width:120px">${d.median.toLocaleString()} sigs (n=${d.n})</div>
        </div>`;
      }).join('')}
    </div>
  `;
}

// ============================================================
// CH 7 — Scoreboard
// ============================================================
function initScoreboard(fights) {
  const outcomes = { win: 0, loss: 0, pending: 0, mixed: 0 };
  fights.forEach(f => {
    const o = f.community_outcome || 'pending';
    if (outcomes[o] !== undefined) outcomes[o]++;
    else outcomes.pending++;
  });

  const total = outcomes.win + outcomes.loss + outcomes.pending + outcomes.mixed;
  const segments = [
    { key: 'win', label: 'Favorable for communities', count: outcomes.win, color: '#24837B' },
    { key: 'loss', label: 'Unfavorable for communities', count: outcomes.loss, color: '#BC5215' },
    { key: 'pending', label: 'Pending', count: outcomes.pending, color: '#AD8301' },
    { key: 'mixed', label: 'Mixed', count: outcomes.mixed, color: '#878580' },
  ];

  const el = document.getElementById('outcome-summary');
  if (el) {
    el.innerHTML = `
      <div class="outcome-stack">
        ${segments.map(s => {
          const pct = total ? (s.count / total) * 100 : 0;
          return `<div class="outcome-segment" style="width:${pct}%;background:${s.color}" title="${s.label}: ${s.count}">${pct > 6 ? s.count : ''}</div>`;
        }).join('')}
      </div>
      <div class="outcome-legend">
        ${segments.map(s =>
          `<span class="outcome-legend-item"><span class="legend-dot" style="background:${s.color}"></span>${s.label} (${s.count})</span>`
        ).join('')}
      </div>
    `;
  }

  // Score stats
  const scoreWins = document.getElementById('score-wins');
  const scorePending = document.getElementById('score-pending');
  const scoreMor = document.getElementById('score-moratoria');
  if (scoreWins) scoreWins.textContent = outcomes.win.toLocaleString();
  if (scorePending) scorePending.textContent = outcomes.pending.toLocaleString();

  // Active moratoria
  const activeMoratoria = fights.filter(f =>
    hasAction(f, 'moratorium') &&
    (f.community_outcome === 'win' || f.community_outcome === 'pending')
  ).length;
  if (scoreMor) scoreMor.textContent = activeMoratoria.toLocaleString();
}
