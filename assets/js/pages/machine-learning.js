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
                            'No active trained models have been synced yet.'
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
                                    `${
                                        model.name
                                        ||
                                        'Model'
                                    } v${
                                        model.version
                                        ||
                                        '—'
                                    } · ${
                                        model.algorithm
                                        ||
                                        'Algorithm unavailable'
                                    }`
                            }
                        ),

                        el(
                            'small',
                            {
                                className:
                                    'muted',

                                text:
                                    model.trained_at
                                        ? formatDate(
                                            model.trained_at
                                        )
                                        : 'Training date unavailable'
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
                            'No inventory forecast has been generated yet.'
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
                                        `${
                                            item.risk_level
                                            ||
                                            'UNKNOWN'
                                        }: ${
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
                            'Forecast quantity',

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
                            'No demand forecast has been generated yet.'
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
                                        'Forecast'
                                }
                            ),

                            el(
                                'th',
                                {
                                    text:
                                        'Lower'
                                }
                            ),

                            el(
                                'th',
                                {
                                    text:
                                        'Upper'
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