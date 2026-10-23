import {
    requireSupabase
} from '../core/supabase.js';

import {
    el,
    replaceChildren
} from '../core/dom.js';

import {
    formatDate
} from '../core/utils.js';


let customers = [];


async function loadCustomers(
    supabase
) {
    /*
     * The current Customers page has an Email
     * column. Prefer profiles.email when that
     * column exists.
     */
    const result =
        await supabase
            .from(
                'profiles'
            )
            .select(
                `
                id,
                full_name,
                email,
                phone,
                role,
                active,
                created_at
                `
            )
            .eq(
                'role',
                'CUSTOMER'
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


    if (!result.error) {
        return result.data || [];
    }


    /*
     * Some versions of the schema may not
     * duplicate the Auth email into profiles.
     * Only fall back when the requested email
     * column itself is unavailable.
     */
    const missingEmailColumn =
        result.error.code ===
        '42703'
        ||
        String(
            result.error.message
            ||
            ''
        )
            .toLowerCase()
            .includes(
                'email'
            );


    if (!missingEmailColumn) {
        throw result.error;
    }


    console.warn(
        'profiles.email is unavailable; customer email values will display as unavailable.'
    );


    const fallback =
        await supabase
            .from(
                'profiles'
            )
            .select(
                `
                id,
                full_name,
                phone,
                role,
                active,
                created_at
                `
            )
            .eq(
                'role',
                'CUSTOMER'
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


    if (fallback.error) {
        throw fallback.error;
    }


    return (
        fallback.data || []
    )
        .map(
            customer => ({
                ...customer,

                email:
                    null
            })
        );
}


function render() {
    const search =
        document.getElementById(
            'customer-search'
        );


    const tbody =
        document.getElementById(
            'customers-tbody'
        );


    if (
        !search ||
        !tbody
    ) {
        return;
    }


    const term =
        search.value
            .trim()
            .toLowerCase();


    const filtered =
        customers.filter(
            customer => {
                const haystack =
                    [
                        customer.full_name,
                        customer.email,
                        customer.phone
                    ]
                        .filter(Boolean)
                        .join(' ')
                        .toLowerCase();


                return (
                    !term
                    ||
                    haystack.includes(
                        term
                    )
                );
            }
        );


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
                                    '5',

                                className:
                                    'text-center muted py-4',

                                text:
                                    term
                                        ? 'No matching customers found.'
                                        : 'No customers found.'
                            }
                        )
                    ]
                )
            ]
        );

        return;
    }


    /*
     * Must match current Customers HTML:
     *
     * Name
     * Email
     * Phone
     * Status
     * Joined
     */
    replaceChildren(
        tbody,
        filtered.map(
            customer =>
                el(
                    'tr',
                    {},
                    [
                        el(
                            'td',
                            {
                                text:
                                    customer.full_name
                                    ||
                                    'Unnamed customer'
                            }
                        ),

                        el(
                            'td',
                            {
                                text:
                                    customer.email
                                    ||
                                    '—'
                            }
                        ),

                        el(
                            'td',
                            {
                                text:
                                    customer.phone
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
                                            customer.active
                                                ? 'confirmed'
                                                : 'cancelled'
                                        }`,

                                    text:
                                        customer.active
                                            ? 'Active'
                                            : 'Inactive'
                                }
                            )
                        ),

                        el(
                            'td',
                            {
                                text:
                                    formatDate(
                                        customer.created_at
                                    )
                            }
                        )
                    ]
                )
        )
    );
}


export async function init() {
    const search =
        document.getElementById(
            'customer-search'
        );


    const tbody =
        document.getElementById(
            'customers-tbody'
        );


    if (
        !search ||
        !tbody
    ) {
        console.warn(
            'Customer management page elements were not found.'
        );

        return;
    }


    const supabase =
        await requireSupabase();


    customers =
        await loadCustomers(
            supabase
        );


    /*
     * Search stays local; no new database
     * request for every keystroke.
     */
    search.addEventListener(
        'input',
        render
    );


    render();
}