import {
    requireAuth
} from '../core/guards.js';

import {
    getOrder,
    subscribeToMyOrder,
    cancelMyOrder
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


const ORDER_STEPS = [
    'PENDING',
    'CONFIRMED',
    'PREPARING',
    'READY',
    'OUT_FOR_DELIVERY',
    'COMPLETED'
];


let orderId = null;

let renderRunning = false;

let renderQueued = false;


function setText(
    id,
    value
) {
    const node =
        document.getElementById(
            id
        );


    if (node) {
        node.textContent =
            value ?? '';
    }
}


function renderItems(
    order
) {
    const container =
        document.getElementById(
            'order-items'
        );


    if (!container) {
        return;
    }


    const items =
        order.items || [];


    if (!items.length) {
        replaceChildren(
            container,
            [
                el(
                    'div',
                    {
                        className:
                            'empty-state',

                        text:
                            'No order items found.'
                    }
                )
            ]
        );

        return;
    }


    replaceChildren(
        container,
        items.map(
            item =>
                el(
                    'div',
                    {
                        className:
                            'summary-row'
                    },
                    [
                        el(
                            'span',
                            {
                                text:
                                    `${item.quantity}× ${
                                        item.product_name
                                        ||
                                        'Item'
                                    }${
                                        item.variant_name
                                            ? ` (${item.variant_name})`
                                            : ''
                                    }`
                            }
                        ),

                        el(
                            'span',
                            {
                                text:
                                    money(
                                        item.line_total
                                        ||
                                        0
                                    )
                            }
                        )
                    ]
                )
        )
    );
}


function renderTimeline(
    order
) {
    const container =
        document.getElementById(
            'order-timeline'
        );


    if (!container) {
        return;
    }


    if (
        order.status ===
        'CANCELLED'
    ) {
        replaceChildren(
            container,
            [
                el(
                    'div',
                    {
                        className:
                            'status-step current'
                    },
                    [
                        el(
                            'span',
                            {
                                className:
                                    'status-dot'
                            }
                        ),

                        el(
                            'div',
                            {},
                            [
                                el(
                                    'strong',
                                    {
                                        text:
                                            'Cancelled'
                                    }
                                ),

                                el(
                                    'p',
                                    {
                                        className:
                                            'muted',

                                        text:
                                            order.cancellation_reason
                                            ||
                                            ''
                                    }
                                )
                            ]
                        )
                    ]
                )
            ]
        );

        return;
    }


    const steps =
        order.fulfillment_type ===
        'PICKUP'
            ? ORDER_STEPS.filter(
                status =>
                    status !==
                    'OUT_FOR_DELIVERY'
            )
            : ORDER_STEPS;


    const currentIndex =
        steps.indexOf(
            order.status
        );


    const history =
        order.history || [];


    replaceChildren(
        container,
        steps.map(
            (
                status,
                index
            ) => {
                const historyEntry =
                    history.find(
                        entry =>
                            entry.new_status ===
                            status
                    );


                let stateClass =
                    '';


                if (
                    currentIndex >= 0
                    &&
                    index < currentIndex
                ) {
                    stateClass =
                        'done';

                } else if (
                    index ===
                    currentIndex
                ) {
                    stateClass =
                        'current';
                }


                return el(
                    'div',
                    {
                        className:
                            `status-step ${stateClass}`
                    },
                    [
                        el(
                            'span',
                            {
                                className:
                                    'status-dot'
                            }
                        ),

                        el(
                            'div',
                            {},
                            [
                                el(
                                    'strong',
                                    {
                                        text:
                                            status.replaceAll(
                                                '_',
                                                ' '
                                            )
                                    }
                                ),

                                el(
                                    'small',
                                    {
                                        className:
                                            'd-block muted',

                                        text:
                                            historyEntry
                                                ? formatDate(
                                                    historyEntry.created_at
                                                )
                                                : ''
                                    }
                                )
                            ]
                        )
                    ]
                );
            }
        )
    );
}


function configureCancel(
    order
) {
    const button =
        document.getElementById(
            'cancel-order'
        );


    if (!button) {
        return;
    }


    button.hidden =
        ![
            'PENDING',
            'CONFIRMED'
        ]
            .includes(
                order.status
            );


    button.onclick =
        async () => {
            if (
                button.disabled
            ) {
                return;
            }


            const reason =
                String(
                    window.prompt(
                        'Why are you cancelling this order?'
                    )
                    ||
                    ''
                ).trim();


            if (!reason) {
                return;
            }


            setBusy(
                button,
                true,
                'Cancelling…'
            );


            try {
                await cancelMyOrder(
                    order.id,
                    reason
                );


                notify(
                    'Order cancelled.',
                    'success'
                );


                await requestRender();

            } catch (error) {
                console.error(
                    'Cancel order error:',
                    error
                );


                notify(
                    error?.message
                    ||
                    'Unable to cancel this order.',
                    'danger'
                );

            } finally {
                setBusy(
                    button,
                    false
                );
            }
        };
}


function configureReorder(
    order
) {
    const button =
        document.getElementById(
            'reorder'
        );


    if (!button) {
        return;
    }


    const reorderableItems =
        (
            order.items || []
        )
            .filter(
                item =>
                    item.product_id
            );


    button.disabled =
        !reorderableItems.length;


    button.onclick =
        async () => {
            if (
                button.disabled
            ) {
                return;
            }


            setBusy(
                button,
                true,
                'Adding…'
            );


            try {
                let added =
                    0;


                let skipped =
                    0;


                for (
                    const item
                    of reorderableItems
                ) {
                    try {
                        await addToCart({
                            product_id:
                                item.product_id,

                            variant_id:
                                item.variant_id
                                ||
                                null,

                            addon_ids:
                                (
                                    item.addons || []
                                )
                                    .map(
                                        addon =>
                                            addon.addon_id
                                    )
                                    .filter(Boolean),

                            quantity:
                                Number(
                                    item.quantity
                                    ||
                                    1
                                ),

                            instructions:
                                item.instructions
                                ||
                                '',

                            removed_ingredients:
                                item.removed_ingredients
                                ||
                                []
                        });


                        added += 1;

                    } catch (error) {
                        console.warn(
                            'Reorder item skipped:',
                            error
                        );


                        skipped += 1;
                    }
                }


                if (!added) {
                    throw new Error(
                        'None of the items from this order are currently available.'
                    );
                }


                if (skipped) {
                    notify(
                        `${added} item type${
                            added === 1
                                ? ''
                                : 's'
                        } added to your cart. ${skipped} unavailable item type${
                            skipped === 1
                                ? ' was'
                                : 's were'
                        } skipped.`,
                        'warning'
                    );

                } else {
                    notify(
                        'Order items added to your cart.',
                        'success'
                    );
                }


                window.location.href =
                    '/customer/cart.html';

            } catch (error) {
                console.error(
                    'Reorder error:',
                    error
                );


                notify(
                    error?.message
                    ||
                    'Unable to add this order to your cart.',
                    'danger'
                );


                setBusy(
                    button,
                    false
                );
            }
        };
}


async function performRender() {
    const order =
        await getOrder(
            orderId
        );


    if (!order) {
        throw new Error(
            'Order not found.'
        );
    }


    setText(
        'order-number',
        order.order_number
        ||
        '—'
    );


    setText(
        'order-meta',
        [
            formatDate(
                order.created_at
            ),
            order.fulfillment_type
        ]
            .filter(Boolean)
            .join(
                ' · '
            )
    );


    setText(
        'order-total',
        money(
            order.total
            ||
            0
        )
    );


    setText(
        'order-payment',
        order.payment_status
        ||
        '—'
    );


    renderItems(
        order
    );


    renderTimeline(
        order
    );


    configureCancel(
        order
    );


    configureReorder(
        order
    );
}


async function requestRender() {
    if (renderRunning) {
        renderQueued =
            true;

        return;
    }


    renderRunning =
        true;


    try {
        do {
            renderQueued =
                false;


            await performRender();

        } while (
            renderQueued
        );

    } catch (error) {
        console.error(
            'Order details refresh error:',
            error
        );


        notify(
            error?.message
            ||
            'Order details could not be refreshed.',
            'danger'
        );

    } finally {
        renderRunning =
            false;
    }
}


export async function init() {
    const context =
        await requireAuth({
            roles: [
                'CUSTOMER'
            ]
        });


    if (!context) {
        return;
    }


    orderId =
        parseQuery().id;


    if (!orderId) {
        throw new Error(
            'Order ID missing.'
        );
    }


    await requestRender();


    await subscribeToMyOrder(
        orderId,
        () => {
            requestRender();
        }
    );
}