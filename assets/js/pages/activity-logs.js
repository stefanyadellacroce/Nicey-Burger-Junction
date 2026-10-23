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


let rows = [];


function render() {
    const searchInput =
        document.getElementById(
            'logs-search'
        );


    const tbody =
        document.getElementById(
            'logs-tbody'
        );


    if (
        !searchInput ||
        !tbody
    ) {
        return;
    }


    const query =
        searchInput.value
            .trim()
            .toLowerCase();


    const filtered =
        query
            ? rows.filter(
                row =>
                    JSON.stringify(row)
                        .toLowerCase()
                        .includes(query)
            )
            : rows;


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
                                colspan: '6',
                                className:
                                    'text-center muted py-4',
                                text:
                                    query
                                        ? 'No matching activity logs found.'
                                        : 'No activity logs found.'
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
            row =>
                el(
                    'tr',
                    {},
                    [
                        el(
                            'td',
                            {
                                text:
                                    formatDate(
                                        row.created_at
                                    )
                            }
                        ),

                        el(
                            'td',
                            {
                                text:
                                    row.actor
                                        ?.full_name
                                    ||
                                    row.actor_id
                                    ||
                                    'System'
                            }
                        ),

                        el(
                            'td',
                            {
                                text:
                                    row.action
                                    ||
                                    '—'
                            }
                        ),

                        el(
                            'td',
                            {
                                text:
                                    row.module
                                    ||
                                    '—'
                            }
                        ),

                        el(
                            'td',
                            {
                                text:
                                    row.record_id
                                    ||
                                    '—'
                            }
                        ),

                        el(
                            'td',
                            {
                                text:
                                    row.description
                                    ||
                                    '—'
                            }
                        )
                    ]
                )
        )
    );
}


export async function init() {
    const searchInput =
        document.getElementById(
            'logs-search'
        );


    const tbody =
        document.getElementById(
            'logs-tbody'
        );


    if (
        !searchInput ||
        !tbody
    ) {
        console.warn(
            'Activity log page elements were not found.'
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
                'activity_logs'
            )
            .select(
                `
                *,
                actor:profiles!activity_logs_actor_id_fkey(
                    full_name
                )
                `
            )
            .order(
                'created_at',
                {
                    ascending: false
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


    /*
     * Search only filters the already-loaded rows.
     * It does not issue another database request
     * for every keystroke.
     */
    searchInput.addEventListener(
        'input',
        render
    );


    render();
}