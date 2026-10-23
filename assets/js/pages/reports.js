import {
    salesReport,
    productReport,
    categoryReport
} from '../services/reports.js';

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
    toCsv,
    downloadText,
    notify,
    setBusy
} from '../core/utils.js';


let currentSales = [];


function localDateFromInput(
    value
) {
    const match =
        /^(\d{4})-(\d{2})-(\d{2})$/
            .exec(
                value
            );


    if (!match) {
        return null;
    }


    const date =
        new Date(
            Number(match[1]),
            Number(match[2]) - 1,
            Number(match[3]),
            0,
            0,
            0,
            0
        );


    return Number.isNaN(
        date.getTime()
    )
        ? null
        : date;
}


function dateInputValue(
    date
) {
    const year =
        date.getFullYear();


    const month =
        String(
            date.getMonth() + 1
        ).padStart(
            2,
            '0'
        );


    const day =
        String(
            date.getDate()
        ).padStart(
            2,
            '0'
        );


    return `${year}-${month}-${day}`;
}


function getRange() {
    const startInput =
        document.getElementById(
            'report-start'
        );


    const endInput =
        document.getElementById(
            'report-end'
        );


    const start =
        localDateFromInput(
            startInput?.value
            ||
            ''
        );


    const end =
        localDateFromInput(
            endInput?.value
            ||
            ''
        );


    if (
        !start ||
        !end
    ) {
        throw new Error(
            'Select both report dates.'
        );
    }


    if (
        start > end
    ) {
        throw new Error(
            'The report start date must be before or equal to the end date.'
        );
    }


    const endExclusive =
        new Date(
            end
        );


    endExclusive.setDate(
        endExclusive.getDate()
        +
        1
    );


    return [
        start.toISOString(),
        endExclusive.toISOString()
    ];
}


function renderProducts(
    products
) {
    const tbody =
        document.getElementById(
            'report-products'
        );


    if (!tbody) {
        return;
    }


    if (!products.length) {
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
                                colspan: '3',
                                className:
                                    'text-center muted py-4',
                                text:
                                    'No product sales were recorded for this period.'
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
        products.map(
            product =>
                el(
                    'tr',
                    {},
                    [
                        el(
                            'td',
                            {
                                text:
                                    product.product_name
                                    ||
                                    '—'
                            }
                        ),

                        el(
                            'td',
                            {
                                text:
                                    String(
                                        product.quantity_sold
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
                                        product.revenue
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


async function runReport() {
    const [
        start,
        end
    ] =
        getRange();


    const [
        sales,
        products,
        categories
    ] =
        await Promise.all([
            salesReport(
                start,
                end
            ),

            productReport(
                start,
                end
            ),

            categoryReport(
                start,
                end
            )
        ]);


    currentSales =
        sales || [];


    const chartTasks = [];


    const salesChart =
        document.getElementById(
            'report-sales-chart'
        );


    if (salesChart) {
        chartTasks.push(
            renderChart(
                salesChart,
                {
                    type:
                        'line',

                    data: {
                        labels:
                            currentSales.map(
                                row =>
                                    row.day
                            ),

                        datasets: [
                            {
                                label:
                                    'Net sales',

                                data:
                                    currentSales.map(
                                        row =>
                                            Number(
                                                row.net_sales
                                                ||
                                                0
                                            )
                                    )
                            }
                        ]
                    },

                    options:
                        baseOptions
                }
            )
        );
    }


    const categoryChart =
        document.getElementById(
            'report-category-chart'
        );


    if (categoryChart) {
        chartTasks.push(
            renderChart(
                categoryChart,
                {
                    type:
                        'bar',

                    data: {
                        labels:
                            (
                                categories || []
                            )
                                .map(
                                    row =>
                                        row.category_name
                                        ||
                                        'Category'
                                ),

                        datasets: [
                            {
                                label:
                                    'Revenue',

                                data:
                                    (
                                        categories || []
                                    )
                                        .map(
                                            row =>
                                                Number(
                                                    row.revenue
                                                    ||
                                                    0
                                                )
                                        )
                            }
                        ]
                    },

                    options:
                        baseOptions
                }
            )
        );
    }


    await Promise.all(
        chartTasks
    );


    renderProducts(
        products || []
    );
}


export async function init() {
    const startInput =
        document.getElementById(
            'report-start'
        );


    const endInput =
        document.getElementById(
            'report-end'
        );


    const runButton =
        document.getElementById(
            'report-run'
        );


    const exportButton =
        document.getElementById(
            'report-export'
        );


    if (
        !startInput ||
        !endInput ||
        !runButton ||
        !exportButton
    ) {
        console.warn(
            'Report page elements were not found.'
        );

        return;
    }


    const end =
        new Date();


    const start =
        new Date(
            end
        );


    start.setDate(
        end.getDate() - 30
    );


    startInput.value =
        dateInputValue(
            start
        );


    endInput.value =
        dateInputValue(
            end
        );


    runButton.onclick =
        async () => {
            if (
                runButton.disabled
            ) {
                return;
            }


            setBusy(
                runButton,
                true,
                'Running…'
            );


            try {
                await runReport();

            } catch (error) {
                console.error(
                    'Report error:',
                    error
                );


                notify(
                    error?.message
                    ||
                    'Unable to run the reports.',
                    'danger'
                );

            } finally {
                setBusy(
                    runButton,
                    false
                );
            }
        };


    exportButton.onclick =
        () => {
            if (!currentSales.length) {
                notify(
                    'There is no sales report data to export.',
                    'warning'
                );

                return;
            }


            downloadText(
                'nbj-sales.csv',
                toCsv(
                    currentSales
                ),
                'text/csv'
            );
        };


    await runReport();
}