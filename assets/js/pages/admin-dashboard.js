import {
    init as opsInit
} from './ops-dashboard.js';

import {
    salesReport,
    productReport
} from '../services/reports.js';

import {
    renderChart,
    baseOptions
} from '../components/charts.js';


function getReportRange() {
    /*
     * End at the start of tomorrow so the
     * current calendar day is fully included.
     */
    const end =
        new Date();


    end.setDate(
        end.getDate()
        +
        1
    );


    end.setHours(
        0,
        0,
        0,
        0
    );


    const start =
        new Date(
            end
        );


    start.setDate(
        start.getDate()
        -
        14
    );


    return {
        start,
        end
    };
}


export async function init() {
    /*
     * Reuse the shared operations dashboard
     * loader first. This populates the KPI,
     * recent order, stock and operational charts.
     */
    await opsInit();


    const salesCanvas =
        document.getElementById(
            'admin-sales-chart'
        );


    const productsCanvas =
        document.getElementById(
            'admin-products-chart'
        );


    if (
        !salesCanvas &&
        !productsCanvas
    ) {
        return;
    }


    const {
        start,
        end
    } =
        getReportRange();


    const [
        sales,
        products
    ] =
        await Promise.all([
            salesReport(
                start.toISOString(),
                end.toISOString()
            ),

            productReport(
                start.toISOString(),
                end.toISOString()
            )
        ]);


    const chartTasks = [];


    if (salesCanvas) {
        chartTasks.push(
            renderChart(
                salesCanvas,
                {
                    type:
                        'line',

                    data: {
                        labels:
                            sales.map(
                                row =>
                                    row.day
                            ),

                        datasets: [
                            {
                                label:
                                    'Net sales',

                                data:
                                    sales.map(
                                        row =>
                                            Number(
                                                row.net_sales
                                                ||
                                                0
                                            )
                                    )
                            },

                            {
                                label:
                                    'Orders',

                                data:
                                    sales.map(
                                        row =>
                                            Number(
                                                row.completed_orders
                                                ||
                                                0
                                            )
                                    ),

                                yAxisID:
                                    'y1'
                            }
                        ]
                    },

                    options: {
                        ...baseOptions,

                        scales: {
                            y: {
                                beginAtZero:
                                    true
                            },

                            y1: {
                                beginAtZero:
                                    true,

                                position:
                                    'right',

                                grid: {
                                    drawOnChartArea:
                                        false
                                }
                            }
                        }
                    }
                }
            )
        );
    }


    if (productsCanvas) {
        const bestSellers =
            products.slice(
                0,
                8
            );


        chartTasks.push(
            renderChart(
                productsCanvas,
                {
                    type:
                        'bar',

                    data: {
                        labels:
                            bestSellers.map(
                                row =>
                                    row.product_name
                                    ||
                                    'Product'
                            ),

                        datasets: [
                            {
                                label:
                                    'Quantity sold',

                                data:
                                    bestSellers.map(
                                        row =>
                                            Number(
                                                row.quantity_sold
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
}