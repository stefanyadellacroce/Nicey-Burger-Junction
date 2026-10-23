import { requireSupabase } from '../core/supabase.js';
import { el, replaceChildren } from '../core/dom.js';
import { formatDate, notify, setBusy } from '../core/utils.js';

const STATUSES = new Set(['NEW', 'READ', 'RESOLVED', 'SPAM']);
const PAGE_SIZE = 500;

let rows = [];
let selectedId = null;
let profile = null;
let supabase = null;

function byId(id) {
  return document.getElementById(id);
}

function filteredRows() {
  const term = byId('inquiries-search').value.trim().toLowerCase();
  const status = byId('inquiries-status-filter').value;

  return rows.filter(row => {
    if (status !== 'ALL' && row.status !== status) return false;
    if (!term) return true;

    return [row.name, row.email, row.phone, row.subject, row.message]
      .some(value => String(value || '').toLowerCase().includes(term));
  });
}

function render() {
  const tbody = byId('inquiries-tbody');
  const filtered = filteredRows();
  const newCount = rows.filter(row => row.status === 'NEW').length;
  byId('inquiries-new-count').textContent = `${newCount} new`;

  if (!filtered.length) {
    replaceChildren(tbody, el('tr', {}, el('td', {
      colspan: '5',
      className: 'text-center muted py-4',
      text: rows.length ? 'No inquiries match these filters.' : 'No inquiries received yet.'
    })));
    return;
  }

  replaceChildren(tbody, filtered.map(row => el('tr', {}, [
    el('td', { text: formatDate(row.created_at) }),
    el('td', {}, [
      el('strong', { text: row.name }),
      el('small', { className: 'inquiry-secondary', text: row.email })
    ]),
    el('td', { text: row.subject }),
    el('td', {}, el('span', {
      className: `inquiry-status inquiry-status-${row.status.toLowerCase()}`,
      text: row.status
    })),
    el('td', {}, el('button', {
      type: 'button',
      className: 'btn btn-sm btn-outline-primary',
      text: 'View',
      onclick: () => openInquiry(row.id)
    }))
  ])));
}

async function loadInquiries() {
  const result = [];

  for (let start = 0; ; start += PAGE_SIZE) {
    const { data, error } = await supabase
      .from('contact_messages')
      .select('id,name,email,phone,subject,message,status,created_at,resolved_at,resolved_by')
      .order('created_at', { ascending: false })
      .range(start, start + PAGE_SIZE - 1);

    if (error) throw error;
    result.push(...(data || []));
    if (!data || data.length < PAGE_SIZE) break;
  }

  rows = result;
  byId('page-error').hidden = true;
  render();
}

function openInquiry(id) {
  const row = rows.find(item => item.id === id);
  if (!row) return;

  selectedId = id;
  byId('inquiry-dialog-title').textContent = row.subject;
  byId('inquiry-meta').textContent = `${row.name} · ${formatDate(row.created_at)}`;
  byId('inquiry-contact').textContent = row.phone
    ? `${row.email} · ${row.phone}`
    : row.email;
  byId('inquiry-message').textContent = row.message;
  byId('inquiry-status').value = row.status;
  byId('inquiry-reply').href = `mailto:${encodeURIComponent(row.email)}?subject=${encodeURIComponent(`Re: ${row.subject}`)}`;
  byId('inquiry-dialog').showModal();
}

async function saveStatus() {
  const row = rows.find(item => item.id === selectedId);
  const status = byId('inquiry-status').value;
  if (!row || !STATUSES.has(status)) return;

  if (status === row.status) {
    byId('inquiry-dialog').close();
    return;
  }

  const button = byId('inquiry-save');
  setBusy(button, true, 'Saving…');

  try {
    const update = { status };
    if (status === 'RESOLVED') {
      update.resolved_at = new Date().toISOString();
      update.resolved_by = profile.id;
    } else {
      update.resolved_at = null;
      update.resolved_by = null;
    }

    const { data, error } = await supabase
      .from('contact_messages')
      .update(update)
      .eq('id', row.id)
      .select('id,name,email,phone,subject,message,status,created_at,resolved_at,resolved_by')
      .single();

    if (error) throw error;
    rows = rows.map(item => item.id === data.id ? data : item);
    render();
    byId('inquiry-dialog').close();
    notify('Inquiry status updated.', 'success');
  } catch (error) {
    console.error('Inquiry update error:', error);
    notify(error?.message || 'Could not update the inquiry.', 'danger');
  } finally {
    setBusy(button, false);
  }
}

export async function init(context) {
  profile = context.profile;
  supabase = await requireSupabase();

  byId('inquiries-search').addEventListener('input', render);
  byId('inquiries-status-filter').addEventListener('change', render);
  byId('inquiry-close').addEventListener('click', () => byId('inquiry-dialog').close());
  byId('inquiry-save').addEventListener('click', saveStatus);
  byId('inquiries-refresh').addEventListener('click', async () => {
    try {
      await loadInquiries();
      notify('Inquiries refreshed.', 'success');
    } catch (error) {
      console.error('Inquiry refresh error:', error);
      notify(error?.message || 'Could not refresh inquiries.', 'danger');
    }
  });

  await loadInquiries();
}
