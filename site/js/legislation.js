/**
 * Legislation Tracker — Dedicated page for state and federal datacenter bills
 */

let fights = [];

// capitalize, escapeHtml, formatDate, getStatusTooltip, STATUS_TOOLTIPS
// are provided by utils.js

const LEG_STATUS_MAP = {
  enacted: { label: 'Enacted', cls: 'leg-enacted' },
  active: { label: 'Active', cls: 'leg-active' },
  advancing: { label: 'Advancing', cls: 'leg-active' },
  pending: { label: 'Pending', cls: 'leg-pending' },
  ongoing: { label: 'Ongoing', cls: 'leg-pending' },
  defeated: { label: 'Defeated', cls: 'leg-defeated' },
  mixed: { label: 'Mixed', cls: 'leg-pending' },
};

document.addEventListener('DOMContentLoaded', async () => {
  const resp = await fetch('data/fights.json');
  fights = await resp.json();

  // Last updated
  const dates = fights.map(f => f.last_updated || f.date).filter(Boolean).sort();
  if (dates.length) {
    const latest = dates[dates.length - 1];
    document.getElementById('last-updated').textContent = 'Last updated: ' + new Date(latest + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  }

  // Close panel
  document.getElementById('close-panel').addEventListener('click', closePanel);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closePanel();
  });

  // Status tooltip positioning
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

  updateLegislation();
});

function getLegStatus(f) {
  const raw = (f.status || '').toLowerCase();
  for (const [key, val] of Object.entries(LEG_STATUS_MAP)) {
    if (raw.startsWith(key) || raw.includes(key)) return val;
  }
  return { label: capitalize(f.status), cls: 'leg-pending' };
}

function updateLegislation() {
  const legislation = fights.filter(f => f.scope === 'statewide' || f.scope === 'federal');
  document.getElementById('legislation-count').textContent = legislation.length;

  const federal = legislation.filter(f => f.scope === 'federal').sort((a, b) => b.date.localeCompare(a.date));
  const statewide = legislation.filter(f => f.scope === 'statewide');

  const byState = {};
  statewide.forEach(f => {
    byState[f.state] = byState[f.state] || [];
    byState[f.state].push(f);
  });
  const stateKeys = Object.keys(byState).sort();

  const fedEl = document.getElementById('legislation-federal');
  if (federal.length) {
    fedEl.innerHTML = `
      <h3 class="leg-group-title">Federal</h3>
      <div class="leg-cards">${federal.map(f => renderLegCard(f)).join('')}</div>
    `;
  } else {
    fedEl.innerHTML = '';
  }

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

  document.querySelectorAll('.leg-card[data-id]').forEach(card => {
    card.addEventListener('click', () => {
      const fight = fights.find(f => f.id === card.dataset.id);
      if (fight) openDetail(fight);
    });
  });
}

function renderLegCard(f) {
  const st = getLegStatus(f);

  let title = f.bill_name;
  if (!title) {
    title = f.jurisdiction
      .replace(/\(statewide[^)]*\)/i, '')
      .replace(/\(federal\)/i, '')
      .replace(/^[\s,]+|[\s,]+$/g, '').trim();
    if (!title || title === f.state) title = f.action_type;
  }

  const rawSummary = f.summary || '';
  let summary = '';
  const actionVerbs = /(?:^|,\s*|\)\s*)(would |requires? |establishes? |prohibits? |creates? |imposes? |protects? |proposes? |bans? |mandates? |limits? |bars? |halts? )/i;
  const actionMatch = rawSummary.match(actionVerbs);
  if (actionMatch) {
    summary = rawSummary.slice(actionMatch.index).replace(/^,\s*/, '').replace(/^\)\s*/, '');
    summary = summary.charAt(0).toUpperCase() + summary.slice(1);
    const dotMatch = summary.match(/[a-z]{2,}[.]\s|[0-9][.]\s/);
    if (dotMatch) summary = summary.slice(0, dotMatch.index + 2);
    if (summary.length > 200) summary = summary.slice(0, 200) + '…';
  } else {
    const sentences = rawSummary.match(/[^.]+\.\s*/g) || [];
    if (sentences.length > 1 && sentences[0].length < 80) {
      summary = (sentences[0] + sentences[1]).trim();
    } else {
      summary = rawSummary.slice(0, 200);
    }
    if (summary.length > 200) summary = summary.slice(0, 200) + '…';
  }

  return `
    <div class="leg-card" data-id="${f.id}">
      <div class="leg-card-top">
        <span class="leg-status ${st.cls}">${st.label}</span>
        <span class="leg-date">${formatDate(f.date)}</span>
      </div>
      <div class="leg-card-title">${title}</div>
      ${f.sponsors && f.sponsors.length ? `<div class="leg-card-sponsors">${f.sponsors.join(', ')}</div>` : ''}
      <div class="leg-card-summary">${summary}</div>
      ${f.bill_url ? `<a href="${f.bill_url}" target="_blank" class="leg-card-bill" onclick="event.stopPropagation()">${f.bill_name || 'View Bill'} ↗</a>` : ''}
    </div>
  `;
}

function openDetail(f) {
  const panel = document.getElementById('detail-panel');
  const content = document.getElementById('detail-content');

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

  const oppLinks = [];
  if (f.opposition_website) oppLinks.push(`<a href="${f.opposition_website}" target="_blank">Website</a>`);
  if (f.opposition_facebook) {
    const fbLabel = f.opposition_facebook_members ? `Facebook (${f.opposition_facebook_members.toLocaleString()} members)` : 'Facebook';
    oppLinks.push(`<a href="${f.opposition_facebook}" target="_blank">${fbLabel}</a>`);
  }
  if (f.petition_url) {
    const petLabel = f.petition_signatures ? `Petition (${f.petition_signatures.toLocaleString()} signatures)` : 'Petition';
    oppLinks.push(`<a href="${f.petition_url}" target="_blank">${petLabel}</a>`);
  }

  content.innerHTML = `
    <h2>${f.jurisdiction}, ${f.state}</h2>
    <div class="detail-meta">
      <span class="status-badge status-${f.status}">${capitalize(f.status)}<span class="info-icon">i</span><span class="status-tip">${escapeHtml(getStatusTooltip(f.status))}</span></span>
      &nbsp;&middot;&nbsp;
      ${formatDate(f.date)}
    </div>

    ${f.objective ? `<div class="detail-section"><h3>Objective</h3><p style="font-weight:600">${f.objective}</p></div>` : ''}

    ${f.sponsors && f.sponsors.length ? `<div class="detail-section"><h3>Sponsors</h3><p>${f.sponsors.join('<br>')}</p></div>` : ''}

    ${f.issue_category && f.issue_category.length ? `<div class="detail-section"><h3>Issues Addressed</h3><div class="issue-tags">${f.issue_category.map(c => `<span class="issue-tag">${c.replace(/_/g, ' ')}</span>`).join('')}</div></div>` : ''}

    ${f.summary ? `<div class="detail-section"><h3>Summary</h3><p>${f.summary}</p></div>` : ''}

    ${f.bill_url ? `<div class="detail-section bill-link-section"><h3>Official Bill</h3><a href="${f.bill_url}" target="_blank" class="bill-link">${f.bill_name || 'View Bill Text'} ↗</a></div>` : ''}

    <div class="detail-section">
      <h3>Supporting Organizations</h3>
      <div class="groups-container">${groupsHtml}</div>
    </div>

    ${oppLinks.length ? `<div class="detail-section"><h3>Advocacy Links</h3><div class="opp-links">${oppLinks.map(l => `<span class="opp-link">${l}</span>`).join('')}</div></div>` : ''}

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

