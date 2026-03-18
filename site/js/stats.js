/**
 * Stats page — all charts computed dynamically from fights.json
 */

document.addEventListener('DOMContentLoaded', async () => {
  const resp = await fetch('data/fights.json');
  const fights = await resp.json();

  const petitionData = dedupePetitions(fights);

  renderHeroStats(fights, petitionData);
  renderTimeline(fights);
  renderOutcomes(fights);
  renderHyperscalers(fights);
  renderStateRankings(fights, petitionData);
  renderPartisan(fights);
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

// --- Hyperscalers ---

function renderHyperscalers(fights) {
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
