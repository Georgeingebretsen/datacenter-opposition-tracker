/**
 * Stats page — all charts computed dynamically from fights.json
 */

document.addEventListener('DOMContentLoaded', async () => {
  const resp = await fetch('data/fights.json');
  const fights = await resp.json();

  const petitionData = dedupePetitions(fights);

  renderHeroStats(fights, petitionData);
  renderCallouts(fights, petitionData);
  renderTimeline(fights);
  renderOutcomes(fights);
  renderHyperscalerScorecard(fights);
  renderStateRankings(fights, petitionData);
  renderPartisan(fights);
  renderWinRateByTool(fights);
  renderIssueCategoryChart(fights);
  renderPartisanWinRate(fights);
  renderSigsVsJobs(fights);
  renderGroupsTimeline(fights);
  renderTopPetitions(fights, petitionData);

  // Last updated
  const dates = fights.map(f => f.last_updated || f.date).filter(Boolean).sort();
  if (dates.length) {
    const latest = dates[dates.length - 1];
    document.getElementById('last-updated').textContent = 'Last updated: ' + new Date(latest + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  }
});

// --- Utilities ---

function formatBigNumber(n) {
  if (n >= 1e12) return '$' + (n / 1e12).toFixed(1) + 'T';
  if (n >= 1e9) return '$' + (n / 1e9).toFixed(1) + 'B';
  if (n >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e3) return n.toLocaleString();
  return String(n);
}

function formatNumber(n) {
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return String(n);
}

function countBy(arr, fn) {
  const counts = {};
  arr.forEach(item => {
    const key = fn(item);
    if (key) counts[key] = (counts[key] || 0) + 1;
  });
  return counts;
}

function sumBy(arr, fn) {
  const sums = {};
  arr.forEach(item => {
    const [key, val] = fn(item);
    if (key && val) sums[key] = (sums[key] || 0) + val;
  });
  return sums;
}

/**
 * Deduplicate petition signatures by URL.
 * When multiple entries share the same petition URL, only count the
 * highest signature value once. Returns { totalSigs, uniquePetitions,
 * byState: {state: dedupedSigs}, topPetitions: [...] }
 */
function dedupePetitions(fights) {
  // Group by petition URL
  const byUrl = {};
  const noUrl = []; // entries with signatures but no URL
  fights.forEach(f => {
    if (!f.petition_signatures) return;
    const url = f.petition_url;
    if (url) {
      if (!byUrl[url]) byUrl[url] = [];
      byUrl[url].push(f);
    } else {
      noUrl.push(f);
    }
  });

  // For each unique URL, take the max signature count and the best entry for display
  const uniquePetitions = [];
  let totalSigs = 0;
  const byState = {};

  for (const [url, entries] of Object.entries(byUrl)) {
    // Pick the entry with the highest signature count as the representative
    entries.sort((a, b) => (b.petition_signatures || 0) - (a.petition_signatures || 0));
    const best = entries[0];
    const sigs = best.petition_signatures;
    totalSigs += sigs;
    uniquePetitions.push(best);

    // Attribute to the representative entry's state
    const state = best.state;
    byState[state] = (byState[state] || 0) + sigs;
  }

  // Add no-URL entries (these are unique by definition)
  noUrl.forEach(f => {
    totalSigs += f.petition_signatures;
    uniquePetitions.push(f);
    byState[f.state] = (byState[f.state] || 0) + f.petition_signatures;
  });

  // Sort petitions by signatures desc
  uniquePetitions.sort((a, b) => (b.petition_signatures || 0) - (a.petition_signatures || 0));

  return { totalSigs, uniquePetitions, byState };
}

function topN(obj, n) {
  return Object.entries(obj)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n);
}

// --- Hero Stats ---

function renderHeroStats(fights, petitionData) {
  const states = new Set(fights.map(f => f.state));
  const groups = new Set();
  fights.forEach(f => (f.opposition_groups || []).forEach(g => groups.add(g)));
  const totalInv = fights.reduce((s, f) => s + (f.investment_usd || 0), 0);
  const blocked = fights.filter(f => ['cancelled', 'defeated'].includes(f.status));
  const blockedInv = blocked.reduce((s, f) => s + (f.investment_usd || 0), 0);
  const activeMoratoria = fights.filter(f => f.action_type === 'moratorium' && ['active', 'enacted', 'approved'].includes(f.status)).length;

  document.getElementById('s-total').textContent = fights.length.toLocaleString();
  document.getElementById('s-states').textContent = states.size;
  document.getElementById('s-groups').textContent = groups.size.toLocaleString();
  document.getElementById('s-signatures').textContent = formatNumber(petitionData.totalSigs);
  document.getElementById('s-investment').textContent = formatBigNumber(totalInv);
  document.getElementById('s-blocked').textContent = formatBigNumber(blockedInv);
  document.getElementById('s-moratoria').textContent = activeMoratoria;
  document.getElementById('s-petitions').textContent = petitionData.uniquePetitions.length;
}

// --- Timeline Chart (SVG bar chart) ---

function renderTimeline(fights) {
  const byMonth = {};
  fights.forEach(f => {
    const d = f.date || '';
    if (d.length >= 7) {
      const m = d.slice(0, 7);
      byMonth[m] = (byMonth[m] || 0) + 1;
    }
  });

  const months = Object.keys(byMonth).sort();
  // Only show last 18 months or all if fewer
  const display = months.slice(-18);
  const values = display.map(m => byMonth[m]);
  const maxVal = Math.max(...values, 1);

  const container = document.getElementById('timeline-chart');
  const W = container.clientWidth || 800;
  const H = 280;
  const padL = 45, padR = 15, padT = 25, padB = 55;
  const chartW = W - padL - padR;
  const chartH = H - padT - padB;
  const barW = Math.max(8, (chartW / display.length) - 4);
  const gap = (chartW - barW * display.length) / (display.length + 1);

  let svg = `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">`;

  // Gridlines
  const gridLines = 4;
  for (let i = 0; i <= gridLines; i++) {
    const y = padT + (chartH / gridLines) * i;
    const val = Math.round(maxVal * (1 - i / gridLines));
    svg += `<line x1="${padL}" y1="${y}" x2="${W - padR}" y2="${y}" class="timeline-gridline"/>`;
    svg += `<text x="${padL - 8}" y="${y + 4}" text-anchor="end" class="timeline-label">${val}</text>`;
  }

  // Bars
  display.forEach((m, i) => {
    const v = byMonth[m];
    const barH = (v / maxVal) * chartH;
    const x = padL + gap + i * (barW + gap);
    const y = padT + chartH - barH;

    svg += `<rect x="${x}" y="${y}" width="${barW}" height="${barH}" rx="3" class="timeline-bar">
      <title>${m}: ${v} fights</title>
    </rect>`;

    // Value on top of bar
    if (v > 0) {
      svg += `<text x="${x + barW / 2}" y="${y - 5}" text-anchor="middle" class="timeline-value">${v}</text>`;
    }

    // Month label (show every 2nd or 3rd depending on count)
    const showLabel = display.length <= 12 || i % 2 === 0;
    if (showLabel) {
      const label = m.slice(2); // "25-01"
      svg += `<text x="${x + barW / 2}" y="${padT + chartH + 18}" text-anchor="middle" class="timeline-label">${label}</text>`;
    }
  });

  // Axis line
  svg += `<line x1="${padL}" y1="${padT + chartH}" x2="${W - padR}" y2="${padT + chartH}" class="timeline-axis"/>`;

  svg += '</svg>';
  container.innerHTML = svg;
}

// --- Outcomes ---

function renderOutcomes(fights) {
  // Group statuses into display categories
  const statusGroups = {
    'Active': f => f.status === 'active',
    'Ongoing': f => f.status === 'ongoing',
    'Pending': f => f.status === 'pending',
    'Cancelled / Defeated': f => ['cancelled', 'defeated'].includes(f.status),
    'Enacted': f => f.status === 'enacted',
    'Approved (for developer)': f => f.status === 'approved',
    'Delayed': f => f.status === 'delayed',
    'Expired / Other': f => ['expired', 'mixed'].includes(f.status),
  };

  const statusColors = {
    'Active': 'status-active',
    'Ongoing': 'status-ongoing',
    'Pending': 'status-pending',
    'Cancelled / Defeated': 'status-cancelled',
    'Enacted': 'status-enacted',
    'Approved (for developer)': 'status-approved',
    'Delayed': 'status-delayed',
    'Expired / Other': 'status-expired',
  };

  const counts = {};
  for (const [label, fn] of Object.entries(statusGroups)) {
    counts[label] = fights.filter(fn).length;
  }

  const maxCount = Math.max(...Object.values(counts), 1);
  const container = document.getElementById('outcomes-chart');
  container.innerHTML = Object.entries(counts)
    .filter(([, v]) => v > 0)
    .map(([label, count]) => `
      <div class="bar-row">
        <span class="bar-label">${label}</span>
        <div class="bar-track">
          <div class="bar-fill ${statusColors[label]}" style="width: ${(count / maxCount) * 100}%"></div>
        </div>
        <span class="bar-value">${count}</span>
      </div>
    `).join('');

  // Moratorium donut
  const moratoria = fights.filter(f => f.action_type === 'moratorium');
  const mHolding = moratoria.filter(f => ['active', 'enacted', 'approved'].includes(f.status)).length;
  const mFailed = moratoria.filter(f => ['defeated', 'expired'].includes(f.status)).length;
  const mPending = moratoria.filter(f => ['pending', 'ongoing', 'delayed'].includes(f.status)).length;
  const mCancelled = moratoria.filter(f => f.status === 'cancelled').length;
  const total = moratoria.length || 1;

  const holdPct = Math.round((mHolding / total) * 100);

  document.getElementById('moratorium-subtitle').textContent =
    `${mHolding} holding of ${total} moratoriums (${holdPct}%)`;

  // Simple donut SVG
  const segments = [
    { val: mHolding, color: '#66800B', label: 'Holding' },
    { val: mPending, color: '#AD8301', label: 'Pending' },
    { val: mCancelled, color: '#BC5215', label: 'Cancelled' },
    { val: mFailed, color: '#878580', label: 'Expired/Defeated' },
  ].filter(s => s.val > 0);

  let donutSvg = `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">`;
  const cx = 100, cy = 100, r = 80, inner = 50;
  let angle = -90;

  segments.forEach(seg => {
    const sweep = (seg.val / total) * 360;
    const startAngle = angle;
    const endAngle = angle + sweep;

    const x1 = cx + r * Math.cos((startAngle * Math.PI) / 180);
    const y1 = cy + r * Math.sin((startAngle * Math.PI) / 180);
    const x2 = cx + r * Math.cos((endAngle * Math.PI) / 180);
    const y2 = cy + r * Math.sin((endAngle * Math.PI) / 180);
    const ix1 = cx + inner * Math.cos((endAngle * Math.PI) / 180);
    const iy1 = cy + inner * Math.sin((endAngle * Math.PI) / 180);
    const ix2 = cx + inner * Math.cos((startAngle * Math.PI) / 180);
    const iy2 = cy + inner * Math.sin((startAngle * Math.PI) / 180);

    const largeArc = sweep > 180 ? 1 : 0;

    donutSvg += `<path d="M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} L ${ix1} ${iy1} A ${inner} ${inner} 0 ${largeArc} 0 ${ix2} ${iy2} Z" fill="${seg.color}" opacity="0.85">
      <title>${seg.label}: ${seg.val}</title>
    </path>`;

    angle = endAngle;
  });

  // Center text
  donutSvg += `<text x="${cx}" y="${cy - 4}" text-anchor="middle" class="donut-center-text" font-size="32">${holdPct}%</text>`;
  donutSvg += `<text x="${cx}" y="${cy + 16}" text-anchor="middle" class="donut-center-label">holding</text>`;
  donutSvg += '</svg>';

  document.getElementById('moratorium-donut').innerHTML = donutSvg;
}

// --- Callout Cards (shocking stats) ---

function renderCallouts(fights, petitionData) {
  const blocked = fights.filter(f => ['cancelled', 'defeated'].includes(f.status));
  const blockedInv = blocked.reduce((s, f) => s + (f.investment_usd || 0), 0);
  const totalInv = fights.reduce((s, f) => s + (f.investment_usd || 0), 0);

  // 96% started since 2025
  const since2025 = fights.filter(f => (f.date || '') >= '2025-01-01').length;
  const pctRecent = Math.round((since2025 / fights.length) * 100);

  // David vs Goliath: investment per petition signature
  const petFights = fights.filter(f => f.petition_signatures > 0 && f.investment_usd > 0);
  const avgInvPerSig = petFights.length > 0
    ? petFights.reduce((s,f) => s + f.investment_usd, 0) / petFights.reduce((s,f) => s + f.petition_signatures, 0)
    : 0;

  // Moratoriums per day in peak month
  const byMonth = {};
  fights.forEach(f => {
    if (f.action_type === 'moratorium' && f.date && f.date.length >= 7)
      byMonth[f.date.slice(0,7)] = (byMonth[f.date.slice(0,7)] || 0) + 1;
  });
  const peakMorMonth = Object.entries(byMonth).sort((a,b) => b[1]-a[1])[0];
  const morPerDay = peakMorMonth ? (peakMorMonth[1] / 28).toFixed(1) : '?';

  // R vs D moratorium comparison
  const rMor = fights.filter(f => f.action_type === 'moratorium' && f.county_lean === 'R').length;
  const dMor = fights.filter(f => f.action_type === 'moratorium' && f.county_lean === 'D').length;

  const cards = [
    { number: formatBigNumber(blockedInv), color: 'green', label: 'in projects successfully blocked or defeated by community opposition' },
    { number: pctRecent + '%', color: 'red', label: 'of all fights started since January 2025 — this movement barely existed before then' },
    { number: '$' + formatNumber(Math.round(avgInvPerSig)), color: 'accent', label: 'in investment contested per petition signature — grassroots vs. Big Tech' },
    { number: morPerDay + '/day', color: 'blue', label: 'new moratoriums in the peak month (' + (peakMorMonth ? peakMorMonth[0] : '?') + ')' },
    { number: rMor + ' R vs ' + dMor + ' D', color: 'accent', label: 'moratoriums by county lean — this is a bipartisan movement' },
    { number: '657', color: 'green', label: 'unique opposition groups have formed nationwide to fight data centers' },
  ];

  // Recompute groups dynamically
  const groups = new Set();
  fights.forEach(f => (f.opposition_groups || []).forEach(g => groups.add(g)));
  cards[5].number = groups.size.toLocaleString();

  document.getElementById('callout-grid').innerHTML = cards.map(c => `
    <div class="callout-card">
      <span class="callout-number ${c.color}">${c.number}</span>
      <span class="callout-label">${c.label}</span>
    </div>
  `).join('');
}

// --- Hyperscaler Scorecard ---

function renderHyperscalerScorecard(fights) {
  const normalize = {
    'Amazon/AWS': 'Amazon / AWS', 'Amazon': 'Amazon / AWS', 'AWS': 'Amazon / AWS',
    'Google': 'Google', 'Meta': 'Meta', 'Microsoft': 'Microsoft',
    'OpenAI': 'OpenAI', 'CoreWeave': 'CoreWeave', 'xAI': 'xAI', 'Nebius': 'Nebius', 'Oracle': 'Oracle',
  };
  const colors = {
    'Amazon / AWS': '#FF9900', 'Google': '#4285F4', 'Meta': '#0668E1',
    'Microsoft': '#00A4EF', 'OpenAI': '#10A37F', 'CoreWeave': '#6C63FF',
    'xAI': '#1DA1F2', 'Nebius': '#E040FB', 'Oracle': '#F80000',
  };

  const stats = {};
  fights.forEach(f => {
    const h = normalize[f.hyperscaler] || f.hyperscaler;
    if (!h) return;
    if (!stats[h]) stats[h] = { fights: 0, blocked: 0, approved: 0, investment: 0, petitions: 0, moratoria: 0 };
    stats[h].fights++;
    if (['cancelled','defeated'].includes(f.status)) stats[h].blocked++;
    if (f.status === 'approved') stats[h].approved++;
    stats[h].investment += f.investment_usd || 0;
    stats[h].petitions += f.petition_signatures || 0;
    if (f.action_type === 'moratorium') stats[h].moratoria++;
  });

  const sorted = Object.entries(stats).filter(([,s]) => s.fights >= 3).sort((a,b) => b[1].fights - a[1].fights);
  const maxFights = sorted[0]?.[1].fights || 1;

  let html = `<table class="scorecard-table">
    <thead><tr>
      <th>Company</th><th>Fights</th><th></th><th class="num">Blocked</th><th class="num">Approved</th><th class="num">At Stake</th><th class="num">Petition Sigs</th>
    </tr></thead><tbody>`;

  sorted.forEach(([name, s]) => {
    const color = colors[name] || '#878580';
    const barW = (s.fights / maxFights) * 100;
    const blockedW = s.fights > 0 ? (s.blocked / s.fights) * barW : 0;
    const approvedW = s.fights > 0 ? (s.approved / s.fights) * barW : 0;
    const ongoingW = barW - blockedW - approvedW;

    html += `<tr>
      <td><span class="scorecard-company"><span class="scorecard-dot" style="background:${color}"></span>${name}</span></td>
      <td class="num">${s.fights}</td>
      <td style="width:200px">
        <span class="scorecard-bar" style="width:${blockedW}%;background:#66800B" title="${s.blocked} blocked"></span><span class="scorecard-bar" style="width:${ongoingW}%;background:${color};opacity:0.5" title="ongoing"></span><span class="scorecard-bar" style="width:${approvedW}%;background:#AF3029" title="${s.approved} approved"></span>
      </td>
      <td class="num" style="color:#66800B;font-weight:600">${s.blocked}</td>
      <td class="num" style="color:#AF3029">${s.approved}</td>
      <td class="num">${s.investment > 0 ? formatBigNumber(s.investment) : '—'}</td>
      <td class="num">${s.petitions > 0 ? s.petitions.toLocaleString() : '—'}</td>
    </tr>`;
  });

  html += '</tbody></table>';
  document.getElementById('hyperscaler-scorecard').innerHTML = html;
}

// --- (old hyperscalers function replaced by scorecard above) ---

function _unusedRenderHyperscalers(fights) {
  // Normalize hyperscaler names
  const normalize = {
    'Amazon/AWS': 'Amazon / AWS',
    'Amazon': 'Amazon / AWS',
    'AWS': 'Amazon / AWS',
    'Google': 'Google',
    'Meta': 'Meta',
    'Microsoft': 'Microsoft',
    'OpenAI': 'OpenAI',
    'CoreWeave': 'CoreWeave',
    'xAI': 'xAI',
    'Nebius': 'Nebius',
    'Oracle': 'Oracle',
  };

  const colors = {
    'Amazon / AWS': 'hyp-amazon',
    'Google': 'hyp-google',
    'Meta': 'hyp-meta',
    'Microsoft': 'hyp-microsoft',
    'OpenAI': 'hyp-openai',
    'CoreWeave': 'hyp-coreweave',
    'xAI': 'hyp-xai',
  };

  const counts = {};
  fights.forEach(f => {
    if (f.hyperscaler) {
      const key = normalize[f.hyperscaler] || f.hyperscaler;
      counts[key] = (counts[key] || 0) + 1;
    }
  });

  const sorted = topN(counts, 10);
  const maxVal = sorted.length ? sorted[0][1] : 1;

  document.getElementById('hyperscaler-chart').innerHTML = sorted.map(([name, count]) => {
    const colorClass = colors[name] || 'hyp-default';
    return `
      <div class="bar-row">
        <span class="bar-label">${name}</span>
        <div class="bar-track">
          <div class="bar-fill ${colorClass}" style="width: ${(count / maxVal) * 100}%"></div>
        </div>
        <span class="bar-value">${count}</span>
      </div>
    `;
  }).join('');
}

// --- State Rankings ---

function renderStateRankings(fights, petitionData) {
  // Top states by count
  const stateCounts = countBy(fights, f => f.state);
  const topStates = topN(stateCounts, 12);
  const maxCount = topStates[0]?.[1] || 1;

  document.getElementById('state-count-chart').innerHTML = topStates.map(([state, count]) => `
    <div class="bar-row">
      <span class="bar-label">${state}</span>
      <div class="bar-track">
        <div class="bar-fill fill-accent" style="width: ${(count / maxCount) * 100}%"></div>
      </div>
      <span class="bar-value">${count}</span>
    </div>
  `).join('');

  // Top states by petition signatures (deduplicated)
  const topSigs = topN(petitionData.byState, 12);
  const maxSigs = topSigs[0]?.[1] || 1;

  document.getElementById('state-sigs-chart').innerHTML = topSigs.map(([state, sigs]) => `
    <div class="bar-row">
      <span class="bar-label">${state}</span>
      <div class="bar-track">
        <div class="bar-fill fill-blue" style="width: ${(sigs / maxSigs) * 100}%"></div>
      </div>
      <span class="bar-value">${formatNumber(sigs)}</span>
    </div>
  `).join('');
}

// --- Partisan Breakdown ---

function renderPartisan(fights) {
  const r = fights.filter(f => f.county_lean === 'R').length;
  const d = fights.filter(f => f.county_lean === 'D').length;
  const none = fights.length - r - d;
  const total = fights.length || 1;

  const rPct = ((r / total) * 100).toFixed(1);
  const dPct = ((d / total) * 100).toFixed(1);
  const nPct = ((none / total) * 100).toFixed(1);

  document.getElementById('partisan-bar').innerHTML = `
    <div class="partisan-bar-outer">
      <div class="bar-r" style="width: ${rPct}%">${r} R (${Math.round(rPct)}%)</div>
      <div class="bar-d" style="width: ${dPct}%">${d} D (${Math.round(dPct)}%)</div>
      <div class="bar-none" style="width: ${nPct}%">${none}</div>
    </div>
    <div class="partisan-legend">
      <span>Republican-leaning counties</span>
      <span>Democratic-leaning counties</span>
      <span>Statewide / no county data</span>
    </div>
  `;
}

// --- Win Rate by Tool (Action Type) ---

function renderWinRateByTool(fights) {
  const ACTION_NAMES = {
    moratorium: 'Moratorium', legislation: 'Legislation', zoning_restriction: 'Zoning Restriction',
    community_opposition: 'Community Opposition', lawsuit: 'Lawsuit', petition: 'Petition',
    permit_denial: 'Permit Denial', protest: 'Protest', project_withdrawal: 'Project Withdrawal',
    infrastructure_opposition: 'Infrastructure', regulatory_action: 'Regulatory', executive_action: 'Executive',
    study_or_report: 'Study/Report',
  };

  const stats = {};
  fights.forEach(f => {
    const at = f.action_type || 'other';
    if (!stats[at]) stats[at] = { total: 0, wins: 0, losses: 0, pending: 0 };
    stats[at].total++;
    const o = f.community_outcome || 'pending';
    if (o === 'win' || o === 'win_withdrawal') stats[at].wins++;
    else if (o === 'loss') stats[at].losses++;
    else stats[at].pending++;
  });

  // Only show types with 5+ entries
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
      <td class="num" style="color:#66800B;font-weight:600">${s.wins}</td>
      <td class="num" style="color:#AF3029">${s.losses}</td>
      <td class="num" style="font-weight:700">${winPct}%</td>
      <td style="width:150px">
        <span class="scorecard-bar" style="width:${winPct}%;background:#66800B"></span><span class="scorecard-bar" style="width:${pendPct}%;background:#AD8301;opacity:0.3"></span><span class="scorecard-bar" style="width:${lossPct}%;background:#AF3029"></span>
      </td>
    </tr>`;
  });

  html += '</tbody></table>';
  document.getElementById('winrate-chart').innerHTML = html;
}

// --- Issue Category Breakdown ---

function renderIssueCategoryChart(fights) {
  const ISSUE_NAMES = {
    land_use: 'Land Use', water: 'Water', environmental: 'Environmental',
    community_impact: 'Community Impact', grid_energy: 'Grid / Energy',
    permitting: 'Permitting', noise_nuisance: 'Noise / Nuisance',
    ratepayer_protection: 'Ratepayer Protection', transparency: 'Transparency',
    tax_incentive: 'Tax / Incentive', design_standards: 'Design Standards', health: 'Health',
  };

  const counts = {};
  fights.forEach(f => {
    (f.issue_category || []).forEach(c => {
      counts[c] = (counts[c] || 0) + 1;
    });
  });

  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const maxVal = sorted[0]?.[1] || 1;

  document.getElementById('issue-chart').innerHTML = sorted.map(([cat, count]) => {
    const name = ISSUE_NAMES[cat] || cat.replace(/_/g, ' ');
    const pct = Math.round((count / fights.length) * 100);
    return `<div class="bar-row">
      <span class="bar-label">${name}</span>
      <div class="bar-track">
        <div class="bar-fill fill-accent" style="width: ${(count / maxVal) * 100}%"></div>
      </div>
      <span class="bar-value">${count} (${pct}%)</span>
    </div>`;
  }).join('');
}

// --- Partisan Win Rate ---

function renderPartisanWinRate(fights) {
  const stats = { R: { total: 0, wins: 0, losses: 0 }, D: { total: 0, wins: 0, losses: 0 } };

  fights.forEach(f => {
    const lean = f.county_lean;
    if (!lean || !stats[lean]) return;
    const resolved = ['win', 'win_withdrawal', 'loss'].includes(f.community_outcome);
    if (!resolved) return;
    stats[lean].total++;
    if (f.community_outcome === 'win' || f.community_outcome === 'win_withdrawal') stats[lean].wins++;
    else if (f.community_outcome === 'loss') stats[lean].losses++;
  });

  const rWinPct = stats.R.total > 0 ? Math.round((stats.R.wins / stats.R.total) * 100) : 0;
  const dWinPct = stats.D.total > 0 ? Math.round((stats.D.wins / stats.D.total) * 100) : 0;

  document.getElementById('partisan-winrate').innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:2rem;text-align:center;">
      <div class="callout-card">
        <span class="callout-number red">${rWinPct}%</span>
        <span class="callout-label">win rate in Republican counties<br><small style="color:var(--text-muted)">${stats.R.wins} won, ${stats.R.losses} lost of ${stats.R.total} resolved</small></span>
      </div>
      <div class="callout-card">
        <span class="callout-number blue">${dWinPct}%</span>
        <span class="callout-label">win rate in Democratic counties<br><small style="color:var(--text-muted)">${stats.D.wins} won, ${stats.D.losses} lost of ${stats.D.total} resolved</small></span>
      </div>
    </div>
  `;
}

// --- Petition Signatures vs Jobs Promised ---

function renderSigsVsJobs(fights) {
  // Extract entries where we can find job numbers in the summary AND have petition signatures
  const pairs = [];
  fights.forEach(f => {
    if (!f.petition_signatures || f.petition_signatures < 50) return;
    const s = f.summary || '';
    // Match patterns like "X permanent jobs", "X jobs", "X full-time jobs"
    const matches = s.match(/(\d[\d,]*)\s*(?:permanent|full.time|ongoing|operations?)?\s*jobs?\b/gi);
    if (!matches) return;
    // Take the smallest number that looks like permanent jobs (not construction)
    const jobNums = matches.map(m => parseInt(m.replace(/[^\d]/g, ''))).filter(n => n >= 10 && n <= 2000);
    if (jobNums.length === 0) return;
    const jobs = Math.min(...jobNums);
    if (f.petition_signatures > jobs) {
      pairs.push({ jurisdiction: f.jurisdiction, state: f.state, sigs: f.petition_signatures, jobs, ratio: f.petition_signatures / jobs });
    }
  });

  pairs.sort((a, b) => b.ratio - a.ratio);
  const display = pairs.slice(0, 10);
  if (display.length === 0) { document.getElementById('sigs-vs-jobs').innerHTML = '<p>Insufficient data</p>'; return; }

  const maxSigs = Math.max(...display.map(d => d.sigs));

  let html = `<div class="sigs-jobs-legend">
    <span><span class="legend-dot" style="background:#66800B"></span>Petition signatures opposing</span>
    <span><span class="legend-dot" style="background:#AF3029"></span>Permanent jobs promised</span>
  </div><div class="sigs-jobs-grid">`;

  display.forEach(d => {
    const sigsW = (d.sigs / maxSigs) * 85; // % width
    const jobsW = (d.jobs / maxSigs) * 85;
    const label = `${d.jurisdiction}, ${d.state}`;
    html += `<div class="sigs-jobs-row">
      <span class="sigs-jobs-label" title="${label}">${label}</span>
      <div class="sigs-jobs-bars">
        <div class="sigs-bar" style="width:${sigsW}%">${d.sigs.toLocaleString()}</div>
        <div class="jobs-bar" style="width:${Math.max(jobsW, 1.5)}%">${d.jobs}</div>
      </div>
      <span class="sigs-jobs-ratio">${Math.round(d.ratio)}x</span>
    </div>`;
  });

  html += '</div>';
  document.getElementById('sigs-vs-jobs').innerHTML = html;
}

// --- Opposition Group Growth Timeline ---

function renderGroupsTimeline(fights) {
  // Count new opposition groups appearing per month (based on fight date)
  const byMonth = {};
  fights.forEach(f => {
    const groups = f.opposition_groups || [];
    const date = f.date || '';
    if (groups.length > 0 && date.length >= 7) {
      const m = date.slice(0, 7);
      byMonth[m] = (byMonth[m] || 0) + groups.length;
    }
  });

  const months = Object.keys(byMonth).sort();
  const display = months.slice(-15); // last 15 months
  const values = display.map(m => byMonth[m]);
  const maxVal = Math.max(...values, 1);

  const container = document.getElementById('groups-timeline');
  const W = container.clientWidth || 800;
  const H = 260;
  const padL = 45, padR = 15, padT = 25, padB = 55;
  const chartW = W - padL - padR;
  const chartH = H - padT - padB;
  const barW = Math.max(8, (chartW / display.length) - 4);
  const gap = (chartW - barW * display.length) / (display.length + 1);

  let svg = `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">`;

  // Gridlines
  for (let i = 0; i <= 4; i++) {
    const y = padT + (chartH / 4) * i;
    const val = Math.round(maxVal * (1 - i / 4));
    svg += `<line x1="${padL}" y1="${y}" x2="${W - padR}" y2="${y}" class="timeline-gridline"/>`;
    svg += `<text x="${padL - 8}" y="${y + 4}" text-anchor="end" class="timeline-label">${val}</text>`;
  }

  display.forEach((m, i) => {
    const v = byMonth[m];
    const barH = (v / maxVal) * chartH;
    const x = padL + gap + i * (barW + gap);
    const y = padT + chartH - barH;

    svg += `<rect x="${x}" y="${y}" width="${barW}" height="${barH}" rx="3" fill="#66800B" opacity="0.8">
      <title>${m}: ${v} groups</title>
    </rect>`;
    if (v > 0) svg += `<text x="${x + barW / 2}" y="${y - 5}" text-anchor="middle" class="timeline-value">${v}</text>`;

    const showLabel = display.length <= 12 || i % 2 === 0;
    if (showLabel) svg += `<text x="${x + barW / 2}" y="${padT + chartH + 18}" text-anchor="middle" class="timeline-label">${m.slice(2)}</text>`;
  });

  svg += `<line x1="${padL}" y1="${padT + chartH}" x2="${W - padR}" y2="${padT + chartH}" class="timeline-axis"/>`;
  svg += '</svg>';
  container.innerHTML = svg;
}

// --- Top Petitions ---

function renderTopPetitions(fights, petitionData) {
  // Use deduplicated petitions — each unique petition URL counted once
  const top = petitionData.uniquePetitions.slice(0, 15);
  const maxSigs = top[0]?.petition_signatures || 1;

  document.getElementById('petitions-chart').innerHTML = top.map(f => {
    const label = `${f.jurisdiction}, ${f.state}`;
    const sigs = f.petition_signatures;
    return `
      <div class="bar-row">
        <span class="bar-label" title="${label}">${label}</span>
        <div class="bar-track">
          <div class="bar-fill fill-green" style="width: ${(sigs / maxSigs) * 100}%"></div>
        </div>
        <span class="bar-value">${sigs.toLocaleString()}</span>
      </div>
    `;
  }).join('');
}
