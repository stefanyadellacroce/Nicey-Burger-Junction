import {
    requireAuth
} from '../core/guards.js';

import {
    listMyOrders
} from '../services/orders.js';

import {
    listFavorites
} from '../services/profile.js';

import {
    listNotifications
} from '../services/notifications.js';

import {
    getRecommendations
} from '../services/ml.js';

import {
    listProducts
} from '../services/products.js';

import {
    productCard
} from '../components/product-card.js';

import {
    el,
    replaceChildren
} from '../core/dom.js';

import {
    money,
    formatDate
} from '../core/utils.js';

import {
    requireSupabase
} from '../core/supabase.js';


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
            value;
    }
}


function createActiveOrderCard(
    order
) {
    const status =
        String(
            order.status
            ||
            ''
        );


    return el(
        'a',
        {
            href:
                `/customer/order-details.html?id=${encodeURIComponent(
                    order.id
                )}`,

            className:
                'panel text-decoration-none text-dark'
        },
        [
            el(
                'div',
                {
                    className:
                        'd-flex justify-content-between'
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
                        'summary-row'
                },
                [
                    el(
                        'span',
                        {
                            text:
                                formatDate(
                                    order.created_at
                                )
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
            )
        ]
    );
}


function renderActiveOrders(
    orders
) {
    const container =
        document.getElementById(
            'active-orders'
        );


    if (!container) {
        return;
    }


    const active =
        orders.filter(
            order =>
                ![
                    'COMPLETED',
                    'CANCELLED'
                ]
                    .includes(
                        order.status
                    )
        );


    if (!active.length) {
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
                                    'bi bi-bag-check'
                            }
                        ),

                        el(
                            'p',
                            {
                                text:
                                    'No active orders.'
                            }
                        ),

                        el(
                            'a',
                            {
                                href:
                                    '/menu.html',

                                className:
                                    'btn-nbj sm',

                                text:
                                    'Order now'
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
        active
            .slice(
                0,
                3
            )
            .map(
                createActiveOrderCard
            )
    );
}


async function loadRecommendations() {
    try {
        const results =
            await getRecommendations(
                null,
                4
            );


        const recommendations =
            (
                results || []
            )
                .map(
                    item =>
                        item.recommended
                )
                .filter(Boolean);


        if (
            recommendations.length
        ) {
            return recommendations;
        }

    } catch (error) {
        console.warn(
            'Recommendation service unavailable:',
            error
        );
    }


    const products =
        await listProducts({
            bestseller:
                true
        });


    return products.slice(
        0,
        4
    );
}


async function renderPromotions() {
    const container =
        document.getElementById(
            'dashboard-promotions'
        );


    if (!container) {
        return;
    }


    const supabase =
        await requireSupabase();


    const now =
        new Date()
            .toISOString();


    const {
        data,
        error
    } =
        await supabase
            .from(
                'promotions'
            )
            .select(
                'code,title,description,starts_at,ends_at'
            )
            .eq(
                'active',
                true
            )
            .or(
                `starts_at.is.null,starts_at.lte.${now}`
            )
            .or(
                `ends_at.is.null,ends_at.gt.${now}`
            )
            .limit(
                3
            );


    if (error) {
        console.error(
            'Dashboard promotions error:',
            error
        );


        replaceChildren(
            container,
            []
        );

        return;
    }


    replaceChildren(
        container,
        (
            data || []
        )
            .map(
                promotion =>
                    el(
                        'div',
                        {
                            className:
                                'panel'
                        },
                        [
                            el(
                                'strong',
                                {
                                    text:
                                        promotion.title
                                }
                            ),

                            el(
                                'div',
                                {
                                    className:
                                        'help-text',

                                    text:
                                        promotion.description
                                        ||
                                        ''
                                }
                            ),

                            promotion.code
                                ? el(
                                    'code',
                                    {
                                        text:
                                            promotion.code
                                    }
                                )
                                : null
                        ]
                    )
            )
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


    const profile =
        context.profile
        ||
        context;


    const firstName =
        String(
            profile?.full_name
            ||
            'Nicey customer'
        )
            .trim()
            .split(
                /\s+/
            )[0];


    setText(
        'customer-greeting',
        `Hi, ${firstName}!`
    );


    const [
        orders,
        favorites,
        notifications
    ] =
        await Promise.all([
            listMyOrders(),
            listFavorites(),
            listNotifications(6)
        ]);


    renderActiveOrders(
        orders || []
    );


    setText(
        'dashboard-order-count',
        String(
            orders?.length
            ||
            0
        )
    );


    setText(
        'dashboard-favorite-count',
        String(
            favorites?.length
            ||
            0
        )
    );


    setText(
        'dashboard-unread-count',
        String(
            (
                notifications
                ||
                []
            )
                .filter(
                    notification =>
                        !notification.read_at
                )
                .length
        )
    );


    const recommendations =
        await loadRecommendations();


    const recommendationNode =
        document.getElementById(
            'dashboard-recommendations'
        );


    if (recommendationNode) {
        replaceChildren(
            recommendationNode,
            recommendations.map(
                product =>
                    productCard(
                        product
                    )
            )
        );
    }


    await renderPromotions();
}