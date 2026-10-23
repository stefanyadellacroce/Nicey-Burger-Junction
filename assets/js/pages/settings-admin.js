import { requireSupabase } from '../core/supabase.js';
import { notify, setBusy } from '../core/utils.js';

const BOOLEAN_KEYS = new Set([
  'ordering_enabled', 'pickup_enabled', 'delivery_enabled',
  'temporary_store_closure', 'customer_cancellation_enabled',
  'ordering_setup_confirmed'
]);
const NUMBER_KEYS = new Set([
  'minimum_delivery_order', 'estimated_preparation_minutes',
  'estimated_delivery_minutes', 'service_fee', 'tax_rate_percent'
]);
const PRIVATE_KEYS = new Set(['inventory_deduction_stage', 'timezone', 'ordering_setup_confirmed']);
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function unwrap(value) {
  return value && typeof value === 'object' && 'value' in value ? value.value : value;
}

function enabled(value) {
  const item = unwrap(value);
  return item === true || item === 1 || ['true', '1', 'yes', 'on'].includes(String(item).toLowerCase());
}

function labelledInput(label, type, value = '') {
  const wrapper = document.createElement('label');
  const caption = document.createElement('span');
  caption.textContent = label;
  const input = document.createElement('input');
  input.type = type;
  input.className = type === 'checkbox' ? 'form-check-input' : 'form-control';
  if (type !== 'checkbox') input.value = value;
  wrapper.append(caption, input);
  return { wrapper, input };
}

function renderHours(value) {
  const schedule = unwrap(value) || {};
  const container = document.getElementById('business-hours-editor');
  container.replaceChildren();
  DAYS.forEach((name, index) => {
    const day = schedule[String(index)] || {};
    const row = document.createElement('div');
    row.className = 'business-hours-row';
    row.dataset.day = String(index);
    const title = document.createElement('strong');
    title.textContent = name;
    const opening = labelledInput('Open', 'time', day.open || '');
    const closing = labelledInput('Close', 'time', day.close || '');
    const closed = labelledInput('Closed', 'checkbox');
    closed.wrapper.classList.add('hours-closed');
    closed.input.checked = day.closed !== false;
    opening.input.classList.add('hours-open');
    closing.input.classList.add('hours-close');
    closed.input.classList.add('hours-closed-input');
    const toggle = () => {
      opening.input.disabled = closed.input.checked;
      closing.input.disabled = closed.input.checked;
    };
    closed.input.addEventListener('change', toggle);
    toggle();
    row.append(title, opening.wrapper, closing.wrapper, closed.wrapper);
    container.append(row);
  });
}

function collectHours() {
  const schedule = {};
  let openDays = 0;
  for (const row of document.querySelectorAll('.business-hours-row')) {
    const day = row.dataset.day;
    const closed = row.querySelector('.hours-closed-input').checked;
    if (closed) {
      schedule[day] = { closed: true };
      continue;
    }
    const open = row.querySelector('.hours-open').value;
    const close = row.querySelector('.hours-close').value;
    if (!open || !close || open >= close) {
      throw new Error(`${DAYS[Number(day)]} needs valid opening and closing times.`);
    }
    schedule[day] = { open, close, closed: false };
    openDays += 1;
  }
  return { schedule, openDays };
}

function formRows(form) {
  const rows = [];
  for (const control of form.elements) {
    if (!control.name || control.disabled) continue;
    let value = BOOLEAN_KEYS.has(control.name) ? control.checked : control.value.trim();
    if (NUMBER_KEYS.has(control.name)) {
      value = Number(value);
      if (!Number.isFinite(value) || value < 0) {
        throw new Error(`Enter a valid value for ${control.name.replaceAll('_', ' ')}.`);
      }
    }
    rows.push({ key: control.name, value, public_read: !PRIVATE_KEYS.has(control.name) });
  }
  return rows;
}

export async function init() {
  const form = document.getElementById('settings-form');
  if (!form) throw new Error('Settings form was not found.');
  const supabase = await requireSupabase();
  const { data, error } = await supabase.from('settings').select('key,value');
  if (error) throw error;

  for (const row of data || []) {
    if (row.key === 'business_hours') continue;
    const control = form.elements.namedItem(row.key);
    if (!control) continue;
    const value = unwrap(row.value);
    if (BOOLEAN_KEYS.has(row.key)) control.checked = enabled(value);
    else control.value = value ?? '';
  }
  renderHours((data || []).find(row => row.key === 'business_hours')?.value);

  const confirmation = form.elements.namedItem('ordering_setup_confirmed');
  for (const name of ['business_phone', 'business_address', 'timezone']) {
    form.elements.namedItem(name).addEventListener('input', () => { confirmation.checked = false; });
  }
  document.getElementById('business-hours-editor').addEventListener('input', () => {
    confirmation.checked = false;
  });
  document.getElementById('business-hours-editor').addEventListener('change', () => {
    confirmation.checked = false;
  });

  form.addEventListener('submit', async event => {
    event.preventDefault();
    const button = form.querySelector('button[type="submit"]');
    if (button.disabled || !form.reportValidity()) return;
    setBusy(button, true, 'Saving…');
    try {
      const timezone = form.elements.namedItem('timezone').value.trim();
      try { new Intl.DateTimeFormat('en', { timeZone: timezone }); }
      catch { throw new Error('Enter a valid IANA timezone, such as Asia/Manila.'); }
      const { schedule, openDays } = collectHours();
      if (form.elements.namedItem('ordering_enabled').checked) {
        if (!confirmation.checked) {
          throw new Error('Confirm the real contact details and ordering hours before enabling orders.');
        }
        if (!form.elements.namedItem('business_phone').value.trim() ||
            !form.elements.namedItem('business_address').value.trim()) {
          throw new Error('Enter the real business phone and address before enabling orders.');
        }
        if (!openDays) throw new Error('Set at least one open day before enabling ordering.');
        if (!form.elements.namedItem('pickup_enabled').checked &&
            !form.elements.namedItem('delivery_enabled').checked) {
          throw new Error('Enable pickup or delivery before enabling ordering.');
        }
      }
      if (form.elements.namedItem('delivery_enabled').checked) {
        const { count, error: zoneError } = await supabase.from('delivery_zones')
          .select('id', { count: 'exact', head: true }).eq('active', true);
        if (zoneError) throw zoneError;
        if (!count) throw new Error('Add an active delivery zone before enabling delivery.');
      }
      const rows = formRows(form);
      rows.push({ key: 'business_hours', value: schedule, public_read: true });
      const { error: saveError } = await supabase.from('settings').upsert(rows, { onConflict: 'key' });
      if (saveError) throw saveError;
      notify('Website settings saved.', 'success');
    } catch (saveError) {
      console.error('Save settings error:', saveError);
      notify(saveError.message || 'Unable to save website settings.', 'danger');
    } finally {
      setBusy(button, false);
    }
  });
}
