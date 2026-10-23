import { requireSupabase } from '../core/supabase.js';
import { el, replaceChildren } from '../core/dom.js';
import { money, notify, setBusy } from '../core/utils.js';

let supabase;
let methods = [];
let zones = [];

function cell(value) {
  return el('td', { text: String(value ?? '—') });
}

function editButton(label, onClick) {
  return el('button', {
    type: 'button',
    className: 'btn-nbj ghost sm',
    text: label,
    onclick: onClick
  });
}

function renderMethods() {
  const body = document.getElementById('payment-methods-body');
  replaceChildren(body, methods.map(method => el('tr', {}, [
    cell(method.name),
    cell(method.code),
    cell(method.instructions || '—'),
    cell(method.active ? 'Active' : 'Inactive'),
    el('td', {}, editButton('Edit', () => openPayment(method)))
  ])));
}

function renderZones() {
  const body = document.getElementById('delivery-zones-body');
  replaceChildren(body, zones.map(zone => el('tr', {}, [
    cell(zone.name),
    cell((zone.areas || []).join(', ')),
    cell(money(zone.delivery_fee)),
    cell(money(zone.minimum_order)),
    cell(`${zone.estimated_minutes} min`),
    cell(zone.active ? 'Active' : 'Inactive'),
    el('td', {}, editButton('Edit', () => openZone(zone)))
  ])));
}

async function load() {
  const [methodResult, zoneResult] = await Promise.all([
    supabase.from('payment_methods').select('*').order('sort_order'),
    supabase.from('delivery_zones').select('*').order('name')
  ]);
  if (methodResult.error) throw methodResult.error;
  if (zoneResult.error) throw zoneResult.error;
  methods = methodResult.data || [];
  zones = zoneResult.data || [];
  renderMethods();
  renderZones();
}

function openPayment(method) {
  const dialog = document.getElementById('payment-dialog');
  const form = document.getElementById('payment-form');
  form.reset();
  form.dataset.id = method.id;
  document.getElementById('payment-dialog-title').textContent = `Edit ${method.name}`;
  form.elements.namedItem('name').value = method.name;
  form.elements.namedItem('instructions').value = method.instructions || '';
  form.elements.namedItem('sort_order').value = method.sort_order;
  form.elements.namedItem('requires_proof').checked =
    ['MANUAL_DIGITAL', 'BANK_TRANSFER'].includes(method.method_type);
  form.elements.namedItem('requires_proof').disabled = true;
  form.elements.namedItem('active').checked = method.active;
  dialog.showModal();
}

function openZone(zone = null) {
  const dialog = document.getElementById('zone-dialog');
  const form = document.getElementById('zone-form');
  form.reset();
  form.dataset.id = zone?.id || '';
  document.getElementById('zone-dialog-title').textContent = zone ? `Edit ${zone.name}` : 'Add delivery zone';
  form.elements.namedItem('name').value = zone?.name || '';
  form.elements.namedItem('areas').value = (zone?.areas || []).join('\n');
  form.elements.namedItem('delivery_fee').value = zone?.delivery_fee ?? 0;
  form.elements.namedItem('minimum_order').value = zone?.minimum_order ?? 0;
  form.elements.namedItem('estimated_minutes').value = zone?.estimated_minutes ?? 45;
  form.elements.namedItem('active').checked = zone?.active || false;
  dialog.showModal();
}

async function savePayment(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const button = form.querySelector('button[type="submit"]');
  if (button.disabled || !form.reportValidity()) return;
  const method = methods.find(row => row.id === form.dataset.id);
  if (!method) return;
  const instructions = form.elements.namedItem('instructions').value.trim();
  const active = form.elements.namedItem('active').checked;
  const manualPayment = ['MANUAL_DIGITAL', 'BANK_TRANSFER'].includes(method.method_type);
  if (active && manualPayment &&
      (instructions.length < 15 || /configured by the restaurant|configured business account/i.test(instructions))) {
    notify('Enter the actual recipient or bank details before enabling this method.', 'danger');
    return;
  }
  const payload = {
    name: form.elements.namedItem('name').value.trim(),
    instructions,
    sort_order: Number(form.elements.namedItem('sort_order').value),
    requires_proof: manualPayment,
    active
  };
  setBusy(button, true, 'Saving…');
  try {
    const { error } = await supabase.from('payment_methods').update(payload).eq('id', method.id).select('id').single();
    if (error) throw error;
    document.getElementById('payment-dialog').close();
    await load();
    notify('Payment method saved.', 'success');
  } catch (error) {
    notify(error.message || 'Unable to save payment method.', 'danger');
  } finally {
    setBusy(button, false);
  }
}

async function saveZone(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const button = form.querySelector('button[type="submit"]');
  if (button.disabled || !form.reportValidity()) return;
  const areas = form.elements.namedItem('areas').value
    .split(/\r?\n/).map(value => value.trim()).filter(Boolean);
  if (!areas.length) {
    notify('Enter at least one covered area.', 'danger');
    return;
  }
  if (form.elements.namedItem('active').checked &&
      areas.some(area => /^(central district|nearby barangays|outer service area)$/i.test(area))) {
    notify('Replace the example areas with real delivery coverage before enabling this zone.', 'danger');
    return;
  }
  const payload = {
    name: form.elements.namedItem('name').value.trim(),
    areas,
    delivery_fee: Number(form.elements.namedItem('delivery_fee').value),
    minimum_order: Number(form.elements.namedItem('minimum_order').value),
    estimated_minutes: Number(form.elements.namedItem('estimated_minutes').value),
    active: form.elements.namedItem('active').checked
  };
  setBusy(button, true, 'Saving…');
  try {
    let query = supabase.from('delivery_zones');
    query = form.dataset.id
      ? query.update(payload).eq('id', form.dataset.id)
      : query.insert(payload);
    const { error } = await query.select('id').single();
    if (error) throw error;
    document.getElementById('zone-dialog').close();
    await load();
    notify('Delivery zone saved.', 'success');
  } catch (error) {
    notify(error.message || 'Unable to save delivery zone.', 'danger');
  } finally {
    setBusy(button, false);
  }
}

export async function init() {
  supabase = await requireSupabase();
  document.getElementById('add-zone').addEventListener('click', () => openZone());
  document.getElementById('payment-form').addEventListener('submit', savePayment);
  document.getElementById('zone-form').addEventListener('submit', saveZone);
  await load();
}
