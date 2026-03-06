/**
 * Shared utilities for US Datacenter Fights
 */

const STATUS_TOOLTIPS = {
  active: 'A restriction or opposition measure is currently in effect',
  approved: 'The datacenter project was approved despite opposition',
  cancelled: 'The project was cancelled or the developer withdrew',
  delayed: 'The project or decision has been delayed',
  expired: 'The moratorium or restriction has expired',
  mixed: 'Mixed outcome — partial wins and losses',
  ongoing: 'The fight is still in progress with no resolution yet',
  pending: 'A decision is pending — awaiting vote or ruling',
};

function capitalize(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, ' ') : '';
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
}

function getStatusTooltip(status) {
  if (!status) return '';
  const key = status.split(/[\s\-–]/)[0].toLowerCase();
  return STATUS_TOOLTIPS[key] || status;
}
