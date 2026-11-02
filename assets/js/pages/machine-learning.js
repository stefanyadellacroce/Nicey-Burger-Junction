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
    if (
        value === null
        ||
        value === undefined
        ||
        value === ''
    ) {
        return fallback;
    }

    const number =
        Number(
            value
        );


    return Number.isFinite(
        number
    )
        ? number.toLocaleString(
            undefined,
            {
                maximumFractionDigits: 2
            }
        )
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
                            'No active sales forecast is loaded yet. An administrator can train and load one after enough completed-order history is available.'
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
                            'summary-row admin-ml-model'
                    },
                    [
                        el(
                            'strong',
                            {
                                text:
                                    model.model_name
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
                                    [
                                        model.algorithm,
                                        model.version
                                            ? `Version ${model.version}`
                                            : null,
                                        model.dataset_name
                                            ? `Dataset: ${model.dataset_name}`
                                            : null
                                    ]
                                        .filter(Boolean)
                                        .join(' · ')
                                        ||
                                        'Model details unavailable'
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


    const riskOrder = {
        CRITICAL: 0,
        REORDER_SOON: 1,
        WATCH: 2,
        HEALTHY: 3
    };
    const riskLabels = {
        WATCH: 'Keep an eye on stock',
        REORDER_SOON: 'Restock soon',
        CRITICAL: 'Restock now'
    };
    const highestRiskByIngredient =
        new Map();

    inventory.forEach(
        item => {
            const key =
                item.ingredient_id
                ||
                item.ingredient?.name
                ||
                item.id;
            const existing =
                highestRiskByIngredient.get(key);
            const itemRisk =
                riskOrder[item.risk_level]
                ??
                Number.MAX_SAFE_INTEGER;
            const existingRisk =
                riskOrder[existing?.risk_level]
                ??
                Number.MAX_SAFE_INTEGER;

            if (
                !existing
                ||
                itemRisk < existingRisk
                ||
                (
                    itemRisk === existingRisk
                    &&
                    String(item.forecast_date)
                        .localeCompare(
                            String(existing.forecast_date)
                        ) < 0
                )
            ) {
                highestRiskByIngredient.set(
                    key,
                    item
                );
            }
        }
    );

    const actionable =
        [...highestRiskByIngredient.values()]
            .filter(
                item =>
                    item.risk_level !== 'HEALTHY'
            )
            .sort(
                (itemA, itemB) =>
                    (
                        riskOrder[itemA.risk_level]
                        ??
                        Number.MAX_SAFE_INTEGER
                    )
                    -
                    (
                        riskOrder[itemB.risk_level]
                        ??
                        Number.MAX_SAFE_INTEGER
                    )
                    ||
                    Number(itemB.suggested_reorder || 0)
                    -
                    Number(itemA.suggested_reorder || 0)
            );

    if (!actionable.length) {
        replaceChildren(
            container,
            [
                el(
                    'div',
                    {
                        className:
                            'empty-state',

                        text:
                            'No ingredients are currently flagged for restocking.'
                    }
                )
            ]
        );

        return;
    }

    replaceChildren(
        container,
        actionable
            .slice(
                0,
                12
            )
            .map(
                item => {
                    const unit =
                        item.ingredient?.unit
                        ||
                        '';
                    const riskLabel =
                        riskLabels[item.risk_level]
                        ||
                        'Stock status unavailable';

                    return el(
                        'div',
                        {
                            className:
                                `summary-row admin-ml-stock admin-ml-stock-${String(item.risk_level || '').toLowerCase()}`
                        },
                        [
                            el(
                                'div',
                                {
                                    className:
                                        'admin-ml-stock-copy'
                                },
                                [
                                    el(
                                        'strong',
                                        {
                                            text:
                                                item.ingredient?.name
                                                ||
                                                'Ingredient'
                                        }
                                    ),

                                    el(
                                        'small',
                                        {
                                            className:
                                                'muted',

                                            text:
                                                `Expected remaining: ${formatNumber(item.expected_remaining)} ${unit}`.trim()
                                        }
                                    )
                                ]
                            ),

                            el(
                                'div',
                                {
                                    className:
                                        'admin-ml-stock-status'
                                },
                                [
                                    el(
                                        'strong',
                                        {
                                            text:
                                                riskLabel
                                        }
                                    ),

                                    el(
                                        'small',
                                        {
                                            text:
                                                `Restock ${formatNumber(item.suggested_reorder, '0')} ${unit}`.trim()
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
    const emptyState =
        document.getElementById(
            'ml-chart-empty'
        );


    if (!canvas) {
        return;
    }


    const grouped =
        groupDemandByDate(
            demand
        );

    if (emptyState) {
        emptyState.hidden =
            grouped.length > 0;
    }

    canvas.hidden =
        grouped.length === 0;

    if (!grouped.length) {
        return;
    }


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
                                                    (
                                                        row.external_product_key
                                                            ? `Product ${row.external_product_key}`
                                                            : 'Unlinked product'
                                                    )
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
                                                    formatNumber(
                                                        row.lower_bound
                                                    )
                                            }
                                        ),

                                        el(
                                            'td',
                                            {
                                                text:
                                                    formatNumber(
                                                        row.upper_bound
                                                    )
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

    renderDemandTable(
        demand
    );

    await renderDemandChart(
        demand
    );
}