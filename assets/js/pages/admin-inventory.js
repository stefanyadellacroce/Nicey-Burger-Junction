import {
    requireSupabase
} from '../core/supabase.js';

import {
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


let supabase = null;

let rows = [];


async function load() {
    const {
        data,
        error
    } =
        await supabase
            .from(
                'inventory_items'
            )
            .select(
                `
                *,
                ingredient:ingredients(
                    id,
                    name,
                    unit
                ),
                supplier:suppliers!inventory_items_supplier_id_fkey(
                    id,
                    name
                )
                `
            )
            .order(
                'sku'
            );


    if (error) {
        throw error;
    }


    rows =
        data || [];


    render();
}


function getStockState(
    item
) {
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


    if (
        quantity <= 0
    ) {
        return {
            label:
                'OUT OF STOCK',

            className:
                'cancelled'
        };
    }


    if (
        quantity <=
        reorderLevel
    ) {
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
                const haystack =
                    [
                        item.sku,
                        item.ingredient
                            ?.name,
                        item.supplier
                            ?.name
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
                                    '8',

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
            item =>
                createInventoryRow(
                    item
                )
        )
    );
}


function createInventoryRow(
    item
) {
    const state =
        getStockState(
            item
        );


    const actionCell =
        el(
            'td',
            {
                className:
                    'admin-inventory-actions'
            }
        );


    /*
     * Keep the stock status visible without
     * creating an extra table column.
     */
    actionCell.append(
        el(
            'span',
            {
                className:
                    `status-pill ${state.className}`,

                text:
                    state.label
            }
        )
    );


    const editButton =
        el(
            'button',
            {
                className:
                    'btn-nbj ghost sm',

                type:
                    'button',

                text:
                    'Edit'
            }
        );


    editButton.onclick =
        () =>
            openEdit(
                item
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


    actionCell.append(
        editButton,
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
                        `${
                            item.current_quantity
                            ??
                            0
                        } ${
                            item.ingredient
                                ?.unit
                            ||
                            ''
                        }`.trim()
                }
            ),

            el(
                'td',
                {
                    text:
                        String(
                            item.reorder_level
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
                            item.preferred_stock
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
                            item.unit_cost
                            ||
                            0
                        )
                }
            ),

            el(
                'td',
                {
                    text:
                        item.supplier
                            ?.name
                        ||
                        '—'
                }
            ),

            actionCell
        ]
    );
}


function setFormValue(
    form,
    name,
    value
) {
    const control =
        form.elements.namedItem(
            name
        );


    if (!control) {
        return;
    }


    control.value =
        value ?? '';
}


function openEdit(
    item
) {
    const dialog =
        document.getElementById(
            'inventory-edit-dialog'
        );


    const form =
        document.getElementById(
            'inventory-edit-form'
        );


    if (
        !dialog ||
        !form
    ) {
        return;
    }


    form.reset();


    form.dataset.id =
        item.id;


    /*
     * These are the fields that actually exist
     * in the current inventory edit form.
     */
    setFormValue(
        form,
        'reorder_level',
        item.reorder_level
    );


    setFormValue(
        form,
        'preferred_stock',
        item.preferred_stock
    );


    setFormValue(
        form,
        'unit_cost',
        item.unit_cost
    );


    dialog.showModal();
}


function openAdjust(
    item
) {
    const dialog =
        document.getElementById(
            'inventory-adjust-dialog'
        );


    const form =
        document.getElementById(
            'inventory-adjust-form'
        );


    const title =
        document.getElementById(
            'inventory-adjust-title'
        );


    if (
        !dialog ||
        !form
    ) {
        return;
    }


    dialog.dataset.id =
        item.id;


    form.reset();


    if (title) {
        title.textContent =
            `Adjust ${
                item.ingredient
                    ?.name
                ||
                'inventory'
            }`;
    }


    dialog.showModal();
}


async function handleEditSubmit(
    event
) {
    event.preventDefault();


    const form =
        event.currentTarget;


    const submitButton =
        form.querySelector(
            'button[type="submit"]'
        );


    if (
        submitButton
        &&
        submitButton.disabled
    ) {
        return;
    }


    const formData =
        new FormData(
            form
        );


    const payload = {
        reorder_level:
            Number(
                formData.get(
                    'reorder_level'
                )
            ),

        preferred_stock:
            Number(
                formData.get(
                    'preferred_stock'
                )
            ),

        unit_cost:
            Number(
                formData.get(
                    'unit_cost'
                )
            )
    };


    setBusy(
        submitButton,
        true,
        'Saving…'
    );


    try {
        const {
            error
        } =
            await supabase
                .from(
                    'inventory_items'
                )
                .update(
                    payload
                )
                .eq(
                    'id',
                    form.dataset.id
                );


        if (error) {
            throw error;
        }


        document
            .getElementById(
                'inventory-edit-dialog'
            )
            ?.close();


        notify(
            'Inventory settings saved.',
            'success'
        );


        await load();

    } catch (error) {
        console.error(
            'Inventory edit error:',
            error
        );


        notify(
            error?.message
            ||
            'Unable to save inventory settings.',
            'danger'
        );

    } finally {
        setBusy(
            submitButton,
            false
        );
    }
}


async function handleAdjustSubmit(
    event
) {
    event.preventDefault();


    const form =
        event.currentTarget;


    const dialog =
        document.getElementById(
            'inventory-adjust-dialog'
        );


    const submitButton =
        form.querySelector(
            'button[type="submit"]'
        );


    if (
        !dialog
        ||
        (
            submitButton
            &&
            submitButton.disabled
        )
    ) {
        return;
    }


    const formData =
        new FormData(
            form
        );


    /*
     * Current HTML uses name="quantity_delta".
     * The old controller incorrectly read "delta".
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


    setBusy(
        submitButton,
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
            'Stock movement recorded.',
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
            'Unable to record the stock movement.',
            'danger'
        );

    } finally {
        setBusy(
            submitButton,
            false
        );
    }
}


export async function init() {
    const search =
        document.getElementById(
            'inventory-search'
        );


    const editForm =
        document.getElementById(
            'inventory-edit-form'
        );


    const adjustForm =
        document.getElementById(
            'inventory-adjust-form'
        );


    if (
        !search ||
        !editForm ||
        !adjustForm
    ) {
        console.warn(
            'Admin inventory page elements were not found.'
        );

        return;
    }


    supabase =
        await requireSupabase();


    /*
     * Search uses the in-memory inventory
     * collection and does not query the
     * database for every keystroke.
     */
    search.addEventListener(
        'input',
        render
    );


    editForm.addEventListener(
        'submit',
        handleEditSubmit
    );


    adjustForm.addEventListener(
        'submit',
        handleAdjustSubmit
    );


    await load();
}
