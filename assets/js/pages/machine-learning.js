import {
    getActiveModels,
    getDemandForecast,
    getInventoryForecast
} from '../services/ml.js';

import {
    renderChart,
    baseOptions
} from '../components/charts.js';

import {
    el,
    replaceChildren
} from '../core/dom.js';

import {
    formatDate
} from '../core/utils.js';


function formatNumber(
    value,
    fallback = '—'
) {
    const number =
        Number(
            value
        );


    return Number.isFinite(
        number
    )
        ? String(number)
        : fallback;
}


function renderModels(
    models
) {
    const container =
        document.getElementById(
            'ml-models'
        );


    if (!container) {
        return;
    }


    if (!models.length) {
        replaceChildren(
            container,
            [
                el(
                    'div',
                    {
                        className:
                            'empty-state',

                        text:
                            'Forecasts have not been set up yet. Ask your system administrator to load them.'
                    }
                )
            ]
        );

        return;
    }


    replaceChildren(
        container,
        models.map(
            model =>
                el(
                    'article',
                    {
                        className:
                            'summary-row'
                    },
                    [
                        el(
                            'span',
                            {
                                text:
                                    model.name
                                    ||
                                    'Forecast data is connected'
                            }
                        ),

                        el(
                            'small',
                            {
                                className:
                                    'muted',

                                text:
                                    model.trained_at
                                        ? `Updated ${formatDate(model.trained_at)}`
                                        : 'Update date unavailable'
                            }
                        )
                    ]
                )
        )
    );
}


function renderInventoryRisk(
    inventory
) {
    const container =
        document.getElementById(
            'ml-inventory'
        );


    if (!container) {
        return;
    }


    if (!inventory.length) {
        replaceChildren(
            container,
            [
                el(
                    'div',
                    {
                        className:
                            'empty-state',

                        text:
                            'No stock estimates are available yet. Check the Inventory page for current quantities.'
                    }
                )
            ]
        );

        return;
    }


    replaceChildren(
        container,
        inventory
            .slice(
                0,
                12
            )
            .map(
                item => {
                    const reorder =
                        Number(
                            item.suggested_reorder
                            ||
                            0
                        );
                    const riskLabels = {
                        HEALTHY: 'Stock looks okay',
                        WATCH: 'Keep an eye on stock',
                        REORDER_SOON: 'Restock soon',
                        CRITICAL: 'Restock now'
                    };
                    const riskLabel =
                        riskLabels[item.risk_level]
                        ||
                        'Stock status unavailable';


                    return el(
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
                                        'Ingredient'
                                }
                            ),

                            el(
                                'strong',
                                {
                                    text:
                                        `${riskLabel} · Suggested restock: ${
                                            Number.isFinite(
                                                reorder
                                            )
                                                ? reorder.toFixed(
                                                    2
                                                )
                                                : '0.00'
                                        } ${
                                            item.ingredient
                                                ?.unit
                                            ||
                                            ''
                                        }`
                                }
                            )
                        ]
                    );
                }
            )
    );
}


function groupDemandByDate(
    demand
) {
    const grouped =
        new Map();


    demand.forEach(
        row => {
            const date =
                row.forecast_date;


            if (!date) {
                return;
            }


            grouped.set(
                date,
                (
                    grouped.get(
                        date
                    )
                    ||
                    0
                )
                +
                Number(
                    row.predicted_quantity
                    ||
                    0
                )
            );
        }
    );


    return [
        ...grouped.entries()
    ]
        .sort(
            (
                [dateA],
                [dateB]
            ) =>
                String(dateA)
                    .localeCompare(
                        String(dateB)
                    )
        );
}


async function renderDemandChart(
    demand
) {
    const canvas =
        document.getElementById(
            'ml-demand-chart'
        );


    if (!canvas) {
        return;
    }


    const grouped =
        groupDemandByDate(
            demand
        );


    await renderChart(
        canvas,
        {
            type:
                'line',

            data: {
                labels:
                    grouped.map(
                        ([date]) =>
                            date
                    ),

                datasets: [
                    {
                        label:
                            'Expected sales',

                        data:
                            grouped.map(
                                (
                                    [
                                        ,
                                        quantity
                                    ]
                                ) =>
                                    quantity
                            )
                    }
                ]
            },

            options:
                baseOptions
        }
    );
}


function renderDemandTable(
    demand
) {
    const container =
        document.getElementById(
            'ml-demand-table'
        );


    if (!container) {
        return;
    }


    if (!demand.length) {
        replaceChildren(
            container,
            [
                el(
                    'div',
                    {
                        className:
                            'empty-state',

                        text:
                            'No sales estimates are available yet. Forecasts may not have been set up.'
                    }
                )
            ]
        );

        return;
    }


    const table =
        el(
            'table',
            {},
            [
                el(
                    'thead',
                    {},
                    el(
                        'tr',
                        {},
                        [
                            el(
                                'th',
                                {
                                    text:
                                        'Date'
                                }
                            ),

                            el(
                                'th',
                                {
                                    text:
                                        'Product'
                                }
                            ),

                            el(
                                'th',
                                {
                                    text:
                                        'Expected sales'
                                }
                            ),

                            el(
                                'th',
                                {
                                    text:
                                        'Low estimate'
                                }
                            ),

                            el(
                                'th',
                                {
                                    text:
                                        'High estimate'
                                }
                            )
                        ]
                    )
                ),

                el(
                    'tbody',
                    {},
                    demand
                        .slice(
                            0,
                            100
                        )
                        .map(
                            row =>
                                el(
                                    'tr',
                                    {},
                                    [
                                        el(
                                            'td',
                                            {
                                                text:
                                                    row.forecast_date
                                                    ||
                                                    '—'
                                            }
                                        ),

                                        el(
                                            'td',
                                            {
                                                text:
                                                    row.product
                                                        ?.name
                                                    ||
                                                    '—'
                                            }
                                        ),

                                        el(
                                            'td',
                                            {
                                                text:
                                                    formatNumber(
                                                        row.predicted_quantity
                                                    )
                                            }
                                        ),

                                        el(
                                            'td',
                                            {
                                                text:
                                                    row.lower_bound
                                                    ??
                                                    '—'
                                            }
                                        ),

                                        el(
                                            'td',
                                            {
                                                text:
                                                    row.upper_bound
                                                    ??
                                                    '—'
                                            }
                                        )
                                    ]
                                )
                        )
                )
            ]
        );


    replaceChildren(
        container,
        [
            table
        ]
    );
}


export async function init() {
    const [
        modelData,
        demandData,
        inventoryData
    ] =
        await Promise.all([
            getActiveModels(),
            getDemandForecast(14),
            getInventoryForecast()
        ]);


    const models =
        modelData || [];


    const demand =
        demandData || [];


    const inventory =
        inventoryData || [];


    renderModels(
        models
    );


    renderInventoryRisk(
        inventory
    );


    await renderDemandChart(
        demand
    );


    renderDemandTable(
        demand
    );
}