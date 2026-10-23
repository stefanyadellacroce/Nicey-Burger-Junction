import {
    requireSupabase
} from '../core/supabase.js';

import {
    el,
    replaceChildren
} from '../core/dom.js';

import {
    money,
    formatDate,
    downloadCsv
} from '../core/utils.js';


let rows = [];


function getFilteredRows() {
    const search =
        document.getElementById(
            'transaction-search'
        );


    const term =
        String(
            search?.value
            ||
            ''
        )
            .trim()
            .toLowerCase();


    if (!term) {
        return rows;
    }


    return rows.filter(
        payment => {
            const text =
                [
                    payment.order
                        ?.order_number,
                    payment.order
                        ?.customer_name,
                    payment.method
                        ?.name,
                    payment.status,
                    payment.reference_number
                ]
                    .filter(Boolean)
                    .join(' ')
                    .toLowerCase();


            return text.includes(
                term
            );
        }
    );
}


function render() {
    const tbody =
        document.getElementById(
            'transactions-tbody'
        );


    if (!tbody) {
        return;
    }


    const filtered =
        getFilteredRows();


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
                                colspan: '7',
                                className:
                                    'text-center muted py-4',
                                text:
                                    'No matching transactions found.'
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
            payment => {
                const status =
                    String(
                        payment.status
                        ||
                        ''
                    );


                return el(
                    'tr',
                    {},
                    [
                        el(
                            'td',
                            {
                                text:
                                    formatDate(
                                        payment.created_at
                                    )
                            }
                        ),

                        el(
                            'td',
                            {
                                text:
                                    payment.order
                                        ?.order_number
                                    ||
                                    '—'
                            }
                        ),

                        el(
                            'td',
                            {
                                text:
                                    payment.order
                                        ?.customer_name
                                    ||
                                    '—'
                            }
                        ),

                        el(
                            'td',
                            {
                                text:
                                    payment.method
                                        ?.name
                                    ||
                                    '—'
                            }
                        ),

                        el(
                            'td',
                            {
                                text:
                                    money(
                                        payment.amount
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
                                        `status-pill ${status.toLowerCase()}`,
                                    text:
                                        status
                                        ||
                                        '—'
                                }
                            )
                        ),

                        el(
                            'td',
                            {
                                text:
                                    payment.reference_number
                                    ||
                                    '—'
                            }
                        )
                    ]
                );
            }
        )
    );
}


export async function init() {
    const search =
        document.getElementById(
            'transaction-search'
        );


    const exportButton =
        document.getElementById(
            'transaction-export'
        );


    if (
        !search ||
        !exportButton
    ) {
        console.warn(
            'Transaction page elements were not found.'
        );

        return;
    }


    const supabase =
        await requireSupabase();


    const {
        data,
        error
    } =
        await supabase
            .from(
                'payments'
            )
            .select(
                `
                id,
                amount,
                status,
                reference_number,
                created_at,
                order:orders(
                    order_number,
                    customer_name
                ),
                method:payment_methods(
                    name
                )
                `
            )
            .order(
                'created_at',
                {
                    ascending:
                        false
                }
            )
            .limit(
                1000
            );


    if (error) {
        throw error;
    }


    rows =
        data || [];


    search.addEventListener(
        'input',
        render
    );


    exportButton.onclick =
        () => {
            downloadCsv(
                'transactions.csv',
                rows.map(
                    payment => ({
                        date:
                            payment.created_at,

                        order:
                            payment.order
                                ?.order_number,

                        customer:
                            payment.order
                                ?.customer_name,

                        method:
                            payment.method
                                ?.name,

                        amount:
                            payment.amount,

                        status:
                            payment.status,

                        reference:
                            payment.reference_number
                    })
                )
            );
        };


    render();
}