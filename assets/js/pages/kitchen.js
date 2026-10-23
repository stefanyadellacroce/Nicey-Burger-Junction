import {
    listOperationalOrders,
    subscribeToOperationalOrders,
    updateOrderStatus,
    getOrder
} from '../services/orders.js';

import {
    el,
    replaceChildren
} from '../core/dom.js';

import {
    formatDate,
    notify
} from '../core/utils.js';


const detailCache =
    new Map();


const DETAIL_CACHE_MS =
    30000;


let renderRunning =
    false;


let renderQueued =
    false;


let refreshTimer =
    null;


function getNextStatus(
    order
) {
    if (
        order.status ===
        'PENDING'
    ) {
        return 'CONFIRMED';
    }


    if (
        order.status ===
        'CONFIRMED'
    ) {
        return 'PREPARING';
    }


    if (
        order.status ===
        'PREPARING'
    ) {
        return 'READY';
    }


    if (
        order.status ===
        'READY'
    ) {
        return (
            order.fulfillment_type ===
            'DELIVERY'
                ? 'OUT_FOR_DELIVERY'
                : 'COMPLETED'
        );
    }


    return null;
}


function getActionLabel(
    status
) {
    const labels = {
        CONFIRMED:
            'Confirm',

        PREPARING:
            'Start',

        READY:
            'Ready',

        OUT_FOR_DELIVERY:
            'Dispatch',

        COMPLETED:
            'Complete'
    };


    return labels[status]
        ||
        'Advance';
}


function getMinutesWaiting(
    createdAt
) {
    const created =
        Date.parse(
            createdAt
        );


    if (
        Number.isNaN(
            created
        )
    ) {
        return 0;
    }


    return Math.max(
        0,
        Math.floor(
            (
                Date.now()
                -
                created
            )
            /
            60000
        )
    );
}


async function getFullOrder(
    orderId
) {
    const cached =
        detailCache.get(
            orderId
        );


    if (
        cached
        &&
        (
            Date.now()
            -
            cached.loadedAt
        )
        <
        DETAIL_CACHE_MS
    ) {
        return cached.order;
    }


    const order =
        await getOrder(
            orderId
        );


    detailCache.set(
        orderId,
        {
            loadedAt:
                Date.now(),

            order
        }
    );


    return order;
}


async function buildCard(
    order
) {
    const full =
        await getFullOrder(
            order.id
        );


    const minutes =
        getMinutesWaiting(
            order.created_at
        );


    const card =
        el(
            'article',
            {
                className:
                    `kitchen-card ${
                        minutes > 30
                            ? 'overdue'
                            : ''
                    }`
            },
            [
                el(
                    'div',
                    {
                        className:
                            'd-flex justify-content-between gap-2'
                    },
                    [
                        el(
                            'strong',
                            {
                                text:
                                    order.order_number
                                    ||
                                    'Order'
                            }
                        ),

                        el(
                            'span',
                            {
                                className:
                                    'help-text',

                                text:
                                    `${minutes} min`
                            }
                        )
                    ]
                ),

                el(
                    'div',
                    {
                        className:
                            'help-text',

                        text:
                            `${
                                order.fulfillment_type
                                ||
                                '—'
                            } · ${
                                formatDate(
                                    order.created_at
                                )
                            }`
                    }
                ),

                el(
                    'ul',
                    {},
                    (
                        full?.items || []
                    ).map(
                        item =>
                            el(
                                'li',
                                {
                                    text:
                                        `${item.quantity}× ${
                                            item.product_name
                                            ||
                                            'Item'
                                        }${
                                            item.variant_name
                                                ? ` · ${item.variant_name}`
                                                : ''
                                        }${
                                            item.instructions
                                                ? ` — ${item.instructions}`
                                                : ''
                                        }`
                                }
                            )
                    )
                )
            ]
        );


    const nextStatus =
        getNextStatus(
            order
        );


    if (!nextStatus) {
        return card;
    }


    const button =
        el(
            'button',
            {
                className:
                    'btn-nbj sm w-100',

                type:
                    'button',

                text:
                    getActionLabel(
                        nextStatus
                    )
            }
        );


    button.addEventListener(
        'click',
        async () => {
            if (
                button.disabled
            ) {
                return;
            }


            button.disabled =
                true;


            const originalText =
                button.textContent;


            button.textContent =
                'Updating…';


            try {
                await updateOrderStatus(
                    order.id,
                    nextStatus
                );


                /*
                 * Status or order details may
                 * have changed, so invalidate it.
                 */
                detailCache.delete(
                    order.id
                );


                await requestRender();

            } catch (error) {
                console.error(
                    'Kitchen status update error:',
                    error
                );


                notify(
                    error?.message
                    ||
                    'Unable to update the order status.',
                    'danger'
                );

            } finally {
                button.disabled =
                    false;


                button.textContent =
                    originalText;
            }
        }
    );


    card.append(
        button
    );


    return card;
}


function renderEmptyColumn(
    element,
    message
) {
    replaceChildren(
        element,
        [
            el(
                'div',
                {
                    className:
                        'empty-state',

                    text:
                        message
                }
            )
        ]
    );
}


async function performRender() {
    const newColumn =
        document.getElementById(
            'kitchen-new'
        );


    const preparingColumn =
        document.getElementById(
            'kitchen-preparing'
        );


    const readyColumn =
        document.getElementById(
            'kitchen-ready'
        );


    if (
        !newColumn ||
        !preparingColumn ||
        !readyColumn
    ) {
        return;
    }


    const all =
        await listOperationalOrders({
            limit:
                150
        });


    const groups = {
        new:
            all.filter(
                order =>
                    [
                        'PENDING',
                        'CONFIRMED'
                    ]
                        .includes(
                            order.status
                        )
            ),

        preparing:
            all.filter(
                order =>
                    order.status ===
                    'PREPARING'
            ),

        ready:
            all.filter(
                order =>
                    order.status ===
                    'READY'
            )
    };


    const [
        newCards,
        preparingCards,
        readyCards
    ] =
        await Promise.all([
            Promise.all(
                groups.new.map(
                    buildCard
                )
            ),

            Promise.all(
                groups.preparing.map(
                    buildCard
                )
            ),

            Promise.all(
                groups.ready.map(
                    buildCard
                )
            )
        ]);


    if (newCards.length) {
        replaceChildren(
            newColumn,
            newCards
        );

    } else {
        renderEmptyColumn(
            newColumn,
            'No new orders.'
        );
    }


    if (
        preparingCards.length
    ) {
        replaceChildren(
            preparingColumn,
            preparingCards
        );

    } else {
        renderEmptyColumn(
            preparingColumn,
            'Nothing is being prepared.'
        );
    }


    if (
        readyCards.length
    ) {
        replaceChildren(
            readyColumn,
            readyCards
        );

    } else {
        renderEmptyColumn(
            readyColumn,
            'No orders are ready yet.'
        );
    }
}


/*
 * Realtime events and the one-minute timer
 * may fire together. Do not start multiple
 * expensive kitchen renders simultaneously.
 */
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


            try {
                await performRender();

            } catch (error) {
                console.error(
                    'Kitchen render error:',
                    error
                );


                notify(
                    'Kitchen orders could not be refreshed.',
                    'danger'
                );
            }

        } while (
            renderQueued
        );

    } finally {
        renderRunning =
            false;
    }
}


export async function init() {
    await requestRender();


    await subscribeToOperationalOrders(
        () => {
            /*
             * Any realtime order change should
             * bypass stale order-detail data.
             */
            detailCache.clear();


            requestRender();
        }
    );


    refreshTimer =
        window.setInterval(
            () => {
                requestRender();
            },
            60000
        );

        
window.addEventListener(
    'nicey:page-leave',
    () => {
        if (refreshTimer) {
            window.clearInterval(refreshTimer);
            refreshTimer = null;
        }
    },
    { once: true }
);


    window.addEventListener(
        'beforeunload',
        () => {
            if (refreshTimer) {
                window.clearInterval(
                    refreshTimer
                );


                refreshTimer =
                    null;
            }
        },
        {
            once:
                true
        }
    );
}