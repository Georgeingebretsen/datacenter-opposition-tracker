// ============================================================
// The Unexpected Success — scrollytelling stats
// ============================================================

const DATA_URL = 'data/fights.json';
const US_TOPO_URL = 'https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json';

const COLORS = {
  win: '#24837B',
  loss: '#BC5215',
  pending: '#AD8301',
  mixed: '#878580',
};

// --- Helpers ---
function hasAction(f, t) {
  const a = f.action_type;
  if (Array.isArray(a)) return a.includes(t);
  return a === t;
}
function hasHyp(f) {
  const h = f.hyperscaler;
  if (Array.isArray(h)) return h.length > 0;
  return Boolean(h);
}
function getMW(f) {
  return Number(f.megawatts) || Number(f.energy_mw) || 0;
}
function getYear(f) {
  return Number((f.date || '').slice(0, 4)) || null;
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

// ============================================================
// Entry
// ============================================================
Promise.all([
  fetch(DATA_URL).then(r => r.json()),
  fetch(US_TOPO_URL).then(r => r.json()).catch(() => null),
])
  .then(([fights, us]) => {
    initLiveIndicator(fights);
    initHero(fights);
    initMismatch(fights);
    initMap(fights, us);
    initNumbers(fights);
    initToolkit(fights);
    initSizeCorrelation(fights);
    initKicker(fights);
    initHyperscalers(fights);
    initChapterRail();
  })
  .catch(e => console.error('stats-story init failed:', e));

// ============================================================
// Live indicator
// ============================================================
function initLiveIndicator(fights) {
  const dates = fights.map(f => f.last_updated).filter(Boolean).sort();
  const latest = dates[dates.length - 1];
  const el = document.getElementById('live-updated');
  if (!el || !latest) return;
  const then = new Date(latest);
  const now = new Date();
  const days = Math.floor((now - then) / 86400000);
  let label;
  if (days === 0) label = 'today';
  else if (days === 1) label = 'yesterday';
  else if (days < 7) label = `${days} days ago`;
  else if (days < 30) label = `${Math.floor(days / 7)} weeks ago`;
  else label = then.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  el.textContent = label;
}

// ============================================================
// Hero
// ============================================================
function initHero(fights) {
  const total = fights.length;
  const states = new Set(fights.map(f => f.state).filter(Boolean)).size;
  const wins = fights.filter(f => f.community_outcome === 'win').length;
  const losses = fights.filter(f => f.community_outcome === 'loss').length;
  const winrate = Math.round(wins / (wins + losses) * 100);

  const set = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = v; };
  set('lede-total', total.toLocaleString());
  set('lede-states', states);
  set('lede-winrate', winrate + '%');
}

// ============================================================
// CH 1 — Mismatch
// ============================================================
function initMismatch(fights) {
  // Community groups — union of names across entries
  const groupSet = new Set();
  fights.forEach(f => {
    const og = f.opposition_groups;
    if (Array.isArray(og)) og.forEach(g => g && groupSet.add(String(g).trim()));
  });

  // Total MW
  const totalMW = fights.reduce((s, f) => s + getMW(f), 0);

  // Counties
  const countySet = new Set();
  fights.forEach(f => {
    if (f.county && f.state) countySet.add(`${f.county}, ${f.state}`);
  });

  // Win rates
  const wins = fights.filter(f => f.community_outcome === 'win').length;
  const losses = fights.filter(f => f.community_outcome === 'loss').length;
  const winrate = Math.round(wins / (wins + losses) * 100);

  const hypFights = fights.filter(hasHyp);
  const hypW = hypFights.filter(f => f.community_outcome === 'win').length;
  const hypL = hypFights.filter(f => f.community_outcome === 'loss').length;
  const hyprate = Math.round(hypW / (hypW + hypL) * 100);

  const set = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = v; };
  set('m-groups', groupSet.size.toLocaleString());
  set('m-total-mw', fmtMW(totalMW));
  set('m-counties', countySet.size.toLocaleString());
  set('m-winrate', winrate + '%');
  set('m-hyprate', hyprate + '%');
}

// ============================================================
// CH 2 — US map
// ============================================================
function initMap(fights, usTopo) {
  const container = document.getElementById('us-map');
  if (!container) return;

  const W = 975, H = 610;
  const svg = d3.select(container)
    .append('svg')
    .attr('viewBox', `0 0 ${W} ${H}`)
    .attr('preserveAspectRatio', 'xMidYMid meet');

  // States
  const gStates = svg.append('g').attr('class', 'states');
  const gDots = svg.append('g').attr('class', 'dots');

  const projection = d3.geoAlbersUsa().scale(1300).translate([W / 2, H / 2]);
  const path = d3.geoPath(projection);

  if (usTopo && usTopo.objects && usTopo.objects.states) {
    const states = topojson.feature(usTopo, usTopo.objects.states);
    gStates.selectAll('path')
      .data(states.features)
      .enter()
      .append('path')
      .attr('class', 'state-path')
      .attr('d', path);
  } else {
    // Graceful fallback
    svg.append('text')
      .attr('x', W / 2).attr('y', H / 2)
      .attr('text-anchor', 'middle')
      .attr('fill', '#878580')
      .attr('font-size', 16)
      .text('Map tiles failed to load');
  }

  // Prepare fight points
  const points = fights
    .filter(f => f.lat && f.lng)
    .map(f => {
      const proj = projection([+f.lng, +f.lat]);
      if (!proj) return null;
      return {
        x: proj[0], y: proj[1],
        year: getYear(f),
        outcome: f.community_outcome || 'pending',
        mw: getMW(f),
        name: f.project_name || f.jurisdiction || '(unnamed)',
        state: f.state || '',
        company: (Array.isArray(f.company) ? f.company[0] : f.company) || '',
      };
    })
    .filter(Boolean);

  const radiusFor = d => {
    const base = 3;
    if (d.mw <= 0) return base;
    return Math.min(base + Math.sqrt(d.mw) / 6, 13);
  };

  const tooltip = document.getElementById('map-tooltip');
  const showTip = (e, d) => {
    if (!tooltip) return;
    tooltip.style.display = 'block';
    tooltip.style.left = (e.clientX + 14) + 'px';
    tooltip.style.top = (e.clientY - 10) + 'px';
    tooltip.innerHTML = `
      <div class="tip-title">${d.name}</div>
      <div>${d.state} · ${d.mw ? fmtMW(d.mw) : 'size unknown'}</div>
      <div class="tip-meta">${d.company ? d.company + ' · ' : ''}${d.year || '?'} · ${d.outcome}</div>
    `;
  };
  const hideTip = () => { if (tooltip) tooltip.style.display = 'none'; };

  const dots = gDots.selectAll('circle')
    .data(points)
    .enter()
    .append('circle')
    .attr('class', 'fight-dot')
    .attr('cx', d => d.x)
    .attr('cy', d => d.y)
    .attr('r', radiusFor)
    .attr('fill', d => COLORS[d.outcome] || COLORS.pending)
    .attr('fill-opacity', 0.72)
    .on('mousemove', showTip)
    .on('mouseleave', hideTip);

  // Year slider
  const slider = document.getElementById('map-slider');
  const yearEl = document.getElementById('map-year');
  const countEl = document.getElementById('map-count');

  function applyYear(y) {
    y = Number(y);
    if (yearEl) yearEl.textContent = y;
    let n = 0;
    dots.attr('opacity', d => {
      const visible = d.year !== null && d.year <= y;
      if (visible) n++;
      return visible ? 1 : 0;
    });
    if (countEl) countEl.textContent = n.toLocaleString();
    if (slider) {
      const min = Number(slider.min), max = Number(slider.max);
      const fill = ((y - min) / (max - min)) * 100;
      slider.style.setProperty('--fill', fill + '%');
    }
  }
  if (slider) {
    slider.addEventListener('input', e => {
      stopPlay();
      applyYear(e.target.value);
    });
    applyYear(slider.value);
  }

  // Auto-play
  const btn = document.getElementById('map-play');
  let playInterval = null;
  function stopPlay() {
    if (playInterval) { clearInterval(playInterval); playInterval = null; }
    if (btn) { btn.classList.remove('playing'); btn.textContent = '▶ Play'; }
  }
  function startPlay() {
    if (!slider) return;
    const min = Number(slider.min), max = Number(slider.max);
    let v = Number(slider.value);
    // If at end, restart from beginning
    if (v >= max) {
      v = min;
      slider.value = v;
      applyYear(v);
    }
    btn.classList.add('playing');
    btn.textContent = '❚❚ Pause';
    playInterval = setInterval(() => {
      v++;
      if (v > max) { stopPlay(); return; }
      slider.value = v;
      applyYear(v);
    }, 700);
  }
  if (btn) {
    btn.addEventListener('click', () => {
      if (playInterval) stopPlay();
      else startPlay();
    });
  }

  // Auto-start when map scrolls into view (once)
  let autoStarted = false;
  const mapObs = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting && entry.intersectionRatio > 0.35 && !autoStarted) {
        autoStarted = true;
        // Reset to 2018 and play
        if (slider) {
          slider.value = slider.min;
          applyYear(slider.min);
          setTimeout(startPlay, 400);
        }
      }
    });
  }, { threshold: [0.35] });
  mapObs.observe(container);
}

// ============================================================
// CH 3 — Numbers reveal
// ============================================================
function initNumbers(fights) {
  const wins = fights.filter(f => f.community_outcome === 'win').length;
  const losses = fights.filter(f => f.community_outcome === 'loss').length;
  const pending = fights.filter(f => !f.community_outcome || f.community_outcome === 'pending').length;
  const mixed = fights.filter(f => f.community_outcome === 'mixed').length;

  const winrate = Math.round(wins / (wins + losses) * 100);
  const hyp = fights.filter(hasHyp);
  const hypW = hyp.filter(f => f.community_outcome === 'win').length;
  const hypL = hyp.filter(f => f.community_outcome === 'loss').length;
  const hyprate = Math.round(hypW / (hypW + hypL) * 100);

  const set = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = v; };
  set('big-winrate', winrate);
  set('big-win-count', wins.toLocaleString());
  set('big-loss-count', losses.toLocaleString());
  set('big-hyprate', hyprate);

  // Outcome summary stack
  const total = wins + losses + pending + mixed;
  const segs = [
    { label: 'Community won', count: wins, color: COLORS.win },
    { label: 'Community lost', count: losses, color: COLORS.loss },
    { label: 'Pending', count: pending, color: COLORS.pending },
    { label: 'Mixed', count: mixed, color: COLORS.mixed },
  ];
  const el = document.getElementById('outcome-summary');
  if (el) {
    el.innerHTML = `
      <div class="outcome-stack">
        ${segs.map(s => {
          const pct = total ? (s.count / total) * 100 : 0;
          return `<div class="outcome-segment" style="width:${pct}%;background:${s.color}" title="${s.label}: ${s.count}">${pct > 6 ? s.count.toLocaleString() : ''}</div>`;
        }).join('')}
      </div>
      <div class="outcome-legend">
        ${segs.map(s => `<span class="outcome-legend-item"><span class="legend-dot" style="background:${s.color}"></span>${s.label} (${s.count.toLocaleString()})</span>`).join('')}
      </div>
    `;
  }
}

// ============================================================
// CH 4 — Toolkit (win rate by action type, multi-tag aware)
// ============================================================
function initToolkit(fights) {
  const NAMES = {
    moratorium: 'Moratorium', legislation: 'Legislation', ordinance: 'Ordinance',
    zoning_restriction: 'Zoning Restriction', other_opposition: 'Other Opposition',
    community_benefit_agreement: 'CBA', lawsuit: 'Lawsuit',
    permit_denial: 'Permit Denial', project_withdrawal: 'Project Withdrawal',
    infrastructure_opposition: 'Infrastructure', regulatory_action: 'Regulatory',
    executive_action: 'Executive', executive_order: 'Executive Order',
    public_comment: 'Public Comment', study_or_report: 'Study/Report',
    utility_regulation: 'Utility Regulation',
  };

  const stats = {};
  fights.forEach(f => {
    const types = Array.isArray(f.action_type) ? f.action_type : (f.action_type ? [f.action_type] : ['other']);
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
    const winPct = Math.round(s.wins / s.total * 100);
    const lossPct = Math.round(s.losses / s.total * 100);
    const pendPct = Math.max(0, 100 - winPct - lossPct);
    const name = NAMES[at] || at;
    html += `<tr>
      <td style="font-weight:600">${name}</td>
      <td class="num">${s.total}</td>
      <td class="num" style="color:${COLORS.win};font-weight:600">${s.wins}</td>
      <td class="num" style="color:${COLORS.loss}">${s.losses}</td>
      <td class="num" style="font-weight:700">${winPct}%</td>
      <td style="width:150px">
        <span class="scorecard-bar" style="width:${winPct}%;background:${COLORS.win}"></span><span class="scorecard-bar" style="width:${pendPct}%;background:${COLORS.pending};opacity:0.35"></span><span class="scorecard-bar" style="width:${lossPct}%;background:${COLORS.loss}"></span>
      </td>
    </tr>`;
  });
  html += '</tbody></table>';
  const el = document.getElementById('winrate-chart');
  if (el) el.innerHTML = html;

  // Callout numbers
  const pw = stats.project_withdrawal;
  const pc = stats.public_comment;
  const set = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = v; };
  if (pw) set('toolkit-withdraw-rate', Math.round(pw.wins / pw.total * 100));
  if (pc) set('toolkit-pc-rate', Math.round(pc.wins / pc.total * 100));
}

// ============================================================
// CH 4 — Size correlation (binned median sigs by MW)
// ============================================================
function initSizeCorrelation(fights) {
  const bins = [
    { label: '< 100 MW', test: m => m > 0 && m < 100, sigs: [] },
    { label: '100–500 MW', test: m => m >= 100 && m < 500, sigs: [] },
    { label: '500 MW – 1 GW', test: m => m >= 500 && m < 1000, sigs: [] },
    { label: '1 GW – 5 GW', test: m => m >= 1000 && m < 5000, sigs: [] },
    { label: '5 GW +', test: m => m >= 5000, sigs: [] },
  ];
  fights.forEach(f => {
    const mw = getMW(f);
    const s = Number(f.petition_signatures) || 0;
    if (!mw || !s) return;
    const bin = bins.find(b => b.test(mw));
    if (bin) bin.sigs.push(s);
  });
  const median = arr => {
    if (!arr.length) return 0;
    const s = [...arr].sort((a, b) => a - b);
    const m = Math.floor(s.length / 2);
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
  };
  const data = bins.map(b => ({ label: b.label, n: b.sigs.length, median: Math.round(median(b.sigs)) }));
  const maxMed = Math.max(...data.map(d => d.median), 1);

  const el = document.getElementById('size-corr-chart');
  if (!el) return;
  el.innerHTML = `
    <div class="outcome-title" style="margin-bottom:1rem">Median petition signatures, by project size</div>
    <div class="bar-chart">
      ${data.map(d => {
        const pct = (d.median / maxMed) * 100;
        return `<div class="bar-row">
          <div class="bar-label">${d.label}</div>
          <div class="bar-track"><div class="bar-fill" style="width:${pct}%"></div></div>
          <div class="bar-value">${d.median ? d.median.toLocaleString() : '—'} sigs (n=${d.n})</div>
        </div>`;
      }).join('')}
    </div>
  `;
}

// ============================================================
// CH 5 — Kicker (public comment 2%)
// ============================================================
function initKicker(fights) {
  let pcTotal = 0, pcWins = 0, pcLosses = 0;
  fights.forEach(f => {
    if (hasAction(f, 'public_comment')) {
      pcTotal++;
      if (f.community_outcome === 'win') pcWins++;
      else if (f.community_outcome === 'loss') pcLosses++;
    }
  });
  const rate = pcWins + pcLosses > 0 ? Math.round(pcWins / (pcWins + pcLosses) * 100) : 0;
  const set = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = v; };
  set('kicker-pc-count', pcTotal.toLocaleString());
  set('kicker-pc-rate', rate + '%');
}

// ============================================================
// CH 5 — Hyperscaler scorecard
// ============================================================
function initHyperscalers(fights) {
  const NAMES = {
    amazon: 'Amazon / AWS', google: 'Google', meta: 'Meta',
    microsoft: 'Microsoft', openai: 'OpenAI', coreweave: 'CoreWeave',
    xai: 'xAI', oracle: 'Oracle', apple: 'Apple',
  };
  const DOTS = {
    amazon: '#FF9900', google: '#4285F4', meta: '#0668E1',
    microsoft: '#00A4EF', openai: '#10A37F', coreweave: '#6C63FF',
    xai: '#1DA1F2', oracle: '#F80000', apple: '#A2AAAD',
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
    const winPct = Math.round(s.wins / s.total * 100);
    const lossPct = Math.round(s.losses / s.total * 100);
    const pendPct = Math.max(0, 100 - winPct - lossPct);
    html += `<tr>
      <td><span class="scorecard-company"><span class="scorecard-dot" style="background:${DOTS[key]}"></span>${NAMES[key]}</span></td>
      <td class="num">${s.total}</td>
      <td class="num" style="color:${COLORS.win};font-weight:600">${s.wins}</td>
      <td class="num" style="color:${COLORS.loss}">${s.losses}</td>
      <td class="num" style="font-weight:700">${winPct}%</td>
      <td style="width:140px">
        <span class="scorecard-bar" style="width:${winPct}%;background:${COLORS.win}"></span><span class="scorecard-bar" style="width:${pendPct}%;background:${COLORS.pending};opacity:0.35"></span><span class="scorecard-bar" style="width:${lossPct}%;background:${COLORS.loss}"></span>
      </td>
    </tr>`;
  });
  html += '</tbody></table>';
  const el = document.getElementById('hyperscaler-scorecard');
  if (el) el.innerHTML = html;
}

// ============================================================
// Chapter rail active state
// ============================================================
function initChapterRail() {
  const dots = document.querySelectorAll('.rail-dot');
  const sections = Array.from(dots).map(d => {
    const id = d.getAttribute('href').replace('#', '');
    return { dot: d, el: document.getElementById(id) };
  }).filter(s => s.el);

  const obs = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      const match = sections.find(s => s.el === entry.target);
      if (!match) return;
      if (entry.isIntersecting && entry.intersectionRatio > 0.3) {
        dots.forEach(d => d.classList.remove('active'));
        match.dot.classList.add('active');
      }
    });
  }, { threshold: [0.3] });

  sections.forEach(s => obs.observe(s.el));
}
