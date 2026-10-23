import { requireAuth } from '../core/guards.js';
import { mergeLocalCartToServer, getCart } from '../services/cart.js';
import { listAddresses } from '../services/profile.js';
import { createOrder } from '../services/orders.js';
import { getPublicSettings, getStoreStatus } from '../services/settings.js';
import { requireSupabase } from '../core/supabase.js';
import { el, replaceChildren } from '../core/dom.js';
import { money, setBusy, setFormStatus, uid } from '../core/utils.js';

const addressFields = [
  'address_line1', 'address_line2', 'barangay',
  'city', 'province', 'postal_code'
];

function selectedFulfillment() {
  return document.querySelector('input[name="fulfillment_type"]:checked')?.value || 'PICKUP';
}

function unitPrice(item) {
  return Number(item.product.base_price || 0)
    + Number(item.variant?.price_delta || 0)
    + (item.addons || []).reduce((sum, entry) => sum + Number(entry.addon?.price || 0), 0);
}

function fillAddress(address, zoneSelect) {
  for (const field of addressFields) {
    document.getElementById(field).value = address?.[field] || '';
  }
  zoneSelect.value = address?.delivery_zone_id || '';
}

function renderEstimate(cart, zones, settings) {
  const subtotal = cart.reduce((sum, item) => sum + unitPrice(item) * Number(item.quantity), 0);
  const deliverySelected = selectedFulfillment() === 'DELIVERY';
  const zone = zones.find(item => item.id === document.getElementById('delivery_zone').value);
  const delivery = deliverySelected ? Number(zone?.delivery_fee || 0) : 0;
  const service = Number(settings.service_fee || 0);
  const tax = Math.round(subtotal * Number(settings.tax_rate_percent || 0)) / 100;

  document.getElementById('checkout-subtotal').textContent = money(subtotal);
  document.getElementById('checkout-delivery').textContent =
    deliverySelected && !zone ? 'Select zone' : money(delivery);
  document.getElementById('checkout-service').textContent = money(service);
  document.getElementById('checkout-tax').textContent = money(tax);
  document.getElementById('checkout-total').textContent =
    deliverySelected && !zone ? 'Select zone' : money(subtotal + delivery + service + tax);
}

function updatePaymentOptions(methods, cart, zones, settings) {
  const fulfillment = selectedFulfillment();
  const select = document.getElementById('payment_method');
  const previous = select.value;
  replaceChildren(select, [el('option', { value: '', text: 'Select payment method' })]);
  for (const method of methods) {
    if (method.active === false) continue;
    if (method.code === 'CASH_PICKUP' && fulfillment !== 'PICKUP') continue;
    if (method.code === 'CASH_DELIVERY' && fulfillment !== 'DELIVERY') continue;
    select.append(el('option', { value: method.code, text: method.name }));
  }
  if ([...select.options].some(option => option.value === previous)) select.value = previous;
  document.getElementById('delivery-fields').hidden = fulfillment !== 'DELIVERY';
  renderEstimate(cart, zones, settings);
}

function orderPayload(form, profile, cart, zones, settings) {
  const values = new FormData(form);
  const fulfillment = String(values.get('fulfillment_type') || '');
  const payment = String(values.get('payment_method') || '');
  const name = String(values.get('customer_name') || '').trim();
  const phone = String(values.get('customer_phone') || '').trim();
  if (!name || !phone) throw new Error('Enter your name and phone number.');
  if (!payment) throw new Error('Select a payment method.');

  let deliveryZoneId = null;
  let deliveryAddress = null;
  if (fulfillment === 'DELIVERY') {
    deliveryZoneId = String(values.get('delivery_zone_id') || '');
    const zone = zones.find(item => item.id === deliveryZoneId);
    if (!zone) throw new Error('Select a delivery zone.');
    const subtotal = cart.reduce((sum, item) => sum + unitPrice(item) * Number(item.quantity), 0);
    const minimum = Math.max(Number(zone.minimum_order || 0), Number(settings.minimum_delivery_order || 0));
    if (subtotal < minimum) throw new Error(`This delivery zone requires a minimum order of ${money(minimum)}.`);
    deliveryAddress = Object.fromEntries(addressFields.map(field => [field, String(values.get(field) || '').trim()]));
    if (!deliveryAddress.address_line1 || !deliveryAddress.city) {
      throw new Error('Complete the delivery address and city.');
    }
  }

  return {
    source: 'WEB',
    customer_name: name,
    customer_email: profile.user.email,
    customer_phone: phone,
    fulfillment_type: fulfillment,
    delivery_zone_id: deliveryZoneId,
    delivery_address: deliveryAddress,
    pickup_notes: String(values.get('pickup_notes') || '').trim(),
    payment_method: payment,
    promotion_code: String(values.get('promotion_code') || '').trim().toUpperCase() || null,
    items: cart.map(item => ({
      product_id: item.product_id,
      variant_id: item.variant_id || null,
      addon_ids: item.addon_ids || [],
      removed_ingredients: item.removed_ingredients || [],
      quantity: item.quantity,
      instructions: item.instructions || ''
    }))
  };
}

export async function init() {
  const form = document.getElementById('checkout-form');
  const submit = form.querySelector('button[type="submit"]');
  const statusNode = document.getElementById('checkout-status');
  submit.disabled = true;

  const profile = await requireAuth({ roles: ['CUSTOMER'] });
  if (!profile) return;
  await mergeLocalCartToServer();
  const supabase = await requireSupabase();
  const [cart, addresses, settings, storeStatus, zonesResult, methodsResult] = await Promise.all([
    getCart(),
    listAddresses(),
    getPublicSettings(),
    getStoreStatus(),
    supabase.from('delivery_zones').select('*').eq('active', true).order('delivery_fee'),
    supabase.from('payment_methods').select('*').eq('active', true).order('sort_order')
  ]);
  if (zonesResult.error) throw zonesResult.error;
  if (methodsResult.error) throw methodsResult.error;
  if (!cart.length) {
    location.replace('/customer/cart.html');
    return;
  }
  if (cart.some(item => !item.product)) {
    throw new Error('A cart item is unavailable. Review your cart before checkout.');
  }

  const zones = zonesResult.data || [];
  const methods = methodsResult.data || [];
  document.getElementById('customer_name').value = profile.full_name || '';
  document.getElementById('customer_email').value = profile.user.email || '';
  document.getElementById('customer_phone').value = profile.phone || '';

  const addressSelect = document.getElementById('saved_address');
  const zoneSelect = document.getElementById('delivery_zone');
  replaceChildren(addressSelect, [el('option', { value: '', text: 'Enter a new address' })]);
  for (const address of addresses) {
    addressSelect.append(el('option', {
      value: address.id,
      text: `${address.label}: ${address.address_line1}, ${address.city}`,
      selected: address.is_default
    }));
  }
  replaceChildren(zoneSelect, [el('option', { value: '', text: 'Select delivery zone' })]);
  for (const zone of zones) {
    zoneSelect.append(el('option', {
      value: zone.id,
      text: `${zone.name} — ${money(zone.delivery_fee)} · ~${zone.estimated_minutes} min`
    }));
  }
  fillAddress(addresses.find(address => address.id === addressSelect.value), zoneSelect);
  addressSelect.addEventListener('change', () => {
    fillAddress(addresses.find(address => address.id === addressSelect.value), zoneSelect);
    renderEstimate(cart, zones, settings);
  });
  zoneSelect.addEventListener('change', () => renderEstimate(cart, zones, settings));

  replaceChildren(document.getElementById('checkout-items'), cart.map(item =>
    el('div', { className: 'summary-row' }, [
      el('span', { text: `${item.quantity}× ${item.product.name}${item.variant ? ` (${item.variant.name})` : ''}` }),
      el('strong', { text: money(unitPrice(item) * Number(item.quantity)) })
    ])
  ));
  const promoCode = localStorage.getItem('nbj_promo_code');
  if (promoCode) document.getElementById('promotion_code').value = promoCode;

  const fulfillmentInputs = [...form.querySelectorAll('input[name="fulfillment_type"]')];
  fulfillmentInputs.forEach(input => {
    input.disabled = settings[`${input.value.toLowerCase()}_enabled`] === false ||
      (input.value === 'DELIVERY' && zones.length === 0);
  });
  if (!fulfillmentInputs.some(input => input.checked && !input.disabled)) {
    const available = fulfillmentInputs.find(input => !input.disabled);
    if (available) available.checked = true;
  }
  const refreshAvailability = () => {
    updatePaymentOptions(methods, cart, zones, settings);
    const selected = fulfillmentInputs.find(input => input.checked && !input.disabled);
    const canOrder = storeStatus.open && Boolean(selected) &&
      document.getElementById('payment_method').options.length > 1;
    submit.disabled = !canOrder;
    setFormStatus(statusNode, canOrder ? '' :
      (storeStatus.open ? 'No payment method is available for this fulfillment option.' :
        storeStatus.reason || 'Ordering is currently unavailable.'),
    canOrder ? undefined : 'warning');
  };
  fulfillmentInputs.forEach(input => input.addEventListener('change', refreshAvailability));
  refreshAvailability();

  // Reuse the key on retry: a timeout may occur after the order was saved.
  let pendingKey = null;
  form.addEventListener('input', () => { pendingKey = null; });
  form.addEventListener('change', () => { pendingKey = null; });
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (submit.disabled) return;
    setFormStatus(statusNode);
    let payload;
    try {
      payload = orderPayload(form, profile, cart, zones, settings);
    } catch (error) {
      setFormStatus(statusNode, error.message, 'error');
      return;
    }
    pendingKey ||= uid();
    setBusy(submit, true, 'Placing order…');
    try {
      const result = await createOrder(payload, pendingKey);
      localStorage.removeItem('nbj_promo_code');
      location.href = `/customer/order-confirmation.html?id=${encodeURIComponent(result.order_id)}`;
    } catch (error) {
      setFormStatus(statusNode, error?.message || 'Unable to place the order. Please try again.', 'error');
      setBusy(submit, false);
    }
  });
}
