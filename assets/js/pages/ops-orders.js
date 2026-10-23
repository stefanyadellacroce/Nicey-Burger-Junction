import {
    listOperationalOrders,
    updateOrderStatus,
    subscribeToOperationalOrders
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


let rows = [];


let loading =
    false;


let reloadQueued =
    false;


const NEXT_STATUS = {
    PENDING:
        'CONFIRMED',

    CONFIRMED:
        'PREPARING',

    PREPARING:
        'READY',

    READY:
        null,

    OUT_FOR_DELIVERY:
        'COMPLETED'
};


function getAction(
    order
) {
    let next =
        NEXT_STATUS[
            order.status
        ];


    if (
        order.status ===
        'READY'
    ) {
        next =
            order.fulfillment_type ===
            'DELIVERY'
                ? 'OUT_FOR_DELIVERY'
                : 'COMPLETED';
    }


    if (!next) {
        return null;
    }


    const labels = {
        CONFIRMED:
            'Confirm',

        PREPARING:
            'Start preparing',

        READY:
            'Mark ready',

        OUT_FOR_DELIVERY:
            'Dispatch',

        COMPLETED:
            'Complete'
    };


    return {
        status:
            next,

        label:
            labels[next]
            ||
            'Advance'
    };
}


function getFilters() {
    return {
        status:
            document
                .getElementById(
                    'order-status-filter'
                )
                ?.value
            ||
            '',

        fulfillment:
            document
                .getElementById(
                    'order-fulfillment-filter'
                )
                ?.value
            ||
            '',

        payment:
            document
                .getElementById(
                    'order-payment-filter'
                )
                ?.value
            ||
            ''
    };
}


function getSearchTerm() {
    return String(
        document
            .getElementById(
                'order-search'
            )
            ?.value
        ||
        ''
    )
        .trim()
        .toLowerCase();
}


function filterRowsLocally() {
    const term =
        getSearchTerm();


    if (!term) {
        return rows;
    }


    return rows.filter(
        order => {
            const haystack =
                [
                    order.order_number,
                    order.customer_name,
                    order.customer_phone,
                    order.customer_email
                ]
                    .filter(Boolean)
                    .join(' ')
                    .toLowerCase();


            return haystack.includes(
                term
            );
        }
    );
}


function createOrderRow(
    order
) {
    const status =
        String(
            order.status
            ||
            ''
        );


    const paymentStatus =
        String(
            order.payment_status
            ||
            ''
        );


    const detailsUrl =
        `order-details.html?id=${encodeURIComponent(
            order.id
        )}`;


    const row =
        el(
            'tr'
        );


    row.append(
        el(
            'td',
            {},
            el(
                'a',
                {
                    href:
                        detailsUrl,

                    text:
                        order.order_number
                        ||
                        'Order'
                }
            )
        ),

        el(
            'td',
            {
                text:
                    order.customer_name
                    ||
                    '—'
            }
        ),

        el(
            'td',
            {
                text:
                    String(
                        order.item_count
                        ??
                        0
                    )
            }
        ),

        el(
            'td',
            {
                text:
                    money(
                        order.total
                        ||
                        0
                    )
            }
        ),

        el(
            'td',
            {},
            el(
                'span',
                {
                    className:
                        `status-pill ${paymentStatus.toLowerCase()}`,

                    text:
                        paymentStatus
                        ||
                        '—'
                }
            )
        ),

        el(
            'td',
            {
                text:
                    order.fulfillment_type
                    ||
                    '—'
            }
        ),

        el(
            'td',
            {},
            el(
                'span',
                {
                    className:
                        `status-pill ${status.toLowerCase()}`,

                    text:
                        status
                            .replaceAll(
                                '_',
                                ' '
                            )
                        ||
                        '—'
                }
            )
        ),

        el(
            'td',
            {
                text:
                    formatDate(
                        order.created_at
                    )
            }
        )
    );


    const actions =
        el(
            'td',
            {
                className:
                    'cluster'
            }
        );


    actions.append(
        el(
            'a',
            {
                href:
                    detailsUrl,

                className:
                    'btn-nbj ghost sm',

                text:
                    'Open'
            }
        )
    );


    const action =
        getAction(
            order
        );


    if (action) {
        const button =
            el(
                'button',
                {
                    className:
                        'btn-nbj sm',

                    type:
                        'button',

                    text:
                        action.label
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


                setBusy(
                    button,
                    true,
                    'Updating…'
                );


                try {
                    await updateOrderStatus(
                        order.id,
                        action.status
                    );


                    notify(
                        `Order ${
                            order.order_number
                            ||
                            ''
                        } updated.`,
                        'success'
                    );


                    await requestReload();

                } catch (error) {
                    console.error(
                        'Order status update error:',
                        error
                    );


                    notify(
                        error?.message
                        ||
                        'Unable to update the order.',
                        'danger'
                    );

                } finally {
                    setBusy(
                        button,
                        false
                    );
                }
            }
        );


        actions.append(
            button
        );
    }


    row.append(
        actions
    );


    return row;
}


function render() {
    const tbody =
        document.getElementById(
            'orders-tbody'
        );


    if (!tbody) {
        return;
    }


    const filtered =
        filterRowsLocally();


    if (!filtered.length) {
        replaceChildren(
            tbody,
            [
                el(
                    'tr',
                    {},
                    [
                        el(
                            'td',
                            {
                                colspan:
                                    '9',

                                className:
                                    'text-center muted py-4',

                                text:
                                    getSearchTerm()
                                        ? 'No matching orders found.'
                                        : 'No orders found for these filters.'
                            }
                        )
                    ]
                )
            ]
        );

        return;
    }


    replaceChildren(
        tbody,
        filtered.map(
            createOrderRow
        )
    );
}


async function loadRows() {
    const filters =
        getFilters();


    rows =
        await listOperationalOrders({
            status:
                filters.status
                ||
                null,

            fulfillment:
                filters.fulfillment
                ||
                null,

            payment:
                filters.payment
                ||
                null,

            limit:
                300
        });


    render();
}


/*
 * Realtime and manual updates can happen almost
 * together. Collapse them into one reload rather
 * than running simultaneous order queries.
 */
async function requestReload() {
    if (loading) {
        reloadQueued =
            true;

        return;
    }


    loading =
        true;


    try {
        do {
            reloadQueued =
                false;


            try {
                await loadRows();

            } catch (error) {
                console.error(
                    'Order list refresh error:',
                    error
                );


                notify(
                    'Orders could not be refreshed.',
                    'danger'
                );
            }

        } while (
            reloadQueued
        );

    } finally {
        loading =
            false;
    }
}


export async function init() {
    /*
     * Dashboard links use ?open=<order-id>.
     * Redirect immediately instead of loading the
     * whole order list first and then redirecting.
     */
    const openOrder =
        parseQuery().open;


    if (openOrder) {
        window.location.replace(
            `order-details.html?id=${encodeURIComponent(
                openOrder
            )}`
        );

        return;
    }


    const search =
        document.getElementById(
            'order-search'
        );


    const tbody =
        document.getElementById(
            'orders-tbody'
        );


    const filterIds = [
        'order-status-filter',
        'order-fulfillment-filter',
        'order-payment-filter'
    ];


    if (
        !search ||
        !tbody ||
        filterIds.some(
            id =>
                !document.getElementById(
                    id
                )
        )
    ) {
        console.warn(
            'Operations order page elements were not found.'
        );

        return;
    }


    filterIds.forEach(
        id => {
            document
                .getElementById(
                    id
                )
                .addEventListener(
                    'change',
                    requestReload
                );
        }
    );


    /*
     * Search only filters the rows already loaded.
     * No Supabase query for each keystroke.
     */
    search.addEventListener(
        'input',
        render
    );


    await requestReload();


    await subscribeToOperationalOrders(
        () => {
            requestReload();
        }
    );
}