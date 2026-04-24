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
    initHeroBackground(fights, us);
    initMismatch(fights);
    initIssues(fights);
    initMap(fights, us);
    initNumbers(fights);
    initToolkit(fights);
    initSizeCorrelation(fights);
    initKicker(fights);
    initHyperscalers(fights);
    initPipeline(fights);
    initChapterRail();
    initRevealOnScroll();
    initScrollProgress();
    initCountUps();   // must run last so all data-count attrs are set
  })
  .catch(e => console.error('stats-story init failed:', e));

// ============================================================
// Count-up animation engine
// Elements marked with data-count=N animate on scroll-in.
// Options: data-count-format (comma|plain|decimal1), data-count-prefix,
// data-count-suffix, data-count-duration (ms).
// ============================================================
function setCountTarget(el, target, opts = {}) {
  if (!el) return;
  el.dataset.count = String(target);
  if (opts.format) el.dataset.countFormat = opts.format;
  if (opts.prefix !== undefined) el.dataset.countPrefix = opts.prefix;
  if (opts.suffix !== undefined) el.dataset.countSuffix = opts.suffix;
  if (opts.duration) el.dataset.countDuration = String(opts.duration);
  // Initial placeholder: final formatted value with 0 is visually jarring,
  // so use an em-dash until the animation fires.
  delete el.dataset.counted;
  el.textContent = opts.placeholder || '—';
}

function formatCount(n, format) {
  switch (format) {
    case 'plain': return Math.round(n).toString();
    case 'decimal1': return n.toFixed(1);
    case 'compact': return fmtNum(n);
    case 'comma':
    default: return Math.round(n).toLocaleString();
  }
}

function animateCountUp(el) {
  if (el.dataset.counted) return;
  const target = parseFloat(el.dataset.count);
  if (isNaN(target)) return;
  el.dataset.counted = '1';

  const format = el.dataset.countFormat || 'comma';
  const prefix = el.dataset.countPrefix || '';
  const suffix = el.dataset.countSuffix || '';
  const duration = parseInt(el.dataset.countDuration || '1300', 10);

  const start = performance.now();
  function tick(now) {
    const t = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - t, 3); // cubic ease-out
    const current = target * eased;
    el.textContent = prefix + formatCount(current, format) + suffix;
    if (t < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

function initCountUps() {
  const els = document.querySelectorAll('[data-count]');
  if (!els.length) return;
  const obs = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting && entry.intersectionRatio > 0.35) {
        animateCountUp(entry.target);
      }
    });
  }, { threshold: [0.35] });
  els.forEach(el => obs.observe(el));

  // Safety net: if any targets weren't counted after 3s (e.g., already past
  // viewport on deep-link load), finalize them.
  setTimeout(() => {
    els.forEach(el => {
      if (!el.dataset.counted) {
        const t = parseFloat(el.dataset.count);
        if (!isNaN(t)) {
          const fmt = el.dataset.countFormat || 'comma';
          const pre = el.dataset.countPrefix || '';
          const suf = el.dataset.countSuffix || '';
          el.textContent = pre + formatCount(t, fmt) + suf;
          el.dataset.counted = '1';
        }
      }
    });
  }, 3000);
}

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

  // Hero lede is above the fold — animate immediately, not on scroll.
  const el1 = document.getElementById('lede-total');
  const el2 = document.getElementById('lede-states');
  const el3 = document.getElementById('lede-winrate');
  if (el1) { setCountTarget(el1, total, { format: 'comma' }); setTimeout(() => animateCountUp(el1), 300); }
  if (el2) { setCountTarget(el2, states, { format: 'plain' }); setTimeout(() => animateCountUp(el2), 400); }
  if (el3) { setCountTarget(el3, winrate, { format: 'plain', suffix: '%' }); setTimeout(() => animateCountUp(el3), 500); }
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

  const byId = id => document.getElementById(id);
  setCountTarget(byId('m-groups'), groupSet.size, { format: 'comma' });
  // m-total-mw is a formatted string ("150 GW") — keep static for clarity.
  const mwEl = byId('m-total-mw');
  if (mwEl) mwEl.textContent = fmtMW(totalMW);
  setCountTarget(byId('m-counties'), countySet.size, { format: 'comma' });
  setCountTarget(byId('m-winrate'), winrate, { format: 'plain', suffix: '%' });
  setCountTarget(byId('m-hyprate'), hyprate, { format: 'plain', suffix: '%' });
}

// ============================================================
// CH 2 — Issues (populate frequency + win rate per category)
// ============================================================
function initIssues(fights) {
  const total = fights.length;
  const stats = {};
  fights.forEach(f => {
    const ic = f.issue_category;
    if (!Array.isArray(ic)) return;
    const outcome = f.community_outcome;
    ic.forEach(key => {
      if (!stats[key]) stats[key] = { count: 0, wins: 0, losses: 0, pending: 0, mixed: 0 };
      stats[key].count++;
      if (outcome === 'win') stats[key].wins++;
      else if (outcome === 'loss') stats[key].losses++;
      else if (outcome === 'mixed') stats[key].mixed++;
      else stats[key].pending++;
    });
  });

  const keys = [
    'zoning', 'grid_energy', 'water', 'environmental',
    'transparency', 'ratepayer', 'noise', 'farmland', 'tax_incentive',
  ];
  keys.forEach(key => {
    const s = stats[key];
    const freqEl = document.getElementById(`issue-${key}-freq`);
    const rateEl = document.getElementById(`issue-${key}-rate`);
    const barEl = document.getElementById(`issue-${key}-bar`);
    if (!s) return;
    const pct = Math.round(s.count / total * 100);
    const resolved = s.wins + s.losses;
    const rate = resolved > 0 ? Math.round(s.wins / resolved * 100) : null;
    if (freqEl) freqEl.textContent = `Appears in ${pct}% of fights`;
    if (rateEl) rateEl.textContent = rate !== null ? `${rate}% win rate` : 'Insufficient data';

    if (barEl) {
      const totalOutcomes = s.wins + s.losses + s.pending + s.mixed;
      if (totalOutcomes === 0) return;
      const winPct = (s.wins / totalOutcomes) * 100;
      const lossPct = (s.losses / totalOutcomes) * 100;
      const mixPct = (s.mixed / totalOutcomes) * 100;
      const pendPct = Math.max(0, 100 - winPct - lossPct - mixPct);
      barEl.innerHTML = `
        <span class="ibar-seg ibar-win" style="width:${winPct}%" title="${s.wins} wins"></span>
        <span class="ibar-seg ibar-loss" style="width:${lossPct}%" title="${s.losses} losses"></span>
        <span class="ibar-seg ibar-mixed" style="width:${mixPct}%" title="${s.mixed} mixed"></span>
        <span class="ibar-seg ibar-pending" style="width:${pendPct}%" title="${s.pending} pending"></span>
      `;
      const legend = barEl.nextElementSibling;
      if (legend && legend.classList.contains('issue-bar-legend')) {
        legend.innerHTML = `<strong>${s.wins}</strong> won · <strong>${s.losses}</strong> lost · <strong>${s.pending + s.mixed}</strong> still in progress`;
      }
    }
  });
}

// ============================================================
// Hero ambient map background
// ============================================================
function initHeroBackground(fights, usTopo) {
  const container = document.getElementById('hero-bg');
  if (!container || !usTopo || typeof d3 === 'undefined') return;

  const W = 1200, H = 800;
  const svg = d3.select(container).append('svg')
    .attr('viewBox', `0 0 ${W} ${H}`)
    .attr('preserveAspectRatio', 'xMidYMid slice');

  const projection = d3.geoAlbersUsa().scale(1600).translate([W / 2, H / 2]);
  const path = d3.geoPath(projection);

  if (usTopo.objects && usTopo.objects.states) {
    const states = topojson.feature(usTopo, usTopo.objects.states);
    svg.append('g').selectAll('path')
      .data(states.features)
      .enter().append('path')
      .attr('class', 'state-path')
      .attr('d', path);
  }

  // All fights as small dim dots — outcome-colored so the data still reads
  svg.append('g').selectAll('circle')
    .data(fights.filter(f => f.lat && f.lng))
    .enter().append('circle')
    .attr('class', 'fight-dot')
    .attr('cx', d => {
      const p = projection([+d.lng, +d.lat]); return p ? p[0] : -9999;
    })
    .attr('cy', d => {
      const p = projection([+d.lng, +d.lat]); return p ? p[1] : -9999;
    })
    .attr('r', 2.5)
    .attr('fill', d => COLORS[d.community_outcome || 'pending'])
    .attr('fill-opacity', 0.55);
}

// ============================================================
// CH 2 — US map
// ============================================================
// Mapping from full state name → two-letter abbreviation (for us-atlas + fights data join)
const STATE_ABBR = {
  'Alabama':'AL','Alaska':'AK','Arizona':'AZ','Arkansas':'AR','California':'CA',
  'Colorado':'CO','Connecticut':'CT','Delaware':'DE','District of Columbia':'DC',
  'Florida':'FL','Georgia':'GA','Hawaii':'HI','Idaho':'ID','Illinois':'IL',
  'Indiana':'IN','Iowa':'IA','Kansas':'KS','Kentucky':'KY','Louisiana':'LA',
  'Maine':'ME','Maryland':'MD','Massachusetts':'MA','Michigan':'MI','Minnesota':'MN',
  'Mississippi':'MS','Missouri':'MO','Montana':'MT','Nebraska':'NE','Nevada':'NV',
  'New Hampshire':'NH','New Jersey':'NJ','New Mexico':'NM','New York':'NY',
  'North Carolina':'NC','North Dakota':'ND','Ohio':'OH','Oklahoma':'OK','Oregon':'OR',
  'Pennsylvania':'PA','Rhode Island':'RI','South Carolina':'SC','South Dakota':'SD',
  'Tennessee':'TN','Texas':'TX','Utah':'UT','Vermont':'VT','Virginia':'VA',
  'Washington':'WA','West Virginia':'WV','Wisconsin':'WI','Wyoming':'WY',
  'Puerto Rico':'PR',
};

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

  // Precompute per-state tallies
  const stateTallies = {};
  fights.forEach(f => {
    if (!f.state) return;
    const s = f.state;
    if (!stateTallies[s]) stateTallies[s] = { total: 0, wins: 0, losses: 0, pending: 0, mixed: 0 };
    stateTallies[s].total++;
    const o = f.community_outcome;
    if (o === 'win') stateTallies[s].wins++;
    else if (o === 'loss') stateTallies[s].losses++;
    else if (o === 'mixed') stateTallies[s].mixed++;
    else stateTallies[s].pending++;
  });

  const tooltip = document.getElementById('map-tooltip');
  function showStateTip(e, abbr, name) {
    const t = stateTallies[abbr];
    if (!tooltip) return;
    tooltip.style.display = 'block';
    tooltip.style.left = (e.clientX + 14) + 'px';
    tooltip.style.top = (e.clientY - 10) + 'px';
    if (!t) {
      tooltip.innerHTML = `<div class="tip-title">${name}</div><div class="tip-meta">No tracked fights yet</div>`;
      return;
    }
    const resolved = t.wins + t.losses;
    const rate = resolved ? Math.round(t.wins / resolved * 100) : null;
    tooltip.innerHTML = `
      <div class="tip-title">${name}</div>
      <div>${t.total.toLocaleString()} tracked fight${t.total === 1 ? '' : 's'}</div>
      <div class="tip-meta">
        ${t.wins} won · ${t.losses} lost · ${t.pending + t.mixed} in progress${rate !== null ? ` · ${rate}% win rate` : ''}
      </div>
    `;
  }
  function hideAnyTip() { if (tooltip) tooltip.style.display = 'none'; }

  if (usTopo && usTopo.objects && usTopo.objects.states) {
    const states = topojson.feature(usTopo, usTopo.objects.states);
    gStates.selectAll('path')
      .data(states.features)
      .enter()
      .append('path')
      .attr('class', 'state-path')
      .attr('d', path)
      .on('mousemove', function(e, d) {
        const name = d.properties && d.properties.name;
        if (!name) return;
        const abbr = STATE_ABBR[name];
        d3.select(this).classed('state-hover', true);
        if (abbr) showStateTip(e, abbr, name);
      })
      .on('mouseleave', function() {
        d3.select(this).classed('state-hover', false);
        hideAnyTip();
      });
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
        id: f.id,
      };
    })
    .filter(Boolean);

  const radiusFor = d => {
    const base = 3;
    if (d.mw <= 0) return base;
    return Math.min(base + Math.sqrt(d.mw) / 6, 13);
  };

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
  const hideDotTip = () => { if (tooltip) tooltip.style.display = 'none'; };

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
    .on('mouseleave', hideDotTip)
    .on('click', (e, d) => {
      if (!d.id) return;
      window.open(`index.html?id=${encodeURIComponent(d.id)}`, '_blank', 'noopener');
    });

  // Legend filter — click a legend item to solo by outcome (click again to clear).
  const legendItems = document.querySelectorAll('.map-legend .legend-item');
  legendItems.forEach(item => {
    const outcome = item.dataset.outcome;
    if (!outcome) return;
    item.style.cursor = 'pointer';
    item.addEventListener('click', () => {
      activeOutcome = (activeOutcome === outcome) ? null : outcome;
      legendItems.forEach(li => {
        const ocome = li.dataset.outcome;
        li.classList.toggle('is-active', ocome === activeOutcome);
        li.classList.toggle('is-dim', Boolean(activeOutcome) && ocome !== activeOutcome);
      });
      applyYear(Number(slider ? slider.value : 2026));
    });
  });

  // Year slider + legend filter state
  let activeOutcome = null;
  const slider = document.getElementById('map-slider');
  const yearEl = document.getElementById('map-year');
  const countEl = document.getElementById('map-count');
  const contextEl = document.getElementById('map-context');

  // Year context annotations — shown as a scrubbing caption under the slider.
  const YEAR_CONTEXT = {
    2018: '<strong>2018.</strong> Data center construction accelerates in Northern Virginia. Community opposition is virtually nonexistent.',
    2019: '<strong>2019.</strong> A handful of early zoning fights, mostly around noise and rural land-use concerns.',
    2020: '<strong>2020.</strong> COVID pauses most public hearings. Hyperscalers quietly continue land acquisition.',
    2021: '<strong>2021.</strong> Crypto-mining facilities draw the first wave of organized opposition. The AI boom has not yet started.',
    2022: '<strong>2022.</strong> ChatGPT launches in November. Opposition to data centers remains scattered and local.',
    2023: '<strong>2023.</strong> Inflection year. Hyperscalers announce gigawatt-scale builds; moratorium ordinances begin spreading county to county.',
    2024: '<strong>2024.</strong> New community actions appear every week. The movement becomes visibly national.',
    2025: '<strong>2025.</strong> Record year for moratoria. Statehouses file dozens of data center bills. Large projects get denied.',
    2026: '<strong>2026 (so far).</strong> Opposition is national, organized, and cross-partisan. The pipeline keeps growing.',
  };
  function updateContext(y) {
    if (!contextEl) return;
    const text = YEAR_CONTEXT[y] || `<strong>${y}.</strong>`;
    contextEl.style.opacity = '0';
    setTimeout(() => {
      contextEl.innerHTML = text;
      contextEl.style.opacity = '1';
    }, 180);
  }

  let prevAppliedYear = null;
  function applyYear(y, opts = {}) {
    y = Number(y);
    const animate = opts.animate === true;
    if (yearEl) yearEl.textContent = y;
    let n = 0;
    dots.each(function(d) {
      const yearOk = d.year !== null && d.year <= y;
      const outcomeOk = !activeOutcome || d.outcome === activeOutcome;
      const visible = yearOk && outcomeOk;
      const justAppeared = animate && prevAppliedYear !== null
        && d.year === y && yearOk && outcomeOk;

      if (visible) n++;

      const sel = d3.select(this);
      const opacityTarget = visible ? 1 : (activeOutcome && yearOk ? 0.08 : 0);

      if (justAppeared) {
        sel
          .attr('r', 0)
          .attr('opacity', opacityTarget)
          .transition().duration(450).ease(d3.easeBackOut.overshoot(1.4))
          .attr('r', radiusFor(d));
      } else {
        sel.attr('r', radiusFor(d));
        sel.attr('opacity', opacityTarget);
      }
    });
    if (countEl) countEl.textContent = n.toLocaleString();
    if (slider) {
      const min = Number(slider.min), max = Number(slider.max);
      const fill = ((y - min) / (max - min)) * 100;
      slider.style.setProperty('--fill', fill + '%');
    }
    updateContext(y);
    prevAppliedYear = y;
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
      applyYear(v, { animate: true });
    }, 800);
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

  const byId = id => document.getElementById(id);
  setCountTarget(byId('big-winrate'), winrate, { format: 'plain', duration: 1600 });
  setCountTarget(byId('big-hyprate'), hyprate, { format: 'plain', duration: 1600 });
  setCountTarget(byId('big-win-count'), wins, { format: 'comma' });
  setCountTarget(byId('big-loss-count'), losses, { format: 'comma' });

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
  const el = document.getElementById('size-corr-chart');
  if (!el) return;

  const points = fights
    .filter(f => getMW(f) > 0 && Number(f.petition_signatures) > 0)
    .map(f => ({
      mw: getMW(f),
      sigs: Number(f.petition_signatures),
      name: f.project_name || f.jurisdiction || '(unnamed)',
      state: f.state || '',
      outcome: f.community_outcome || 'pending',
    }));
  if (!points.length) { el.innerHTML = '<p>No size/signature data available.</p>'; return; }

  const W = 900, H = 460;
  const M = { top: 30, right: 24, bottom: 60, left: 70 };

  const xDomain = d3.extent(points, d => d.mw);
  const yDomain = d3.extent(points, d => d.sigs);
  const x = d3.scaleLog().domain([Math.max(1, xDomain[0] * 0.8), xDomain[1] * 1.1]).range([M.left, W - M.right]);
  const y = d3.scaleLog().domain([Math.max(1, yDomain[0] * 0.8), yDomain[1] * 1.1]).range([H - M.bottom, M.top]);

  // Outliers: top 3 sigs-per-MW ("punched above weight") and bottom 3 ("silent giants")
  const sorted = [...points].sort((a, b) => (b.sigs / b.mw) - (a.sigs / a.mw));
  const highIntensity = sorted.slice(0, 3);
  const lowIntensity = sorted.slice(-3).reverse();
  const callouts = [...highIntensity, ...lowIntensity];
  const calloutSet = new Set(callouts.map(d => d.name + '|' + d.state));

  // Median line (flat across x — the point)
  const medianSigs = d3.median(points, d => d.sigs);

  el.innerHTML = '';
  // Title + legend
  const head = document.createElement('div');
  head.className = 'scatter-head';
  head.innerHTML = `
    <div class="scatter-title">Every project with both MW and signature data (n=${points.length})</div>
    <div class="scatter-sub">Log–log. Each dot is one fight. Horizontal dashed line = median signature count across all projects (${Math.round(medianSigs).toLocaleString()}). If bigger projects drew more opposition, dots would trend up and to the right. They don't.</div>
  `;
  el.appendChild(head);

  const svg = d3.select(el).append('svg')
    .attr('viewBox', `0 0 ${W} ${H}`)
    .attr('preserveAspectRatio', 'xMidYMid meet')
    .style('width', '100%')
    .style('display', 'block')
    .classed('scatter-svg', true);

  // Gridlines
  const gridX = svg.append('g').attr('class', 'grid').attr('transform', `translate(0,${H - M.bottom})`)
    .call(d3.axisBottom(x).ticks(8, '~s').tickSize(-(H - M.top - M.bottom)).tickFormat(''));
  gridX.select('.domain').remove();
  gridX.selectAll('.tick line').attr('stroke', '#E6E4D9').attr('stroke-dasharray', '2 2');

  const gridY = svg.append('g').attr('class', 'grid').attr('transform', `translate(${M.left},0)`)
    .call(d3.axisLeft(y).ticks(6, '~s').tickSize(-(W - M.left - M.right)).tickFormat(''));
  gridY.select('.domain').remove();
  gridY.selectAll('.tick line').attr('stroke', '#E6E4D9').attr('stroke-dasharray', '2 2');

  // Median line
  svg.append('line')
    .attr('x1', M.left).attr('x2', W - M.right)
    .attr('y1', y(medianSigs)).attr('y2', y(medianSigs))
    .attr('stroke', '#AF3029').attr('stroke-dasharray', '4 4').attr('stroke-width', 1.2).attr('opacity', 0.7);

  // Axes
  const xAxis = svg.append('g').attr('class', 'axis').attr('transform', `translate(0,${H - M.bottom})`)
    .call(d3.axisBottom(x).ticks(6, '~s'));
  xAxis.select('.domain').attr('stroke', '#CECDC3');
  xAxis.selectAll('.tick line').attr('stroke', '#CECDC3');
  xAxis.selectAll('.tick text').attr('fill', '#6F6E69').attr('font-size', 11).attr('font-family', 'Inter, sans-serif');

  const yAxis = svg.append('g').attr('class', 'axis').attr('transform', `translate(${M.left},0)`)
    .call(d3.axisLeft(y).ticks(6, '~s'));
  yAxis.select('.domain').attr('stroke', '#CECDC3');
  yAxis.selectAll('.tick line').attr('stroke', '#CECDC3');
  yAxis.selectAll('.tick text').attr('fill', '#6F6E69').attr('font-size', 11).attr('font-family', 'Inter, sans-serif');

  // Axis labels
  svg.append('text')
    .attr('x', W / 2).attr('y', H - 14).attr('text-anchor', 'middle')
    .attr('fill', '#6F6E69').attr('font-size', 12).attr('font-family', 'Oswald, sans-serif')
    .attr('letter-spacing', '0.05em').attr('text-transform', 'uppercase')
    .text('PROJECT SIZE (MEGAWATTS, LOG SCALE)');
  svg.append('text')
    .attr('transform', 'rotate(-90)').attr('x', -(H / 2)).attr('y', 18)
    .attr('text-anchor', 'middle').attr('fill', '#6F6E69').attr('font-size', 12)
    .attr('font-family', 'Oswald, sans-serif').attr('letter-spacing', '0.05em')
    .text('PETITION SIGNATURES (LOG SCALE)');

  // Dots
  svg.append('g').selectAll('circle')
    .data(points)
    .enter()
    .append('circle')
    .attr('cx', d => x(d.mw))
    .attr('cy', d => y(d.sigs))
    .attr('r', d => calloutSet.has(d.name + '|' + d.state) ? 6 : 4)
    .attr('fill', d => COLORS[d.outcome] || COLORS.pending)
    .attr('fill-opacity', d => calloutSet.has(d.name + '|' + d.state) ? 0.92 : 0.58)
    .attr('stroke', d => calloutSet.has(d.name + '|' + d.state) ? '#100F0F' : 'rgba(16,15,15,0.25)')
    .attr('stroke-width', d => calloutSet.has(d.name + '|' + d.state) ? 1.2 : 0.5)
    .append('title')
    .text(d => `${d.name} (${d.state}) — ${fmtMW(d.mw)}, ${d.sigs.toLocaleString()} sigs`);

  // Callout labels with smart offset
  const labelG = svg.append('g');
  callouts.forEach((d, i) => {
    const cx = x(d.mw), cy = y(d.sigs);
    // Offset label: high-intensity above, low-intensity below
    const isHigh = highIntensity.includes(d);
    const dy = isHigh ? -12 : 18;
    labelG.append('text')
      .attr('x', cx).attr('y', cy + dy)
      .attr('text-anchor', 'middle')
      .attr('fill', '#100F0F').attr('font-size', 10)
      .attr('font-family', 'Inter, sans-serif').attr('font-weight', 600)
      .text(`${d.name.slice(0, 22)}${d.name.length > 22 ? '…' : ''}`);
    labelG.append('text')
      .attr('x', cx).attr('y', cy + dy + 12)
      .attr('text-anchor', 'middle')
      .attr('fill', '#6F6E69').attr('font-size', 9)
      .attr('font-family', 'Inter, sans-serif')
      .text(`${fmtMW(d.mw)} · ${d.sigs.toLocaleString()} sigs`);
  });

  // Reference text for median line
  svg.append('text')
    .attr('x', W - M.right - 4).attr('y', y(medianSigs) - 5)
    .attr('text-anchor', 'end').attr('fill', '#AF3029').attr('font-size', 10)
    .attr('font-family', 'Oswald, sans-serif').attr('letter-spacing', '0.05em')
    .text(`MEDIAN ${Math.round(medianSigs).toLocaleString()} SIGS`);
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
  const byId = id => document.getElementById(id);
  setCountTarget(byId('kicker-pc-wins'), pcWins, { format: 'plain' });
  setCountTarget(byId('kicker-pc-count'), pcTotal, { format: 'comma' });
  setCountTarget(byId('kicker-pc-rate'), rate, { format: 'plain', suffix: '%' });
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
// Pipeline — 6 most recently added pending fights
// ============================================================
function fmtRelative(dateStr) {
  if (!dateStr) return '';
  const then = new Date(dateStr);
  if (isNaN(then)) return '';
  const now = new Date();
  const days = Math.floor((now - then) / 86400000);
  if (days <= 0) return 'today';
  if (days === 1) return '1 day ago';
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

function escapeHtml(s) {
  return String(s || '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

function initPipeline(fights) {
  const container = document.getElementById('pipeline-strip');
  if (!container) return;

  const pending = fights
    .filter(f => !f.community_outcome || f.community_outcome === 'pending')
    .filter(f => f.date || f.last_updated)
    .sort((a, b) => {
      const ad = a.last_updated || a.date;
      const bd = b.last_updated || b.date;
      return bd.localeCompare(ad);
    })
    .slice(0, 6);

  container.innerHTML = pending.map(f => {
    const name = escapeHtml(f.project_name || f.jurisdiction || '(unnamed)');
    const state = escapeHtml(f.state || '');
    const company = Array.isArray(f.company) ? f.company[0] : f.company;
    const mw = getMW(f);
    const groups = Array.isArray(f.opposition_groups) ? f.opposition_groups : [];
    const date = f.last_updated || f.date;
    const meta = [
      company ? 'vs ' + escapeHtml(company) : 'Developer TBD',
      mw ? fmtMW(mw) : '',
    ].filter(Boolean).join(' · ');
    const groupsText = groups.length
      ? groups.slice(0, 2).map(escapeHtml).join(' · ') + (groups.length > 2 ? ` · +${groups.length - 2}` : '')
      : '';
    return `
      <a class="pipeline-card" href="index.html?id=${encodeURIComponent(f.id)}" target="_blank" rel="noopener">
        <div class="pipeline-card-top">
          <span class="pipeline-state">${state}</span>
          <span class="pipeline-date">${fmtRelative(date)}</span>
        </div>
        <h3 class="pipeline-name">${name}</h3>
        <p class="pipeline-meta">${meta}</p>
        ${groupsText ? `<p class="pipeline-groups">${groupsText}</p>` : ''}
        <span class="pipeline-arrow">→</span>
      </a>
    `;
  }).join('');
}

// ============================================================
// Chapter rail active state
// ============================================================
function initScrollProgress() {
  const bar = document.getElementById('scroll-progress');
  if (!bar) return;
  let ticking = false;
  const handler = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const h = document.documentElement.scrollHeight - window.innerHeight;
      const pct = h > 0 ? Math.max(0, Math.min(100, (window.scrollY / h) * 100)) : 0;
      bar.style.width = pct + '%';
      ticking = false;
    });
  };
  window.addEventListener('scroll', handler, { passive: true });
  handler();
}

function initRevealOnScroll() {
  const selectors = ['.chapter-header', '.case-study', '.kicker-block', '.credibility-note', '.mismatch-conclusion'];
  const els = document.querySelectorAll(selectors.join(','));
  els.forEach(el => el.classList.add('reveal-on-scroll'));
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting && e.intersectionRatio > 0.15) {
        e.target.classList.add('is-visible');
      }
    });
  }, { threshold: [0.15] });
  els.forEach(el => obs.observe(el));
}

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
