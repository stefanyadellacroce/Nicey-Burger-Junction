import {
    listMovements
} from '../services/inventory.js';

import {
    el,
    replaceChildren
} from '../core/dom.js';

import {
    formatDate,
    downloadCsv
} from '../core/utils.js';


let rows = [];


function movementReference(
    movement
) {
    const type =
        movement.reference_type
        ||
        '';


    const id =
        movement.reference_id
        ||
        movement.reference
        ||
        '';


    if (
        type &&
        id
    ) {
        return `${type} · ${id}`;
    }


    return type
        ||
        id
        ||
        '—';
}


function getFilteredRows() {
    const search =
        document.getElementById(
            'movement-search'
        );


    const typeFilter =
        document.getElementById(
            'movement-type'
        );


    const term =
        String(
            search?.value
            ||
            ''
        )
            .trim()
            .toLowerCase();


    const type =
        typeFilter?.value
        ||
        '';


    return rows.filter(
        movement => {
            if (
                type
                &&
                movement.movement_type !==
                type
            ) {
                return false;
            }


            if (!term) {
                return true;
            }


            const haystack =
                [
                    movement.item
                        ?.sku,
                    movement.item
                        ?.ingredient
                        ?.name,
                    movement.movement_type,
                    movementReference(
                        movement
                    ),
                    movement.actor
                        ?.full_name,
                    movement.notes
                ]
                    .filter(Boolean)
                    .join(' ')
                    .toLowerCase();


            return haystack.includes(
                term
            );
        }
    );
}


function render() {
    const tbody =
        document.getElementById(
            'movements-tbody'
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
                                colspan: '8',
                                className:
                                    'text-center muted py-4',
                                text:
                                    'No matching stock movements found.'
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
            movement =>
                el(
                    'tr',
                    {},
                    [
                        el(
                            'td',
                            {
                                text:
                                    formatDate(
                                        movement.created_at
                                    )
                            }
                        ),

                        el(
                            'td',
                            {
                                text:
                                    movement.item
                                        ?.ingredient
                                        ?.name
                                    ||
                                    movement.item
                                        ?.sku
                                    ||
                                    '—'
                            }
                        ),

                        el(
                            'td',
                            {
                                text:
                                    movement.movement_type
                                    ||
                                    '—'
                            }
                        ),

                        el(
                            'td',
                            {
                                text:
                                    String(
                                        movement.quantity_delta
                                        ??
                                        0
                                    )
                            }
                        ),

                        el(
                            'td',
                            {
                                text:
                                    String(
                                        movement.previous_quantity
                                        ??
                                        '—'
                                    )
                            }
                        ),

                        el(
                            'td',
                            {
                                text:
                                    String(
                                        movement.new_quantity
                                        ??
                                        '—'
                                    )
                            }
                        ),

                        el(
                            'td',
                            {
                                text:
                                    movementReference(
                                        movement
                                    )
                            }
                        ),

                        el(
                            'td',
                            {
                                text:
                                    movement.actor
                                        ?.full_name
                                    ||
                                    'System'
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
            'movement-search'
        );


    const type =
        document.getElementById(
            'movement-type'
        );


    const exportButton =
        document.getElementById(
            'movement-export'
        );


    if (
        !search ||
        !type ||
        !exportButton
    ) {
        console.warn(
            'Stock movement page elements were not found.'
        );

        return;
    }


    rows =
        await listMovements(
            1000
        )
        ||
        [];


    search.addEventListener(
        'input',
        render
    );


    type.addEventListener(
        'change',
        render
    );


    exportButton.onclick =
        () => {
            downloadCsv(
                'stock-movements.csv',
                rows.map(
                    movement => ({
                        created_at:
                            movement.created_at,

                        sku:
                            movement.item
                                ?.sku,

                        ingredient:
                            movement.item
                                ?.ingredient
                                ?.name,

                        type:
                            movement.movement_type,

                        quantity_delta:
                            movement.quantity_delta,

                        previous:
                            movement.previous_quantity,

                        new:
                            movement.new_quantity,

                        reference:
                            movementReference(
                                movement
                            ),

                        actor:
                            movement.actor
                                ?.full_name
                            ||
                            'System',

                        notes:
                            movement.notes
                            ||
                            ''
                    })
                )
            );
        };


    render();
}