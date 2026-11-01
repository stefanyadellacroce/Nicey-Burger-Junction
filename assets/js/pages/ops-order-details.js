import {
    requireAuth
} from '../core/guards.js';

import {
    getOrder,
    updateOrderStatus,
    subscribeToMyOrder
} from '../services/orders.js';

import {
    el,
    replaceChildren
} from '../core/dom.js';

import {
    formatDate,
    money,
    notify,
    parseQuery,
    setBusy
} from '../core/utils.js';


const ORDER_STEPS = [
    'PENDING',
    'CONFIRMED',
    'PREPARING',
    'READY',
    'OUT_FOR_DELIVERY',
    'COMPLETED'
];


let orderId = null;


function setText(
    id,
    value
) {
    const node =
        document.getElementById(id);


    if (node) {
        node.textContent =
            value ?? '';
    }
}


function renderDetails(
    targetId,
    rows,
    emptyMessage
) {
    const target =
        document.getElementById(targetId);


    if (!target) {
        return;
    }


    const entries =
        rows.filter(
            ([, value]) =>
                value !== null &&
                value !== undefined &&
                String(value).trim() !== ''
        );


    if (!entries.length) {
        replaceChildren(
            target,
            el(
                'p',
                {
                    className: 'muted',
                    text: emptyMessage
                }
            )
        );

        return;
    }


    replaceChildren(
        target,
        entries.map(
            ([label, value]) =>
                el(
                    'p',
                    {
                        className: 'summary-row'
                    },
                    [
                        el('strong', {
                            text: label
                        }),
                        el('span', {
                            text: String(value)
                        })
                    ]
                )
        )
    );
}


function renderItems(
    order
) {
    const target =
        document.getElementById(
            'detail-items'
        );


    const items =
        order.items || [];


    if (!items.length) {
        replaceChildren(
            target,
            el(
                'p',
                {
                    className: 'muted',
                    text: 'No order items found.'
                }
            )
        );

        return;
    }


    replaceChildren(
        target,
        items.map(
            item => {
                const description = [
                    `${item.quantity}× ${item.product_name || 'Item'}`,
                    item.variant_name
                        ? `Variant: ${item.variant_name}`
                        : '',
                    item.instructions
                        ? `Note: ${item.instructions}`
                        : ''
                ]
                    .filter(Boolean)
                    .join(' · ');


                return el(
                    'div',
                    {
                        className: 'summary-row'
                    },
                    [
                        el('span', {
                            text: description
                        }),
                        el('strong', {
                            text: money(item.line_total || 0)
                        })
                    ]
                );
            }
        )
    );
}


function renderTimeline(
    order
) {
    const target =
        document.getElementById(
            'detail-history'
        );


    if (order.status === 'CANCELLED') {
        replaceChildren(
            target,
            el(
                'div',
                {
                    className: 'status-step current'
                },
                [
                    el('span', {
                        className: 'status-dot'
                    }),
                    el(
                        'div',
                        {},
                        [
                            el('strong', {
                                text: 'Cancelled'
                            }),
                            el('p', {
                                className: 'muted',
                                text:
                                    order.cancellation_reason
                                    || ''
                            })
                        ]
                    )
                ]
            )
        );

        return;
    }


    const steps =
        order.fulfillment_type === 'PICKUP'
            ? ORDER_STEPS.filter(
                status =>
                    status !== 'OUT_FOR_DELIVERY'
            )
            : ORDER_STEPS;


    const currentIndex =
        steps.indexOf(order.status);


    const history =
        order.history || [];


    replaceChildren(
        target,
        steps.map(
            (status, index) => {
                const entry =
                    history.find(
                        item =>
                            item.new_status === status
                    );


                const state =
                    currentIndex >= 0 &&
                    index < currentIndex
                        ? 'done'
                        : index === currentIndex
                            ? 'current'
                            : '';


                return el(
                    'div',
                    {
                        className: `status-step ${state}`
                    },
                    [
                        el('span', {
                            className: 'status-dot'
                        }),
                        el(
                            'div',
                            {},
                            [
                                el('strong', {
                                    text:
                                        status.replaceAll('_', ' ')
                                }),
                                el('small', {
                                    className: 'd-block muted',
                                    text:
                                        entry
                                            ? formatDate(entry.created_at)
                                            : ''
                                })
                            ]
                        )
                    ]
                );
            }
        )
    );
}


function nextStatus(
    order
) {
    const next = {
        PENDING: 'CONFIRMED',
        CONFIRMED: 'PREPARING',
        PREPARING: 'READY',
        READY:
            order.fulfillment_type === 'DELIVERY'
                ? 'OUT_FOR_DELIVERY'
                : 'COMPLETED',
        OUT_FOR_DELIVERY: 'COMPLETED'
    };


    return next[order.status] || null;
}


function configureActions(
    order
) {
    const advanceButton =
        document.getElementById(
            'detail-next-status'
        );


    const cancelButton =
        document.getElementById(
            'detail-cancel'
        );


    const next =
        nextStatus(order);


    advanceButton.hidden =
        !next;


    advanceButton.textContent =
        next
            ? `Advance to ${next.replaceAll('_', ' ')}`
            : 'Advance status';


    advanceButton.onclick =
        async () => {
            if (!next || advanceButton.disabled) {
                return;
            }


            setBusy(
                advanceButton,
                true,
                'Updating…'
            );


            try {
                await updateOrderStatus(
                    order.id,
                    next
                );


                notify(
                    `Order ${order.order_number || ''} updated.`,
                    'success'
                );


                await renderOrder();

            } catch (error) {
                console.error(
                    'Order status update error:',
                    error
                );

                notify(
                    error?.message
                    || 'Unable to update the order status.',
                    'danger'
                );

            } finally {
                setBusy(
                    advanceButton,
                    false
                );
            }
        };


    cancelButton.hidden =
        ![
            'PENDING',
            'CONFIRMED',
            'PREPARING',
            'READY',
            'OUT_FOR_DELIVERY'
        ].includes(order.status);


    cancelButton.onclick =
        async () => {
            if (cancelButton.disabled) {
                return;
            }


            const reason =
                String(
                    window.prompt(
                        'Why are you cancelling this order?'
                    ) || ''
                ).trim();


            if (!reason) {
                return;
            }


            setBusy(
                cancelButton,
                true,
                'Cancelling…'
            );


            try {
                await updateOrderStatus(
                    order.id,
                    'CANCELLED',
                    reason
                );


                notify(
                    'Order cancelled.',
                    'success'
                );


                await renderOrder();

            } catch (error) {
                console.error(
                    'Order cancellation error:',
                    error
                );

                notify(
                    error?.message
                    || 'Unable to cancel the order.',
                    'danger'
                );

            } finally {
                setBusy(
                    cancelButton,
                    false
                );
            }
        };
}


async function renderOrder() {
    const order =
        await getOrder(orderId);


    if (!order) {
        throw new Error(
            'Order not found.'
        );
    }


    setText(
        'detail-order-number',
        order.order_number || '—'
    );


    setText(
        'detail-order-meta',
        [
            formatDate(order.created_at),
            order.fulfillment_type,
            order.status?.replaceAll('_', ' ')
        ]
            .filter(Boolean)
            .join(' · ')
    );


    setText(
        'detail-total',
        money(order.total || 0)
    );


    renderDetails(
        'detail-customer',
        [
            ['Name', order.customer_name],
            ['Phone', order.customer_phone],
            ['Email', order.customer_email]
        ],
        'Customer information is unavailable.'
    );


    const address =
        order.delivery_address || {};


    renderDetails(
        'detail-address',
        order.fulfillment_type === 'DELIVERY'
            ? [
                ['Recipient', address.recipient_name],
                ['Phone', address.phone],
                ['Address', address.address_line1],
                ['Address details', address.address_line2],
                ['Barangay', address.barangay],
                ['City', address.city],
                ['Province', address.province],
                ['Postal code', address.postal_code]
            ]
            : [
                ['Fulfillment', 'Pickup'],
                ['Pickup notes', order.pickup_notes]
            ],
        order.fulfillment_type === 'DELIVERY'
            ? 'Delivery address is unavailable.'
            : 'No pickup notes.'
    );


    const payment =
        (order.payments || [])[0] || {};


    renderDetails(
        'detail-payment',
        [
            ['Status', order.payment_status],
            ['Method', payment.method?.name || payment.method_name],
            ['Reference', payment.reference_number || payment.reference]
        ],
        'Payment information is unavailable.'
    );


    renderItems(order);
    renderTimeline(order);
    configureActions(order);
}


export async function init({
    kind = 'operations'
} = {}) {
    const roles =
        kind === 'admin'
            ? ['ADMIN']
            : ['STAFF', 'MANAGER', 'ADMIN'];


    const profile =
        await requireAuth({
            roles
        });


    if (!profile) {
        return;
    }


    orderId =
        parseQuery().id;


    if (!orderId) {
        throw new Error(
            'Order ID missing.'
        );
    }

    document.getElementById(
        'print-receipt'
    )?.addEventListener(
        'click',
        () => window.print()
    );

    await renderOrder();


    await subscribeToMyOrder(
        orderId,
        () => {
            renderOrder().catch(error => {
                console.error(
                    'Order details refresh error:',
                    error
                );

                notify(
                    error?.message
                    || 'Order details could not be refreshed.',
                    'danger'
                );
            });
        }
    );
}
