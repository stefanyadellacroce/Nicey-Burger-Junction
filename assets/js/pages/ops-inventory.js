import {
    listInventory,
    adjustInventory
} from '../services/inventory.js';

import {
    el,
    replaceChildren
} from '../core/dom.js';

import {
    money,
    notify,
    setBusy
} from '../core/utils.js';


let rows = [];


function getStockState(item) {
    const quantity =
        Number(
            item.current_quantity
            ||
            0
        );


    const reorderLevel =
        Number(
            item.reorder_level
            ||
            0
        );


    if (quantity <= 0) {
        return {
            label:
                'OUT OF STOCK',

            className:
                'cancelled'
        };
    }


    if (quantity <= reorderLevel) {
        return {
            label:
                'LOW STOCK',

            className:
                'pending'
        };
    }


    return {
        label:
            'OK',

        className:
            'confirmed'
    };
}


async function load() {
    rows =
        await listInventory()
        ||
        [];


    render();
}


function render() {
    const search =
        document.getElementById(
            'inventory-search'
        );


    const tbody =
        document.getElementById(
            'inventory-tbody'
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
        rows.filter(
            item => {
                const text =
                    [
                        item.sku,
                        item.ingredient?.name
                    ]
                        .filter(Boolean)
                        .join(' ')
                        .toLowerCase();


                return (
                    !term ||
                    text.includes(term)
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
                                colspan: '7',
                                className:
                                    'text-center muted py-4',
                                text:
                                    term
                                        ? 'No matching inventory items found.'
                                        : 'No inventory items found.'
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
            item => {
                const state =
                    getStockState(
                        item
                    );


                const actions =
                    el(
                        'td'
                    );


                const adjustButton =
                    el(
                        'button',
                        {
                            className:
                                'btn-nbj ghost sm',
                            type:
                                'button',
                            text:
                                'Adjust'
                        }
                    );


                adjustButton.onclick =
                    () =>
                        openAdjust(
                            item
                        );


                actions.append(
                    adjustButton
                );


                return el(
                    'tr',
                    {},
                    [
                        el(
                            'td',
                            {
                                text:
                                    item.sku
                                    ||
                                    '—'
                            }
                        ),

                        el(
                            'td',
                            {
                                text:
                                    item.ingredient
                                        ?.name
                                    ||
                                    '—'
                            }
                        ),

                        el(
                            'td',
                            {
                                text:
                                    `${item.current_quantity ?? 0} ${
                                        item.ingredient?.unit || ''
                                    }`.trim()
                            }
                        ),

                        el(
                            'td',
                            {
                                text:
                                    `${item.reorder_level ?? 0} ${
                                        item.ingredient?.unit || ''
                                    }`.trim()
                            }
                        ),

                        el(
                            'td',
                            {
                                text:
                                    money(
                                        item.unit_cost
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
                                        `status-pill ${state.className}`,
                                    text:
                                        state.label
                                }
                            )
                        ),

                        actions
                    ]
                );
            }
        )
    );
}


function openAdjust(item) {
    const dialog =
        document.getElementById(
            'inventory-dialog'
        );


    const form =
        document.getElementById(
            'inventory-adjust-form'
        );


    const title =
        document.getElementById(
            'inventory-dialog-title'
        );


    if (
        !dialog ||
        !form
    ) {
        return;
    }


    form.reset();


    dialog.dataset.id =
        item.id;


    if (title) {
        title.textContent =
            `Adjust ${
                item.ingredient?.name
                ||
                item.sku
                ||
                'inventory'
            }`;
    }


    dialog.showModal();
}


export async function init() {
    const search =
        document.getElementById(
            'inventory-search'
        );


    const form =
        document.getElementById(
            'inventory-adjust-form'
        );


    if (
        !search ||
        !form
    ) {
        console.warn(
            'Operations inventory page elements were not found.'
        );

        return;
    }


    search.addEventListener(
        'input',
        render
    );


    form.addEventListener(
        'submit',
        async event => {
            event.preventDefault();


            const dialog =
                document.getElementById(
                    'inventory-dialog'
                );


            const button =
                form.querySelector(
                    'button[type="submit"]'
                );


            if (
                !dialog ||
                button?.disabled
            ) {
                return;
            }


            const formData =
                new FormData(
                    form
                );


            /*
             * Current form uses:
             * name="quantity_delta"
             */
            const quantityDelta =
                Number(
                    formData.get(
                        'quantity_delta'
                    )
                );


            const movementType =
                String(
                    formData.get(
                        'movement_type'
                    )
                    ||
                    ''
                );


            const notes =
                String(
                    formData.get(
                        'notes'
                    )
                    ||
                    ''
                ).trim();


            if (
                !Number.isFinite(
                    quantityDelta
                )
                ||
                quantityDelta === 0
            ) {
                notify(
                    'Enter a non-zero stock adjustment.',
                    'danger'
                );

                return;
            }


            if (!movementType) {
                notify(
                    'Select a movement type.',
                    'danger'
                );

                return;
            }


            setBusy(
                button,
                true,
                'Recording…'
            );


            try {
                await adjustInventory(
                    dialog.dataset.id,
                    quantityDelta,
                    movementType,
                    notes
                );


                dialog.close();


                notify(
                    'Inventory adjusted and movement recorded.',
                    'success'
                );


                await load();

            } catch (error) {
                console.error(
                    'Inventory adjustment error:',
                    error
                );


                notify(
                    error?.message
                    ||
                    'Unable to adjust inventory.',
                    'danger'
                );

            } finally {
                setBusy(
                    button,
                    false
                );
            }
        }
    );


    await load();
}