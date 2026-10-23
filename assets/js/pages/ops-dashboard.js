import {
    dashboardKpis
} from '../services/reports.js';

import {
    listOperationalOrders
} from '../services/orders.js';

import {
    listInventory
} from '../services/inventory.js';

import {
    renderChart,
    baseOptions
} from '../components/charts.js';

import {
    el,
    replaceChildren
} from '../core/dom.js';

import {
    money,
    formatDate
} from '../core/utils.js';


const ORDER_STATUSES = [
    'PENDING',
    'CONFIRMED',
    'PREPARING',
    'READY',
    'OUT_FOR_DELIVERY',
    'COMPLETED',
    'CANCELLED'
];


function asArray(value) {
    return Array.isArray(value)
        ? value
        : [];
}


function asNumber(
    value,
    fallback = 0
) {
    const number =
        Number(value);


    return Number.isFinite(number)
        ? number
        : fallback;
}


function setText(
    id,
    value
) {
    const node =
        document.getElementById(id);


    if (!node) {
        return;
    }


    node.textContent =
        String(
            value ?? '—'
        );
}


function normalizeKpis(value) {
    /*
     * Some report/RPC helpers may return
     * a single object while others may
     * return an array containing one row.
     */
    if (Array.isArray(value)) {
        return value[0] || {};
    }


    return value || {};
}


function renderKpis(kpis) {
    const values = {
        sales:
            money(
                asNumber(
                    kpis.today_sales
                )
            ),

        orders:
            asNumber(
                kpis.today_orders
            ),

        pending:
            asNumber(
                kpis.pending_orders
            ),

        preparing:
            asNumber(
                kpis.preparing_orders
            ),

        aov:
            money(
                asNumber(
                    kpis.average_order_value
                )
            ),

        low:
            asNumber(
                kpis.low_stock
            ),

        out:
            asNumber(
                kpis.out_of_stock
            ),

        payments:
            asNumber(
                kpis.pending_payment_verifications
            )
    };


    Object.entries(values)
        .forEach(
            ([
                key,
                value
            ]) => {
                setText(
                    `kpi-${key}`,
                    value
                );
            }
        );
}


function renderRecentOrders(orders) {
    const tbody =
        document.getElementById(
            'recent-orders'
        );


    if (!tbody) {
        return;
    }


    const recent =
        asArray(orders)
            .filter(Boolean)
            .slice(
                0,
                8
            );


    if (!recent.length) {
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
                                    '6',

                                className:
                                    'text-center muted py-4',

                                text:
                                    'No recent orders.'
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
        recent.map(
            order => {
                const status =
                    String(
                        order.status || ''
                    );


                return el(
                    'tr',
                    {},
                    [
                        el(
                            'td',
                            {},
                            el(
                                'a',
                                {
                                    href:
                                        `orders.html?open=${encodeURIComponent(
                                            order.id || ''
                                        )}`,

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
                                        `status-pill ${
                                            status
                                                .toLowerCase()
                                        }`,

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
                                    money(
                                        asNumber(
                                            order.total
                                        )
                                    )
                            }
                        ),

                        el(
                            'td',
                            {
                                text:
                                    order.created_at
                                        ? formatDate(
                                            order.created_at
                                        )
                                        : '—'
                            }
                        )
                    ]
                );
            }
        )
    );
}


function renderLowStock(inventory) {
    const container =
        document.getElementById(
            'low-stock-list'
        );


    if (!container) {
        return;
    }


    const lowStock =
        asArray(inventory)
            .filter(Boolean)
            .filter(
                item =>
                    asNumber(
                        item.current_quantity
                    )
                    <=
                    asNumber(
                        item.reorder_level
                    )
            )
            .sort(
                (
                    a,
                    b
                ) =>
                    asNumber(
                        a.current_quantity
                    )
                    -
                    asNumber(
                        b.current_quantity
                    )
            )
            .slice(
                0,
                8
            );


    if (!lowStock.length) {
        replaceChildren(
            container,
            [
                el(
                    'div',
                    {
                        className:
                            'muted',

                        text:
                            'No low-stock ingredients.'
                    }
                )
            ]
        );

        return;
    }


    replaceChildren(
        container,
        lowStock.map(
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
                                    item.ingredient
                                        ?.name
                                    ||
                                    item.sku
                                    ||
                                    'Ingredient'
                            }
                        ),

                        el(
                            'strong',
                            {
                                text:
                                    `${
                                        asNumber(
                                            item.current_quantity
                                        )
                                    } ${
                                        item.ingredient
                                            ?.unit
                                        ||
                                        ''
                                    }`.trim()
                            }
                        )
                    ]
                )
        )
    );
}


function countOrdersByStatus(orders) {
    const counts =
        Object.fromEntries(
            ORDER_STATUSES.map(
                status => [
                    status,
                    0
                ]
            )
        );


    asArray(orders)
        .filter(Boolean)
        .forEach(
            order => {
                const status =
                    order.status;


                /*
                 * Safer than:
                 * order.status in counts
                 */
                if (
                    Object.prototype
                        .hasOwnProperty
                        .call(
                            counts,
                            status
                        )
                ) {
                    counts[status] += 1;
                }
            }
        );


    return counts;
}


function countOrdersByHour(orders) {
    const hourly =
        Array(24)
            .fill(0);


    asArray(orders)
        .filter(Boolean)
        .forEach(
            order => {
                if (!order.created_at) {
                    return;
                }


                const date =
                    new Date(
                        order.created_at
                    );


                if (
                    Number.isNaN(
                        date.getTime()
                    )
                ) {
                    return;
                }


                hourly[
                    date.getHours()
                ] += 1;
            }
        );


    return hourly;
}


async function renderStatusChart(orders) {
    const canvas =
        document.getElementById(
            'status-chart'
        );


    if (!canvas) {
        return;
    }


    const counts =
        countOrdersByStatus(
            orders
        );


    await renderChart(
        canvas,
        {
            type:
                'doughnut',

            data: {
                labels:
                    ORDER_STATUSES,

                datasets: [
                    {
                        label:
                            'Orders',

                        data:
                            ORDER_STATUSES.map(
                                status =>
                                    counts[status]
                            )
                    }
                ]
            },

            options: {
                responsive:
                    true,

                maintainAspectRatio:
                    false,

                plugins: {
                    legend: {
                        position:
                            'bottom'
                    }
                }
            }
        }
    );
}


async function renderHourlyChart(orders) {
    const canvas =
        document.getElementById(
            'hour-chart'
        );


    if (!canvas) {
        return;
    }


    const hourly =
        countOrdersByHour(
            orders
        );


    await renderChart(
        canvas,
        {
            type:
                'bar',

            data: {
                labels:
                    Array.from(
                        {
                            length:
                                24
                        },
                        (_, hour) =>
                            `${String(
                                hour
                            ).padStart(
                                2,
                                '0'
                            )}:00`
                    ),

                datasets: [
                    {
                        label:
                            'Orders',

                        data:
                            hourly
                    }
                ]
            },

            options:
                baseOptions
        }
    );
}


async function renderCharts(orders) {
    /*
     * Render independently so a missing
     * canvas does not break the other chart.
     */
    await Promise.all([
        renderStatusChart(
            orders
        ),

        renderHourlyChart(
            orders
        )
    ]);
}


export async function init() {
    const [
        kpiResult,
        orderResult,
        inventoryResult
    ] =
        await Promise.all([
            dashboardKpis(),

            listOperationalOrders({
                limit:
                    200
            }),

            listInventory()
        ]);


    const kpis =
        normalizeKpis(
            kpiResult
        );


    const orders =
        asArray(
            orderResult
        );


    const inventory =
        asArray(
            inventoryResult
        );


    renderKpis(
        kpis
    );


    renderRecentOrders(
        orders
    );


    renderLowStock(
        inventory
    );


    await renderCharts(
        orders
    );
}