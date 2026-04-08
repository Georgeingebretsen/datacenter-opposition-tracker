/**
 * Legislation Tracker — Dedicated page for state and federal datacenter bills
 */

let fights = [];
let legFilterStatus = 'all';
let legGroupBy = 'state';
let legFilterState = '';
let legFilterIssue = '';
let legFederalExpanded = false;
let legExpandedGroups = new Set();
const LEG_GROUP_COLLAPSE_THRESHOLD = 6;

// capitalize, escapeHtml, formatDate, getStatusTooltip, STATUS_TOOLTIPS
// are provided by utils.js

const LEG_STATUS_MAP = {
  passed: { label: 'Passed', cls: 'leg-enacted' },
  enacted: { label: 'Enacted', cls: 'leg-enacted' },
  active: { label: 'Active', cls: 'leg-active' },
  advancing: { label: 'Advancing', cls: 'leg-active' },
  pending: { label: 'Pending', cls: 'leg-pending' },
  ongoing: { label: 'Ongoing', cls: 'leg-pending' },
  defeated: { label: 'Defeated', cls: 'leg-defeated' },
  cancelled: { label: 'Cancelled', cls: 'leg-defeated' },
  expired: { label: 'Expired', cls: 'leg-defeated' },
  mixed: { label: 'Mixed', cls: 'leg-pending' },
};

const ISSUE_LABELS = {
  zoning: 'Zoning / Land Use',
  water: 'Water',
  environmental: 'Environmental',
  community_impact: 'Community Impact',
  grid_energy: 'Grid / Energy',
  transparency: 'Transparency',
  ratepayer: 'Ratepayer',
  noise: 'Noise',
  tax_incentive: 'Tax / Incentive',
  farmland: 'Farmland',
  traffic: 'Traffic',
  design_standards: 'Design Standards',
  contract_guarantees: 'Contract Guarantees',
  anti_ai: 'Anti-AI',
};

const STATE_NAMES = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California',
  CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware', FL: 'Florida', GA: 'Georgia',
  HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois', IN: 'Indiana', IA: 'Iowa',
  KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland',
  MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi', MO: 'Missouri',
  MT: 'Montana', NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire', NJ: 'New Jersey',
  NM: 'New Mexico', NY: 'New York', NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio',
  OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina',
  SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont',
  VA: 'Virginia', WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming',
  DC: 'District of Columbia',
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

  // Custom tooltip system for [data-tooltip] elements (used on issue/action/authority tags)
  setupCustomTooltips();

  // Status tooltip positioning (guard against e.target being non-Element like document)
  document.addEventListener('mouseenter', (e) => {
    if (!e.target || typeof e.target.closest !== 'function') return;
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
    if (!e.target || typeof e.target.closest !== 'function') return;
    const badge = e.target.closest('.status-badge');
    if (!badge) return;
    const tip = badge.querySelector('.status-tip');
    if (tip) tip.style.display = 'none';
  }, true);

  // Bind status filter dropdown
  const statusSelect = document.getElementById('leg-status-select');
  if (statusSelect) {
    statusSelect.addEventListener('change', () => {
      legFilterStatus = statusSelect.value || 'all';
      updateLegislation();
    });
  }

  // Bind group-by pills
  document.querySelectorAll('#leg-group-pills .leg-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      legGroupBy = pill.dataset.group;
      document.querySelectorAll('#leg-group-pills .leg-pill').forEach(p => p.classList.toggle('active', p === pill));
      updateLegislation();
    });
  });

  // Populate state/federal dropdown
  const stateSelect = document.getElementById('leg-state-select');
  const states = [...new Set(fights.filter(f => f.scope === 'statewide').map(f => f.state))].sort();
  states.forEach(s => {
    const opt = document.createElement('option');
    opt.value = s;
    opt.textContent = STATE_NAMES[s] || s;
    stateSelect.appendChild(opt);
  });
  stateSelect.addEventListener('change', () => {
    legFilterState = stateSelect.value;
    updateLegislation();
  });

  // Populate issue dropdown
  const issueSelect = document.getElementById('leg-issue-select');
  const allLeg = fights.filter(f => f.scope === 'statewide' || f.scope === 'federal');
  const issueCounts = {};
  allLeg.forEach(f => (f.issue_category || []).forEach(c => { issueCounts[c] = (issueCounts[c] || 0) + 1; }));
  Object.keys(issueCounts).sort().forEach(c => {
    const opt = document.createElement('option');
    opt.value = c;
    opt.textContent = (ISSUE_LABELS[c] || c) + ' (' + issueCounts[c] + ')';
    issueSelect.appendChild(opt);
  });
  issueSelect.addEventListener('change', () => {
    legFilterIssue = issueSelect.value;
    updateLegislation();
  });

  // Clear Filters button — reset all filters AND grouping back to defaults (group by State)
  const clearBtn = document.getElementById('leg-clear-filters');
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      legFilterStatus = 'all';
      legFilterState = '';
      legFilterIssue = '';
      legGroupBy = 'state';
      legFederalExpanded = false;
      const ss = document.getElementById('leg-status-select');
      const stSel = document.getElementById('leg-state-select');
      const is = document.getElementById('leg-issue-select');
      if (ss) ss.value = 'all';
      if (stSel) stSel.value = '';
      if (is) is.value = '';
      document.querySelectorAll('#leg-group-pills .leg-pill').forEach(p => {
        p.classList.toggle('active', p.dataset.group === 'state');
      });
      updateLegislation();
    });
  }

  updateLegislation();
});

function matchesStatusFilter(f) {
  if (legFilterStatus === 'all') return true;
  const outcome = f.community_outcome || 'pending';
  return outcome === legFilterStatus;
}

function matchesAllFilters(f) {
  if (!matchesStatusFilter(f)) return false;
  if (legFilterState === 'federal' && f.scope !== 'federal') return false;
  if (legFilterState && legFilterState !== 'federal' && f.state !== legFilterState) return false;
  if (legFilterIssue && !(f.issue_category || []).includes(legFilterIssue)) return false;
  return true;
}

function getLegStatus(f) {
  const raw = (f.status || '').toLowerCase();
  for (const [key, val] of Object.entries(LEG_STATUS_MAP)) {
    if (raw.startsWith(key) || raw.includes(key)) return val;
  }
  return { label: capitalize(f.status), cls: 'leg-pending' };
}

function updateLegislation() {
  const allLegislation = fights.filter(f => f.scope === 'statewide' || f.scope === 'federal');
  const legislation = allLegislation.filter(matchesAllFilters);
  document.getElementById('legislation-count').textContent = legislation.length;

  const fedEl = document.getElementById('legislation-federal');
  const statesEl = document.getElementById('legislation-states');

  if (legGroupBy === 'state') {
    const federal = legislation.filter(f => f.scope === 'federal').sort((a, b) => b.date.localeCompare(a.date));
    const statewide = legislation.filter(f => f.scope === 'statewide');
    const byState = {};
    statewide.forEach(f => {
      byState[f.state] = byState[f.state] || [];
      byState[f.state].push(f);
    });
    const stateKeys = Object.keys(byState).sort();

    if (stateKeys.length === 1) {
      const st = stateKeys[0];
      const entries = byState[st].sort((a, b) => b.date.localeCompare(a.date));
      statesEl.innerHTML = `
        <h3 class="leg-group-title">${STATE_NAMES[st] || st} <span class="leg-state-count">${entries.length}</span></h3>
        <div class="leg-cards">${entries.map(f => renderLegCard(f)).join('')}</div>
      `;
    } else if (stateKeys.length > 1) {
      statesEl.innerHTML = `
        <h3 class="leg-group-title">State Legislation <span class="leg-state-count">${stateKeys.length} states</span></h3>
        <div class="leg-grid">${stateKeys.map(st => {
          const entries = byState[st].sort((a, b) => b.date.localeCompare(a.date));
          return `
            <div class="leg-state-group">
              <div class="leg-state-name">${STATE_NAMES[st] || st}</div>
              ${entries.map(f => renderLegCard(f)).join('')}
            </div>
          `;
        }).join('')}</div>
      `;
    } else {
      statesEl.innerHTML = federal.length ? '' : '<p class="leg-empty">No legislation matching this filter.</p>';
    }

    // Federal section at the bottom — collapsed by default
    const userFilteredToState = legFilterState && legFilterState !== 'federal';
    const userFilteredToFederalOnly = legFilterState === 'federal';
    if (federal.length) {
      const alwaysExpanded = userFilteredToFederalOnly || legFederalExpanded;
      const collapsedClass = alwaysExpanded ? '' : 'leg-federal-collapsed';
      const showToggle = !userFilteredToFederalOnly;
      const toggleLabel = legFederalExpanded ? 'Show less' : `Show all ${federal.length} federal entries`;
      fedEl.innerHTML = `
        <h3 class="leg-group-title" style="margin-top:2.5rem">Federal <span class="leg-state-count">${federal.length}</span></h3>
        <div class="${collapsedClass}" id="leg-federal-content">
          <div class="leg-cards">${federal.map(f => renderLegCard(f)).join('')}</div>
        </div>
        ${showToggle ? `<button class="leg-federal-toggle" id="leg-federal-toggle">${toggleLabel}</button>` : ''}
      `;
      const toggle = document.getElementById('leg-federal-toggle');
      if (toggle) {
        toggle.addEventListener('click', () => {
          legFederalExpanded = !legFederalExpanded;
          updateLegislation();
        });
      }
    } else if (!userFilteredToState) {
      fedEl.innerHTML = `
        <h3 class="leg-group-title" style="margin-top:2.5rem">Federal <span class="leg-state-count">0</span></h3>
        <p class="leg-empty">No federal legislation matching this filter.</p>
      `;
    } else {
      fedEl.innerHTML = '';
    }
  } else if (legGroupBy === 'status') {
    fedEl.innerHTML = '';
    const statusOrder = ['pending', 'win', 'loss', 'mixed'];
    const statusLabels = {
      pending: 'Pending',
      win: 'Resolved – Favorable for communities',
      loss: 'Resolved – Unfavorable for communities',
      mixed: 'Resolved – Mixed',
    };
    const byStatus = {};
    legislation.forEach(f => {
      const key = f.community_outcome || 'pending';
      byStatus[key] = byStatus[key] || [];
      byStatus[key].push(f);
    });
    const sortedStatuses = statusOrder.filter(s => byStatus[s]);
    statesEl.innerHTML = sortedStatuses.length
      ? sortedStatuses.map(s => renderCollapsibleGroup('status:' + s, statusLabels[s], byStatus[s])).join('')
      : '<p class="leg-empty">No legislation matching this filter.</p>';
    bindCollapsibleToggles();
  } else if (legGroupBy === 'issue') {
    fedEl.innerHTML = '';
    const byIssue = {};
    legislation.forEach(f => {
      (f.issue_category || ['uncategorized']).forEach(cat => {
        byIssue[cat] = byIssue[cat] || [];
        byIssue[cat].push(f);
      });
    });
    const sortedIssues = Object.keys(byIssue).sort((a, b) => byIssue[b].length - byIssue[a].length);
    statesEl.innerHTML = sortedIssues.length
      ? sortedIssues.map(cat => {
          const label = ISSUE_LABELS[cat] || capitalize(cat.replace(/_/g, ' '));
          return renderCollapsibleGroup('issue:' + cat, label, byIssue[cat]);
        }).join('')
      : '<p class="leg-empty">No legislation matching this filter.</p>';
    bindCollapsibleToggles();
  }

  document.querySelectorAll('.leg-card[data-id]').forEach(card => {
    card.addEventListener('click', () => {
      const fight = fights.find(f => f.id === card.dataset.id);
      if (fight) openDetail(fight);
    });
  });
}

// Render a collapsible group of legislation cards with "Show all" toggle if over threshold
function renderCollapsibleGroup(key, label, entries) {
  const sorted = entries.slice().sort((a, b) => b.date.localeCompare(a.date));
  const expanded = legExpandedGroups.has(key);
  const total = sorted.length;
  const needsCollapse = total > LEG_GROUP_COLLAPSE_THRESHOLD;
  const shown = (needsCollapse && !expanded) ? sorted.slice(0, LEG_GROUP_COLLAPSE_THRESHOLD) : sorted;
  const toggleLabel = expanded ? 'Show less' : `Show all ${total} entries`;
  return `
    <h3 class="leg-group-title">${label} <span class="leg-state-count">${total}</span></h3>
    <div class="leg-cards">${shown.map(f => renderLegCard(f, true)).join('')}</div>
    ${needsCollapse ? `<button class="leg-federal-toggle leg-group-toggle" data-group-key="${escapeHtml(key)}">${toggleLabel}</button>` : ''}
  `;
}

function bindCollapsibleToggles() {
  document.querySelectorAll('.leg-group-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const key = btn.dataset.groupKey;
      if (legExpandedGroups.has(key)) {
        legExpandedGroups.delete(key);
      } else {
        legExpandedGroups.add(key);
      }
      updateLegislation();
    });
  });
}

function renderLegCard(f, showJurisdiction = false) {
  // Use community_outcome for the badge instead of procedural status
  const outcome = f.community_outcome || 'pending';
  const st = {
    label: outcome === 'win' ? 'Resolved – Favorable for communities' :
           outcome === 'loss' ? 'Resolved – Unfavorable for communities' :
           outcome === 'mixed' ? 'Resolved – Mixed' : 'Pending',
    cls: outcome === 'win' ? 'leg-enacted' :
         outcome === 'loss' ? 'leg-defeated' :
         outcome === 'mixed' ? 'leg-pending' : 'leg-pending',
  };

  let title = f.bill_name;
  if (!title) {
    title = f.jurisdiction
      .replace(/\(statewide[^)]*\)/i, '')
      .replace(/\(federal\)/i, '')
      .replace(/^[\s,]+|[\s,]+$/g, '').trim();
    if (!title || title === f.state) title = (f.action_type || [])[0] || '';
  }

  const jurisdictionLabel = showJurisdiction
    ? `<div class="leg-card-jurisdiction">${f.scope === 'federal' ? 'Federal' : f.state}</div>`
    : '';

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
      ${jurisdictionLabel}
      <div class="leg-card-title">${title}</div>
      ${Array.isArray(f.sponsors) && f.sponsors.length ? `<div class="leg-card-sponsors">${f.sponsors.join(', ')}</div>` : ''}
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
      <span class="outcome-badge outcome-${f.community_outcome || 'pending'}">${
        f.community_outcome === 'win' ? 'Resolved – Favorable for communities' :
        f.community_outcome === 'loss' ? 'Resolved – Unfavorable for communities' :
        f.community_outcome === 'mixed' ? 'Resolved – Mixed' :
        'Pending'
      }</span>
      &nbsp;&middot;&nbsp;
      ${formatDate(f.date)}
    </div>

    ${f.objective ? `<div class="detail-section"><h3>Objective</h3><p style="font-weight:600">${f.objective}</p></div>` : ''}

    ${Array.isArray(f.sponsors) && f.sponsors.length ? `<div class="detail-section"><h3>Sponsors</h3><p>${f.sponsors.join('<br>')}</p></div>` : ''}

    ${f.authority_level ? `<div class="detail-section"><h3>Authority Level</h3><p><span class="status-badge" style="text-transform:capitalize;background:var(--border);color:var(--text)">${f.authority_level.replace(/_/g, ' ')}</span></p></div>` : ''}

    ${f.issue_category && f.issue_category.length ? `<div class="detail-section"><h3>Issues Addressed</h3><div class="issue-tags">${f.issue_category.map(c => `<span class="issue-tag" data-tooltip="${escapeHtml(getIssueTooltip(c))}">${c.replace(/_/g, ' ')}<span class="info-icon-detail">i</span></span>`).join('')}</div></div>` : ''}

    ${f.summary ? `<div class="detail-section"><h3>Summary</h3><p>${f.summary}</p></div>` : ''}

    ${f.bill_url ? `<div class="detail-section bill-link-section"><h3>Official Bill</h3><a href="${f.bill_url}" target="_blank" class="bill-link">${f.bill_name || 'View Bill Text'} ↗</a></div>` : ''}

    ${f.opposition_groups && f.opposition_groups.length ? `<div class="detail-section">
      <h3>Supporting Organizations</h3>
      <div class="groups-container">${groupsHtml}</div>
    </div>` : ''}

    ${oppLinks.length ? `<div class="detail-section"><h3>Advocacy Links</h3><div class="opp-links">${oppLinks.map(l => `<span class="opp-link">${l}</span>`).join('')}</div></div>` : ''}

    <div class="detail-section">
      <h3>Sources</h3>
      ${sources}
    </div>

    <div class="detail-section" style="color:var(--text-muted); font-size:0.8rem;">
      ${f.last_updated ? `Last updated: ${f.last_updated}` : ''}
    </div>
  `;

  panel.classList.add('open');
}

function closePanel() {
  document.getElementById('detail-panel').classList.remove('open');
}

