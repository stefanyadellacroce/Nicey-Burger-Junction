import {
    requireAuth
} from '../core/guards.js';

import {
    listMyOrders
} from '../services/orders.js';

import {
    el,
    replaceChildren
} from '../core/dom.js';

import {
    money,
    formatDate
} from '../core/utils.js';


function getItemCount(
    order
) {
    return (
        order.items || []
    )
        .reduce(
            (
                total,
                item
            ) =>
                total
                +
                Number(
                    item.quantity
                    ||
                    0
                ),
            0
        );
}


function createOrderCard(
    order
) {
    const status =
        String(
            order.status
            ||
            ''
        );


    const detailUrl =
        `/customer/order-details.html?id=${encodeURIComponent(
            order.id
        )}`;


    return el(
        'article',
        {
            className:
                'panel'
        },
        [
            el(
                'div',
                {
                    className:
                        'd-flex justify-content-between gap-2 flex-wrap'
                },
                [
                    el(
                        'div',
                        {},
                        [
                            el(
                                'a',
                                {
                                    href:
                                        detailUrl,

                                    className:
                                        'fw-bold text-decoration-none',

                                    text:
                                        order.order_number
                                        ||
                                        'Order'
                                }
                            ),

                            el(
                                'div',
                                {
                                    className:
                                        'help-text',

                                    text:
                                        formatDate(
                                            order.created_at
                                        )
                                }
                            )
                        ]
                    ),

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
                        }
                    )
                ]
            ),

            el(
                'div',
                {
                    className:
                        'summary-row mt-2'
                },
                [
                    el(
                        'span',
                        {
                            text:
                                `${getItemCount(
                                    order
                                )} items · ${
                                    order.fulfillment_type
                                    ||
                                    '—'
                                }`
                        }
                    ),

                    el(
                        'strong',
                        {
                            text:
                                money(
                                    order.total
                                    ||
                                    0
                                )
                        }
                    )
                ]
            ),

            el(
                'a',
                {
                    href:
                        detailUrl,

                    className:
                        'btn-nbj ghost sm mt-2',

                    text:
                        'View & track'
                }
            )
        ]
    );
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


    const container =
        document.getElementById(
            'orders-list'
        );


    if (!container) {
        console.warn(
            'Customer orders container was not found.'
        );

        return;
    }


    const orders =
        await listMyOrders();


    if (
        !orders?.length
    ) {
        replaceChildren(
            container,
            [
                el(
                    'div',
                    {
                        className:
                            'empty-state panel'
                    },
                    [
                        el(
                            'i',
                            {
                                className:
                                    'bi bi-receipt'
                            }
                        ),

                        el(
                            'h2',
                            {
                                text:
                                    'No orders yet'
                            }
                        ),

                        el(
                            'a',
                            {
                                href:
                                    '/menu.html',

                                className:
                                    'btn-nbj',

                                text:
                                    'Start an order'
                            }
                        )
                    ]
                )
            ]
        );

        return;
    }


    replaceChildren(
        container,
        orders.map(
            createOrderCard
        )
    );
}