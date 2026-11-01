import {
  requireAuth
} from '../core/guards.js';
import {
  getOrder,
  uploadPaymentProof
} from '../services/orders.js';
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

function showMissingOrderMessage() {
  const main = document.getElementById('main-content');

  replaceChildren(
    main,
    el('section', {
      className: 'section'
    }, el('div', {
      className: 'container-nbj narrow'
    }, el('div', {
      className: 'panel text-center'
    }, [
      el('h1', {
        text: 'We couldn’t find that order'
      }),
      el('p', {
        className: 'muted',
        text: 'Your order details are available in My Orders. Open your order from there to view its status and receipt.'
      }),
      el('a', {
        href: '/customer/orders.html',
        className: 'btn-nbj',
        text: 'Go to My Orders'
      })
    ])))
  );
}

export async function init() {
  const profile = await requireAuth({
    roles: ['CUSTOMER']
  });
  if (!profile) return;

  const id = parseQuery().id;
  if (!id) {
    showMissingOrderMessage();
    return;
  }

  const order = await getOrder(id);
  document.getElementById('confirmation-number').textContent =
    order.order_number;
  document.getElementById('confirmation-status').textContent =
    order.status.replaceAll('_', ' ');
  document.getElementById('confirmation-total').textContent =
    money(order.total);
  document.getElementById('confirmation-estimate').textContent =
    order.estimated_ready_at
      ? formatDate(order.estimated_ready_at)
      : 'The restaurant will update your order shortly.';
  document.getElementById('track-order-link').href =
    `/customer/order-details.html?id=${encodeURIComponent(order.id)}`;

  replaceChildren(
    document.getElementById('confirmation-items'),
    (order.items || []).map(item => el('div', {
      className: 'summary-row'
    }, [
      el('span', {
        text: `${item.quantity}× ${item.product_name}${item.variant_name ? ` · ${item.variant_name}` : ''}`
      }),
      el('span', {
        text: money(item.line_total)
      })
    ]))
  );

  const payment = (order.payments || [])[0];
  if (
    payment?.method?.requires_proof &&
    ['PENDING', 'REJECTED'].includes(payment.status)
  ) {
    const form = document.getElementById('proof-form');
    form.hidden = false;
    document.getElementById('payment-instructions').textContent =
      payment.method.instructions || 'Upload your payment proof.';
    form.addEventListener('submit', async event => {
      event.preventDefault();
      const button = form.querySelector('button[type=submit]');
      setBusy(button, true, 'Uploading…');

      try {
        const formData = new FormData(form);
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
        form.hidden = true;
      } catch (error) {
        notify(error.message, 'danger');
      } finally {
        setBusy(button, false);
      }
    });
  } else if (payment) {
    document.getElementById('payment-note').textContent =
      `Payment: ${payment.method?.name || 'Payment'} · ${payment.status}`;
  }
}
