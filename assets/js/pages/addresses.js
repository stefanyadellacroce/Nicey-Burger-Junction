import { requireAuth } from '../core/guards.js';
import { requireSupabase } from '../core/supabase.js';
import { listAddresses, saveAddress, deleteAddress } from '../services/profile.js';
import { el, replaceChildren } from '../core/dom.js';
import { money, notify, setBusy } from '../core/utils.js';

let addresses = [];
let editingId = null;

function byId(id) {
  return document.getElementById(id);
}

function field(form, name) {
  return form.elements.namedItem(name);
}

function render() {
  const list = byId('address-list');

  if (!addresses.length) {
    replaceChildren(list, el('div', {
      className: 'empty-state panel',
      text: 'No saved addresses yet. Add one to make delivery checkout faster.'
    }));
    return;
  }

  replaceChildren(list, addresses.map(address => {
    const location = [
      address.address_line1,
      address.address_line2,
      address.barangay,
      address.city,
      address.province,
      address.postal_code
    ].filter(Boolean).join(', ');

    const actions = el('div', { className: 'cluster address-card-actions' }, [
      el('button', {
        type: 'button',
        className: 'btn-nbj ghost sm',
        text: 'Edit',
        onclick: () => openAddress(address)
      }),
      !address.is_default && el('button', {
        type: 'button',
        className: 'btn-nbj ghost sm',
        text: 'Make default',
        onclick: async event => {
          const button = event.currentTarget;
          button.disabled = true;
          try {
            await saveAddress({ ...address, is_default: true });
            await refresh();
            notify('Default address updated.', 'success');
          } catch (error) {
            notify(error?.message || 'Could not update your default address.', 'danger');
          } finally {
            button.disabled = false;
          }
        }
      }),
      el('button', {
        type: 'button',
        className: 'btn btn-outline-danger btn-sm',
        text: 'Delete',
        onclick: async event => {
          if (!window.confirm('Delete this saved address?')) return;
          const button = event.currentTarget;
          button.disabled = true;
          try {
            await deleteAddress(address.id);
            await refresh();
            notify('Address deleted.', 'success');
          } catch (error) {
            notify(error?.message || 'Could not delete this address.', 'danger');
            button.disabled = false;
          }
        }
      })
    ]);

    return el('article', {
      className: `panel address-card${address.is_default ? ' is-default' : ''}`,
      'data-default': String(Boolean(address.is_default))
    }, [
      el('div', { className: 'd-flex justify-content-between gap-2' }, [
        el('strong', { text: address.label || 'Address' }),
        address.is_default && el('span', { className: 'status-pill confirmed', text: 'Default' })
      ]),
      el('p', { className: 'mb-1', text: `${address.recipient_name} · ${address.phone}` }),
      el('p', { className: 'muted mb-3', text: location }),
      actions
    ]);
  }));
}

async function refresh() {
  addresses = await listAddresses();
  render();
}

function openAddress(address = null) {
  const form = byId('address-form');
  form.reset();
  editingId = address?.id || null;
  byId('address-dialog-title').textContent = address ? 'Edit address' : 'Add address';

  if (address) {
    for (const name of [
      'label', 'recipient_name', 'phone', 'address_line1', 'address_line2',
      'barangay', 'city', 'province', 'postal_code', 'delivery_zone_id'
    ]) {
      field(form, name).value = address[name] || '';
    }
    field(form, 'is_default').checked = Boolean(address.is_default);
  } else {
    field(form, 'is_default').checked = addresses.length === 0;
  }

  byId('address-dialog').showModal();
  field(form, 'label').focus();
}

async function saveForm(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const button = form.querySelector('button[type="submit"]');
  const values = Object.fromEntries(new FormData(form).entries());
  values.is_default = field(form, 'is_default').checked;
  if (editingId) values.id = editingId;

  setBusy(button, true, 'Saving…');
  try {
    await saveAddress(values);
    byId('address-dialog').close();
    await refresh();
    notify('Address saved.', 'success');
  } catch (error) {
    console.error('Address save error:', error);
    notify(error?.message || 'Could not save this address.', 'danger');
  } finally {
    setBusy(button, false);
  }
}

export async function init() {
  const profile = await requireAuth({ roles: ['CUSTOMER'] });
  if (!profile) return;

  byId('add-address').addEventListener('click', () => openAddress());
  byId('address-form').addEventListener('submit', saveForm);

  const supabase = await requireSupabase();
  const { data: zones, error } = await supabase
    .from('delivery_zones')
    .select('id,name,delivery_fee')
    .eq('active', true)
    .order('name');
  if (error) throw error;

  replaceChildren(byId('address-zone'), [
    el('option', { value: '', text: 'Choose at checkout' }),
    ...(zones || []).map(zone => el('option', {
      value: zone.id,
      text: `${zone.name} · ${money(zone.delivery_fee)}`
    }))
  ]);

  await refresh();
}
