import {
  requireAuth
} from '../core/guards.js';
import {
  getOrder,
  subscribeToMyOrder,
  cancelMyOrder,
  uploadPaymentProof
} from '../services/orders.js';
import {
  addToCart
} from '../services/cart.js';
import {
  el,
  replaceChildren
} from '../core/dom.js';
import {
  money,
  formatDate,
  notify,
  parseQuery,
  setBusy
} from '../core/utils.js';

const steps = [
  'PENDING',
  'CONFIRMED',
  'PREPARING',
  'READY',
  'OUT_FOR_DELIVERY',
  'COMPLETED'
];

async function render(id) {
  const order = await getOrder(id);
  document.getElementById('order-number').textContent = order.order_number;
  document.getElementById('order-meta').textContent =
    `${formatDate(order.created_at)} · ${order.fulfillment_type}`;
  document.getElementById('order-total').textContent = money(order.total);
  document.getElementById('order-payment').textContent = order.payment_status;
  const payment = (order.payments || [])[0];
  const paymentNote = document.getElementById('order-payment-note');
  const paymentInstructions = document.getElementById('order-payment-instructions');
  const proofForm = document.getElementById('order-proof-form');
  paymentNote.textContent = payment
    ? `${payment.method?.name || 'Payment'} · ${payment.status}${payment.rejection_reason ? ` · ${payment.rejection_reason}` : ''}`
    : 'Payment information is unavailable.';
  const canSubmitProof = payment?.method?.requires_proof &&
    ['PENDING', 'REJECTED'].includes(payment.status);
  paymentInstructions.hidden = !canSubmitProof;
  paymentInstructions.textContent = canSubmitProof
    ? payment.method.instructions || 'Upload your payment proof.'
    : '';
  proofForm.hidden = !canSubmitProof;
  proofForm.onsubmit = async event => {
    event.preventDefault();
    const button = proofForm.querySelector('button[type="submit"]');
    setBusy(button, true, 'Uploading…');
    try {
      const formData = new FormData(proofForm);
      const file = formData.get('proof');
      if (!(file instanceof File) || !file.size) {
        throw new Error('Select a proof image or PDF.');
      }
      await uploadPaymentProof(
        payment.id,
        file,
        String(formData.get('reference') || '')
      );
      notify('Payment proof submitted for verification.', 'success');
      await render(id);
    } catch (error) {
      notify(error.message || 'Unable to submit payment proof.', 'danger');
      setBusy(button, false);
    }
  };

  replaceChildren(
    document.getElementById('order-items'),
    (order.items || []).map(item => {
      const reviewLink = order.status === 'COMPLETED' && item.product?.slug
        ? el('a', {
          href: `/product.html?slug=${encodeURIComponent(item.product.slug)}#review-form`,
          className: 'btn-nbj ghost sm',
          text: 'Write a review'
        })
        : null;

      return el('div', {
        className: 'summary-row'
      }, [
        el('span', {
          text: `${item.quantity}× ${item.product_name}${item.variant_name ? ` (${item.variant_name})` : ''}`
        }),
        el('span', {
          text: money(item.line_total)
        }),
        reviewLink
      ]);
    })
  );

  const activeSteps = order.fulfillment_type === 'PICKUP'
    ? steps.filter(step => step !== 'OUT_FOR_DELIVERY')
    : steps;
  const current = activeSteps.indexOf(order.status);

  replaceChildren(
    document.getElementById('order-timeline'),
    order.status === 'CANCELLED'
      ? [
        el('div', {
          className: 'status-step current'
        }, [
          el('span', {
            className: 'status-dot'
          }),
          el('div', {}, [
            el('strong', {
              text: 'Cancelled'
            }),
            el('p', {
              className: 'muted',
              text: order.cancellation_reason || ''
            })
          ])
        ])
      ]
      : activeSteps.map((step, index) => {
        const history = (order.history || []).find(
          entry => entry.new_status === step
        );

        return el('div', {
          className: `status-step ${index < current ? 'done' : index === current ? 'current' : ''}`
        }, [
          el('span', {
            className: 'status-dot'
          }),
          el('div', {}, [
            el('strong', {
              text: step.replaceAll('_', ' ')
            }),
            el('small', {
              className: 'd-block muted',
              text: history ? formatDate(history.created_at) : ''
            })
          ])
        ]);
      })
  );

  const cancel = document.getElementById('cancel-order');
  cancel.hidden = !['PENDING', 'CONFIRMED'].includes(order.status);
  cancel.onclick = async () => {
    const reason = prompt('Why are you cancelling this order?');
    if (!reason) return;

    try {
      await cancelMyOrder(order.id, reason);
      notify('Order cancelled.', 'success');
      await render(id);
    } catch (error) {
      notify(error.message, 'danger');
    }
  };

  const reorder = document.getElementById('reorder');
  reorder.disabled = order.status === 'CANCELLED' ? false : false;
  reorder.onclick = async () => {
    setBusy(reorder, true, 'Adding…');
    try {
      for (const item of order.items) {
        if (item.product_id) {
          await addToCart({
            product_id: item.product_id,
            variant_id: item.variant_id,
            addon_ids: (item.addons || [])
              .map(addon => addon.addon_id)
              .filter(Boolean),
            quantity: item.quantity,
            instructions: item.instructions || '',
            removed_ingredients: item.removed_ingredients || []
          });
        }
      }

      notify('Available items were added to your cart.', 'success');
      location.href = '/customer/cart.html';
    } catch (error) {
      notify(error.message, 'danger');
      setBusy(reorder, false);
    }
  };

  return order;
}

export async function init() {
  const profile = await requireAuth({
    roles: ['CUSTOMER']
  });
  if (!profile) return;

  const id = parseQuery().id;
  if (!id) throw new Error('Order ID missing.');

  await render(id);
  await subscribeToMyOrder(id, () => render(id));
}
